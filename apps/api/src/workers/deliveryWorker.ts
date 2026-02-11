import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { WebhookDeliveryService } from '../services/webhookDelivery';

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
const prisma = new PrismaClient();
const deliveryService = new WebhookDeliveryService(prisma);

// Worker to process webhook deliveries
const worker = new Worker('webhook-deliveries', async (job) => {
  const { webhookId, eventId, attempt = 1 } = job.data;
  
  console.log(`Processing delivery: webhook=${webhookId}, event=${eventId}, attempt=${attempt}`);
  
  // Get delivery record
  const delivery = await prisma.delivery.findFirst({
    where: { webhookId, eventId },
    include: { webhook: true },
  });

  if (!delivery) {
    throw new Error('Delivery not found');
  }

  if (delivery.status === 'delivered') {
    console.log('Already delivered, skipping');
    return { status: 'already_delivered' };
  }

  // Update attempt count
  await prisma.delivery.update({
    where: { id: delivery.id },
    data: { 
      attemptCount: attempt,
      status: 'pending',
    },
  });

  // Attempt delivery
  const result = await deliveryService.deliver(webhookId, eventId);
  
  if (result.success) {
    console.log(`Delivery successful: ${result.statusCode}`);
    return { status: 'delivered', statusCode: result.statusCode };
  }
  
  // Failed - should we retry?
  const maxRetries = delivery.webhook.maxRetries;
  
  if (attempt >= maxRetries) {
    console.log(`Max retries (${maxRetries}) reached, marking as failed`);
    
    // Move to dead letter queue
    await prisma.delivery.update({
      where: { id: delivery.id },
      data: { 
        status: 'failed',
        errorMessage: result.error || 'Max retries exceeded',
      },
    });
    
    return { status: 'failed', error: result.error };
  }
  
  // Retry
  console.log(`Delivery failed, scheduling retry ${attempt + 1}/${maxRetries}`);
  throw new Error(result.error || 'Delivery failed, will retry');
  
}, {
  connection: redis,
  concurrency: 10,
  limiter: {
    max: 100,
    duration: 1000, // 100 deliveries per second
  },
});

worker.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed:`, result);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

console.log('🚀 Webhook delivery worker started');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down worker...');
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});
