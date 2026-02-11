# 🎣 WebhookPro

> **Reliable webhook infrastructure for SaaS teams**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)

The stress-free way to send webhooks. Retries, monitoring, and delivery guarantees included.

## 😤 The Problem

Building reliable webhook delivery is hard:
- Customer endpoints go down
- Retries with exponential backoff
- Signature verification
- Dead letter queues
- Customer-facing delivery logs
- Monitoring and alerting

**You should focus on your product, not webhook infrastructure.**

## ✨ Features

- **🔄 Automatic Retries** - Exponential backoff, circuit breakers
- **🔐 Security** - HMAC signature verification
- **📊 Monitoring** - Real-time delivery dashboard
- **📝 Logs** - Customer-facing delivery history
- **⚡ Rate Limiting** - Protect your infrastructure
- **🎯 Filtering** - Event type filtering
- **🔌 Easy Integration** - Drop-in SDK

## 💰 Pricing

| Plan | Price | Includes |
|------|-------|----------|
| **Self-Hosted** | Free | Unlimited webhooks |
| **Starter** | $29/mo | 100K deliveries, 10 endpoints |
| **Pro** | $79/mo | 1M deliveries, 100 endpoints |
| **Business** | $199/mo | 10M deliveries, unlimited |

Compare to:
- Hookdeck: $49/mo (10K events)
- Svix: $0.001 per message
- **WebhookPro: $29/mo flat rate**

## 🚀 Quick Start

### Cloud

```bash
npm install @webhookpro/sdk
```

```javascript
import { WebhookPro } from '@webhookpro/sdk';

const webhook = new WebhookPro({
  apiKey: 'your-api-key'
});

// Send a webhook
await webhook.send({
  endpoint: 'https://customer.com/webhook',
  event: 'user.created',
  data: { userId: '123', email: 'user@example.com' }
});
```

### Self-Hosted

```bash
git clone https://github.com/yourusername/webhook-management-platform.git
cd webhook-management-platform
docker-compose up -d
```

## 🎯 Example: User Signup Webhook

```javascript
import { WebhookPro } from '@webhookpro/sdk';

const webhook = new WebhookPro({ apiKey: '...' });

app.post('/signup', async (req, res) => {
  // Create user...
  const user = await createUser(req.body);
  
  // Notify all subscribed webhooks
  await webhook.send({
    event: 'user.created',
    data: {
      userId: user.id,
      email: user.email,
      createdAt: user.createdAt
    }
  });
  
  res.json({ success: true });
});
```

## 🔐 Signature Verification

```javascript
// Customer receiving webhooks
import { verifyWebhook } from '@webhookpro/sdk';

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const secret = process.env.WEBHOOK_SECRET;
  
  const isValid = verifyWebhook({
    payload: req.body,
    signature,
    secret
  });
  
  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook...
});
```

## 📊 Dashboard Features

```
┌─────────────────────────────────────────────────────────────┐
│  WebhookPro Dashboard                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📈 Deliveries (24h)          📊 Success Rate               │
│  ┌─────────┐                  ┌─────────┐                   │
│  │  15,234 │                  │  99.7%  │                   │
│  │  +12%   │                  │  +0.2%  │                   │
│  └─────────┘                  └─────────┘                   │
│                                                             │
│  🚨 Failed Deliveries (Retrying)                            │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ customer-a.com  │ user.updated │ Retry #3 │ 5m ago   │ │
│  │ api.partner.io  │ order.paid   │ Retry #2 │ 12m ago  │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  📋 Recent Deliveries                                       │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Endpoint          │ Event        │ Status │ Time     │ │
│  │ acme.com/webhook  │ user.created │ ✅ 200 │ 2s ago   │ │
│  │ api.startup.io    │ order.paid   │ ✅ 200 │ 5s ago   │ │
│  │ hooks.biz/web     │ invoice.paid │ ⏳ 429 │ 10s ago  │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## ⚙️ Configuration

```javascript
const webhook = new WebhookPro({
  apiKey: 'your-api-key',
  
  // Retry configuration
  retries: {
    maxAttempts: 5,
    backoff: 'exponential', // or 'linear', 'fixed'
    initialDelay: 1000,     // 1 second
    maxDelay: 30000         // 30 seconds
  },
  
  // Timeout
  timeout: 30000, // 30 seconds
  
  // Rate limiting
  rateLimit: {
    maxRequests: 100,
    windowMs: 60000 // 1 minute
  },
  
  // Custom headers
  headers: {
    'X-Source': 'myapp'
  }
});
```

## 🎯 Event Filtering

```javascript
// Subscribe to specific events
await webhook.subscribe({
  endpoint: 'https://customer.com/webhook',
  events: ['user.created', 'user.updated'],
  filter: {
    'data.plan': 'pro' // Only pro users
  }
});
```

## 🔄 Retry Strategies

```javascript
// Exponential backoff (default)
await webhook.send({
  endpoint: 'https://api.example.com/webhook',
  event: 'order.paid',
  data: { orderId: '123' },
  retry: {
    strategy: 'exponential',
    maxAttempts: 5,
    delay: 1000 // 1s, 2s, 4s, 8s, 16s
  }
});

