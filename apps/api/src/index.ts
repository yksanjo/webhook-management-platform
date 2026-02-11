import fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { webhookRoutes } from './routes/webhooks';
import { eventRoutes } from './routes/events';
import { deliveryRoutes } from './routes/deliveries';
import { DashboardStatsService } from './services/stats';

const app = fastify({ logger: true });
export const prisma = new PrismaClient();

// Redis connection
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

// Webhook delivery queue
export const webhookQueue = new Queue('webhook-deliveries', {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

// Decorate
app.decorate('prisma', prisma);
app.decorate('webhookQueue', webhookQueue);

// Plugins
app.register(cors, { origin: true });

// Routes
app.register(webhookRoutes, { prefix: '/webhooks' });
app.register(eventRoutes, { prefix: '/events' });
app.register(deliveryRoutes, { prefix: '/deliveries' });

// Stats endpoint
app.get('/stats', async (request) => {
  const apiKey = request.headers['x-api-key'] as string;
  if (!apiKey) return { error: 'API key required' };
  
  const org = await prisma.organization.findUnique({ where: { apiKey } });
  if (!org) return { error: 'Invalid API key' };
  
  const statsService = new DashboardStatsService(prisma);
  return statsService.getDashboardStats(org.id);
});

// Health check
app.get('/health', async () => ({ 
  status: 'ok', 
  timestamp: new Date().toISOString(),
  queue: 'connected'
}));

// Start
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3002');
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 WebhookPro API running on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
