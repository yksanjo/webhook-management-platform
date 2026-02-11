'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: 29,
    description: 'Perfect for small projects',
    features: ['100K deliveries', '10 endpoints', '7-day retention'],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Pro',
    price: 79,
    description: 'For growing SaaS',
    features: ['1M deliveries', '100 endpoints', '30-day retention', 'Priority support'],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Business',
    price: 199,
    description: 'For large orgs',
    features: ['10M deliveries', 'Unlimited', '90-day retention', 'Slack support'],
    cta: 'Contact Sales',
    popular: false,
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (plan: string) => {
    setLoading(plan);
    setTimeout(() => setLoading(null), 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple Pricing</h1>
          <p className="text-xl text-gray-600">Pay for what you use</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div key={plan.name} className={`bg-white rounded-2xl shadow-lg border-2 ${plan.popular ? 'border-blue-500' : 'border-transparent'}`}>
              {plan.popular && <div className="bg-blue-500 text-white text-center py-2 text-sm font-medium">Most Popular</div>}
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-gray-500 mt-2">{plan.description}</p>
                <div className="mt-6 flex items-baseline">
                  <span className="text-5xl font-bold text-gray-900">${plan.price}</span>
                  <span className="text-gray-500 ml-2">/month</span>
                </div>
                <ul className="mt-8 space-y-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center">
                      <Check className="w-5 h-5 text-green-500 mr-3" />
                      <span className="text-gray-600">{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSubscribe(plan.name.toLowerCase())}
                  disabled={!!loading}
                  className={`mt-8 w-full py-3 px-4 rounded-lg font-medium ${plan.popular ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'} disabled:opacity-50`}
                >
                  {loading === plan.name.toLowerCase() ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : plan.cta}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