// Custom retry schedule
await webhook.send({
  endpoint: 'https://api.example.com/webhook',
  event: 'order.paid',
  data: { orderId: '123' },
  retry: {
    schedule: [1000, 5000, 15000, 60000] // 1s, 5s, 15s, 60s
  }
});
```

## 📱 Customer Portal

Let your customers manage their webhooks:

```javascript
// Generate customer portal URL
const portalUrl = await webhook.createPortalSession({
  customerId: 'customer-123',
  returnUrl: 'https://yourapp.com/settings'
});

// Redirect customer to portal
res.redirect(portalUrl);
```

Portal includes:
- Add/edit webhook endpoints
- View delivery history
- Retry failed deliveries
- Test webhooks
- View event schema

## 📊 Analytics

```javascript
// Get delivery stats
const stats = await webhook.getStats({
  from: '2024-01-01',
  to: '2024-01-31'
});

// Results:
// {
//   totalDeliveries: 150234,
//   successful: 149891,
//   failed: 343,
//   successRate: 99.77,
//   averageLatency: 245 // ms
// }
```

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Your App  │────▶│  WebhookPro  │────▶│   Redis     │
│             │     │     API      │     │   Queue     │
└─────────────┘     └──────────────┘     └─────────────┘
                                                  │
                         ┌────────────────────────┘
                         ▼
              ┌─────────────────────┐
              │   BullMQ Workers    │
              │                     │
              │  • Retry logic      │
              │  • Circuit breaker  │
              │  • Dead letter      │
              └─────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌─────────┐    ┌─────────┐    ┌──────────┐
    │Customer │    │Customer │    │Customer  │
    │EndpointA│    │EndpointB│    │EndpointC │
    └─────────┘    └─────────┘    └──────────┘
```

## 🛠️ Tech Stack

- **API:** Fastify, TypeScript
- **Queue:** BullMQ + Redis
- **Database:** PostgreSQL
- **Dashboard:** Next.js, Tailwind
- **SDKs:** TypeScript, Python, Go, Ruby

## 📁 Project Structure

```
webhook-management-platform/
├── apps/
│   ├── api/                    # Main API server
│   ├── dashboard/              # Admin dashboard
│   └── portal/                 # Customer portal
├── packages/
│   ├── sdk-node/               # Node.js SDK
│   ├── sdk-python/             # Python SDK
│   ├── sdk-go/                 # Go SDK
│   └── shared/                 # Shared types
├── worker/                     # BullMQ workers
├── docs/
└── infra/
    └── docker-compose.yml
```

## 🚀 Deployment

### Railway
```bash
railway init
railway up
```

### Docker
```bash
docker-compose up -d
```

### Environment Variables
```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
API_KEY=your-secret-key
WEBHOOK_SECRET=signing-secret
```

## 📚 Use Cases

### E-commerce Platform
```javascript
// Notify partners about orders
await webhook.send({
  event: 'order.paid',
  data: {
    orderId: '123',
    amount: 99.99,
    customer: { id: 'cust-456', email: '...' }
  }
});
```

### SaaS Platform
```javascript
// Customer webhooks for integrations
await webhook.send({
  event: 'user.invited',
  data: {
    userId: '789',
    email: 'newuser@company.com',
    invitedBy: 'admin@company.com'
  }
});
```

### Payment Provider
```javascript
// Real-time payment notifications
await webhook.send({
  event: 'payment.succeeded',
  data: {
    paymentId: 'pay_123',
    amount: 50.00,
    currency: 'USD'
  }
});
```

## 🔒 Security

- ✅ HMAC-SHA256 signature verification
- ✅ IP allowlisting
- ✅ TLS 1.3 required
- ✅ Secret rotation
- ✅ Request payload validation
- ✅ Rate limiting per endpoint

## 📈 Performance

| Metric | Value |
|--------|-------|
| Delivery latency | < 100ms p99 |
| Throughput | 10K+ events/sec |
| Retry success rate | 95%+ |
| Uptime SLA | 99.9% |

## 🤝 Comparison

| Feature | WebhookPro | Hookdeck | Svix | DIY |
|---------|------------|----------|------|-----|
| Self-hosted | ✅ | ❌ | ✅ | ✅ |
| Flat pricing | ✅ | ❌ | ❌ | ✅ |
| Customer portal | ✅ | ✅ | ✅ | ❌ |
| Open source | ✅ | ❌ | ✅ | ✅ |
| Easy setup | ✅ | ✅ | ✅ | ❌ |

## 📄 License

MIT License - see [LICENSE](LICENSE)

## 🌟 Why WebhookPro?

Because webhooks shouldn't keep you up at night.

- **Reliable** - 99.9% delivery guarantee
- **Transparent** - Open source, flat pricing
- **Developer-friendly** - Great DX, excellent docs
- **Scalable** - Handles millions of events

---

[Documentation](https://webhookpro.io) • [API Reference](https://docs.webhookpro.io) • [Discord](https://discord.gg/webhookpro)
