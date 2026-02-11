import { PrismaClient } from '@prisma/client';

export class DashboardStatsService {
  constructor(private prisma: PrismaClient) {}

  async getDashboardStats(organizationId: string) {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Webhook count
    const webhookCount = await this.prisma.webhook.count({
      where: { organizationId },
    });

    const enabledWebhooks = await this.prisma.webhook.count({
      where: { organizationId, enabled: true },
    });

    // 24h stats
    const deliveries24h = await this.prisma.delivery.groupBy({
      by: ['status'],
      where: {
        organizationId,
        createdAt: { gte: since24h },
      },
      _count: { id: true },
    });

    const total24h = deliveries24h.reduce((sum, d) => sum + d._count.id, 0);
    const delivered24h = deliveries24h.find(d => d.status === 'delivered')?._count.id || 0;
    const failed24h = deliveries24h.find(d => d.status === 'failed')?._count.id || 0;

    // Success rate
    const successRate = total24h > 0 ? ((delivered24h / total24h) * 100).toFixed(2) : '100';

    // Recent failed deliveries
    const recentFailures = await this.prisma.delivery.findMany({
      where: {
        organizationId,
        status: 'failed',
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        webhook: {
          select: { url: true },
        },
        event: {
          select: { eventType: true },
        },
      },
    });

    // Top webhooks by volume
    const topWebhooks = await this.prisma.delivery.groupBy({
      by: ['webhookId'],
      where: {
        organizationId,
        createdAt: { gte: since7d },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const topWebhooksWithDetails = await Promise.all(
      topWebhooks.map(async (w) => {
        const webhook = await this.prisma.webhook.findUnique({
          where: { id: w.webhookId },
          select: { url: true, description: true },
        });
        return {
          ...w,
          webhook,
        };
      })
    );

    return {
      webhooks: {
        total: webhookCount,
        enabled: enabledWebhooks,
      },
      deliveries24h: {
        total: total24h,
        delivered: delivered24h,
        failed: failed24h,
        successRate: `${successRate}%`,
      },
      recentFailures,
      topWebhooks: topWebhooksWithDetails,
    };
  }
}
