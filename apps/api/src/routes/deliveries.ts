import { FastifyInstance } from 'fastify';

export async function deliveryRoutes(app: FastifyInstance) {
  // List deliveries
  app.get('/', async (request, reply) => {
    const apiKey = request.headers['x-api-key'] as string;
    if (!apiKey) return reply.status(401).send({ error: 'API key required' });

    const org = await app.prisma.organization.findUnique({
      where: { apiKey },
    });
    if (!org) return reply.status(401).send({ error: 'Invalid API key' });

    const { 
      status, 
      webhookId, 
      limit = '50',
      offset = '0'
    } = request.query as { 
      status?: string; 
      webhookId?: string;
      limit?: string;
      offset?: string;
    };

    const deliveries = await app.prisma.delivery.findMany({
      where: {
        organizationId: org.id,
        ...(status && { status }),
        ...(webhookId && { webhookId }),
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        webhook: {
          select: { url: true, description: true },
        },
        event: {
          select: { eventType: true, createdAt: true },
        },
      },
    });

    return deliveries;
  });

  // Get delivery details
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const apiKey = request.headers['x-api-key'] as string;
    
    const org = await app.prisma.organization.findUnique({
      where: { apiKey },
    });
    if (!org) return reply.status(401).send({ error: 'Invalid API key' });

    const delivery = await app.prisma.delivery.findFirst({
      where: { id, organizationId: org.id },
      include: {
        webhook: true,
        event: true,
      },
    });

    if (!delivery) return reply.status(404).send({ error: 'Delivery not found' });

    return delivery;
  });

  // Retry failed delivery
  app.post('/:id/retry', async (request, reply) => {
    const { id } = request.params as { id: string };
    const apiKey = request.headers['x-api-key'] as string;
    
    const org = await app.prisma.organization.findUnique({
      where: { apiKey },
    });
    if (!org) return reply.status(401).send({ error: 'Invalid API key' });

    const delivery = await app.prisma.delivery.findFirst({
      where: { id, organizationId: org.id },
    });

    if (!delivery) return reply.status(404).send({ error: 'Delivery not found' });

    // Reset status and queue
    await app.prisma.delivery.update({
      where: { id },
      data: {
        status: 'pending',
        attemptCount: 0,
        errorMessage: null,
      },
    });

    await app.webhookQueue.add('deliver', {
      webhookId: delivery.webhookId,
      eventId: delivery.eventId,
    }, {
      jobId: delivery.id,
    });

    return { success: true, message: 'Delivery queued for retry' };
  });

  // Get delivery stats
  app.get('/stats/summary', async (request, reply) => {
    const apiKey = request.headers['x-api-key'] as string;
    if (!apiKey) return reply.status(401).send({ error: 'API key required' });

    const org = await app.prisma.organization.findUnique({
      where: { apiKey },
    });
    if (!org) return reply.status(401).send({ error: 'Invalid API key' });

    const { days = '7' } = request.query as { days?: string };
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    const stats = await app.prisma.delivery.groupBy({
      by: ['status'],
      where: {
        organizationId: org.id,
        createdAt: { gte: since },
      },
      _count: { id: true },
    });

    const total = stats.reduce((sum, s) => sum + s._count.id, 0);

    return {
      total,
      breakdown: stats.map(s => ({
        status: s.status,
        count: s._count.id,
        percentage: total > 0 ? ((s._count.id / total) * 100).toFixed(2) : '0',
      })),
    };
  });
}
