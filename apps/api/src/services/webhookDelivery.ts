import axios, { AxiosError } from 'axios';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

export class WebhookDeliveryService {
  constructor(private prisma: PrismaClient) {}

  async deliver(webhookId: string, eventId: string): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!webhook || !event) {
      return { success: false, error: 'Webhook or event not found' };
    }

    if (!webhook.enabled) {
      return { success: false, error: 'Webhook is disabled' };
    }

    // Prepare payload
    const payload = {
      id: event.id,
      event: event.eventType,
      timestamp: event.createdAt.toISOString(),
      data: event.payload,
    };

    const body = JSON.stringify(payload);
    const signature = this.signPayload(body, webhook.secret);

    try {
      const response = await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-ID': event.id,
          'X-Event-Type': event.eventType,
          'User-Agent': 'WebhookPro/1.0',
        },
        timeout: 30000, // 30 second timeout
        maxRedirects: 5,
      });

      // Mark as delivered
      await this.prisma.delivery.updateMany({
        where: { webhookId, eventId },
        data: {
          status: 'delivered',
          deliveredAt: new Date(),
          responseStatus: response.status,
          responseBody: JSON.stringify(response.data).slice(0, 10000), // Limit size
        },
      });

      // Update webhook stats
      await this.prisma.webhook.update({
        where: { id: webhookId },
        data: {
          lastDeliveredAt: new Date(),
          failureCount: 0,
        },
      });

      return { success: true, statusCode: response.status };
    } catch (error) {
      const axiosError = error as AxiosError;
      const statusCode = axiosError.response?.status;
      const errorMessage = axiosError.message;

      // Mark as failed
      await this.prisma.delivery.updateMany({
        where: { webhookId, eventId },
        data: {
          status: 'failed',
          failedAt: new Date(),
          responseStatus: statusCode,
          responseBody: JSON.stringify(axiosError.response?.data).slice(0, 10000),
          errorMessage: errorMessage.slice(0, 1000),
        },
      });

      // Update webhook failure count
      await this.prisma.webhook.update({
        where: { id: webhookId },
        data: {
          lastFailedAt: new Date(),
          failureCount: { increment: 1 },
        },
      });

      return { success: false, statusCode, error: errorMessage };
    }
  }

  private signPayload(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  async verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
    const expected = this.signPayload(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  }
}
