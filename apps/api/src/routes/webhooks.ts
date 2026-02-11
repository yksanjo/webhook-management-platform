import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';

const createWebhookSchema = z.object({
  url: z.string().url(),
  description: z.string().optional(),
  eventTypes: z.array(z.string()).min(1),
  maxRetries: z.number().min(1).max(10).default(5),
  retryDelay: z.number().min(100).max(60000).default(1000),
});

const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  description: z.string().optional(),
  eventTypes: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
  maxRetries: z.number().min(1).max(10).optional(),
});

export async function webhookRoutes(app: FastifyInstance) {
  // Create webhook endpoint
  app.post('/', async (request, reply) => {
    const apiKey = request.headers['x-api-key'] as string;
    if (!apiKey) return reply.status(401).send({ error: 'API key required' });

    const org = await app.prisma.organization.findUnique({
      where: { apiKey },
    });
    if (!org) return reply.status(401).send({ error: 'Invalid API key' });

    const data = createWebhookSchema.parse(request.body);

    // Generate secret for signing
    const secret = `whsec_${crypto.randomBytes(32).toString('hex')}`;

    const webhook = await app.prisma.webhook.create({
      data: {
        organizationId: org.id,
        url: data.url,
        description: data.description,
        eventTypes: data.eventTypes,
        secret,
        maxRetries: data.maxRetries,
        retryDelay: data.retryDelay,
      },
    });

    return webhook;
  });

  // List webhooks
  app.get('/', async (request, reply) => {
    const apiKey = request.headers['x-api-key'] as string;
    if (!apiKey) return reply.status(401).send({ error: 'API key required' });

    const org = await app.prisma.organization.findUnique({
      where: { apiKey },
    });
    if (!org) return reply.status(401).send({ error: 'Invalid API key' });

    const webhooks = await app.prisma.webhook.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: 'desc' },
    });

    return webhooks;
  });

  // Get webhook
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const apiKey = request.headers['x-api-key'] as string;
    
    const org = await app.prisma.organization.findUnique({
      where: { apiKey },
    });
    if (!org) return reply.status(401).send({ error: 'Invalid API key' });

    const webhook = await app.prisma.webhook.findFirst({
      where: { id, organizationId: org.id },
    });

    if (!webhook) return reply.status(404).send({ error: 'Webhook not found' });

    return webhook;
  });

  // Update webhook
  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const apiKey = request.headers['x-api-key'] as string;
    
    const org = await app.prisma.organization.findUnique({
      where: { apiKey },
    });
    if (!org) return reply.status(401).send({ error: 'Invalid API key' });

    const data = updateWebhookSchema.parse(request.body);

    const webhook = await app.prisma.webhook.updateMany({
      where: { id, organizationId: org.id },
      data,
    });

    if (webhook.count === 0) {
      return reply.status(404).send({ error: 'Webhook not found' });
    }

    return await app.prisma.webhook.findUnique({ where: { id } });
  });

  // Delete webhook
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const apiKey = request.headers['x-api-key'] as string;
    
    const org = await app.prisma.organization.findUnique({
      where: { apiKey },
    });
    if (!org) return reply.status(401).send({ error: 'Invalid API key' });

    await app.prisma.webhook.deleteMany({
      where: { id, organizationId: org.id },
    });

    return { success: true };
  });

  // Test webhook
  app.post('/:id/test', async (request, reply) => {
    const { id } = request.params as { id: string };
    const apiKey = request.headers['x-api-key'] as string;
    
    const org = await app.prisma.organization.findUnique({
      where: { apiKey },
    });
    if (!org) return reply.status(401).send({ error: 'Invalid API key' });

    const webhook = await app.prisma.webhook.findFirst({
      where: { id, organizationId: org.id },
    });

    if (!webhook) return reply.status(404).send({ error: 'Webhook not found' });

    // Create test event
    const event = await app.prisma.event.create({
      data: {
        organizationId: org.id,
        eventType: 'webhook.test',
        payload: { test: true, timestamp: new Date().toISOString() },
      },
    });

    // Create delivery
    const delivery = await app.prisma.delivery.create({
      data: {
        organizationId: org.id,
        eventId: event.id,
        webhookId: webhook.id,
        status: 'pending',
      },
    });

    // Queue for delivery
    await app.webhookQueue.add('deliver', {
      webhookId: webhook.id,
      eventId: event.id,
    }, {
      jobId: delivery.id,
    });

    return { success: true, message: 'Test webhook sent', deliveryId: delivery.id };
  });
}
