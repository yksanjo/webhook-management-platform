import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const sendEventSchema = z.object({
  event: z.string(),
  data: z.record(z.any()),
});

export async function eventRoutes(app: FastifyInstance) {
  // Send event (trigger webhooks)
  app.post('/send', async (request, reply) => {
    const apiKey = request.headers['x-api-key'] as string;
    if (!apiKey) return reply.status(401).send({ error: 'API key required' });

    const org = await app.prisma.organization.findUnique({
      where: { apiKey },
    });
    if (!org) return reply.status(401).send({ error: 'Invalid API key' });

    const data = sendEventSchema.parse(request.body);

    // Create event record
    const event = await app.prisma.event.create({
      data: {
        organizationId: org.id,
        eventType: data.event,
        payload: data.data,
      },
    });

    // Find matching webhooks
    const webhooks = await app.prisma.webhook.findMany({
      where: {
        organizationId: org.id,
        enabled: true,
        eventTypes: {
          has: data.event,
        },
      },
    });

    // Create deliveries and queue them
    const deliveries = await Promise.all(
      webhooks.map(async (webhook) => {
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
          delay: 0,
        });

        return delivery;
      })
    );

    // Update event with target count
    await app.prisma.event.update({
      where: { id: event.id },
      data: { targetCount: webhooks.length },
    });

    return {
      success: true,
      eventId: event.id,
      webhooksTriggered: webhooks.length,
      deliveries: deliveries.map(d => d.id),
    };
  });

  // List events
  app.get('/', async (request, reply) => {
    const apiKey = request.headers['x-api-key'] as string;
    if (!apiKey) return reply.status(401).send({ error: 'API key required' });

    const org = await app.prisma.organization.findUnique({
      where: { apiKey },
    });
    if (!org) return reply.status(401).send({ error: 'Invalid API key' });

    const { limit = '50', event } = request.query as { limit?: string; event?: string };

    const events = await app.prisma.event.findMany({
      where: {
        organizationId: org.id,
        ...(event && { eventType: event }),
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      include: {
        _count: {
          select: { deliveries: true },
        },
      },
    });

    return events;
  });

  // Get event details
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const apiKey = request.headers['x-api-key'] as string;
    
    const org = await app.prisma.organization.findUnique({
      where: { apiKey },
    });
    if (!org) return reply.status(401).send({ error: 'Invalid API key' });

    const event = await app.prisma.event.findFirst({
      where: { id, organizationId: org.id },
      include: {
        deliveries: {
          include: { webhook: true },
        },
      },
    });

    if (!event) return reply.status(404).send({ error: 'Event not found' });

    return event;
  });
}
