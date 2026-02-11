'use client';

import { useEffect, useState } from 'react';
import { 
  Webhook, 
  Activity, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Send,
  Plus,
  Clock,
  Globe,
  AlertCircle
} from 'lucide-react';

interface Stats {
  webhooks: { total: number; enabled: number };
  deliveries24h: { total: number; delivered: number; failed: number; successRate: string };
  recentFailures: Array<{
    id: string;
    webhook: { url: string };
    event: { eventType: string };
    errorMessage: string;
    createdAt: string;
  }>;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats', {
        headers: { 'X-API-Key': 'test-api-key' }
      });
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Webhook className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">WebhookPro</h1>
            </div>
            <nav className="flex space-x-6">
              <a href="#" className="text-blue-600 font-medium">Dashboard</a>
              <a href="#" className="text-gray-500 hover:text-gray-700">Webhooks</a>
              <a href="#" className="text-gray-500 hover:text-gray-700">Events</a>
              <a href="#" className="text-gray-500 hover:text-gray-700">Settings</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Send className="w-8 h-8 text-blue-600" />}
            label="Deliveries (24h)"
            value={stats?.deliveries24h.total || 0}
            change="+12%"
          />
          <StatCard
            icon={<CheckCircle className="w-8 h-8 text-green-600" />}
            label="Success Rate"
            value={stats?.deliveries24h.successRate || '100%'}
            subtext="Last 24 hours"
          />
          <StatCard
            icon={<XCircle className="w-8 h-8 text-red-600" />}
            label="Failed"
            value={stats?.deliveries24h.failed || 0}
            change="-5%"
            negative
          />
          <StatCard
            icon={<Globe className="w-8 h-8 text-purple-600" />}
            label="Active Webhooks"
            value={stats?.webhooks.enabled || 0}
            subtext={`of ${stats?.webhooks.total || 0} total`}
          />
        </div>

        {/* Failed Deliveries */}
        {stats?.recentFailures && stats.recentFailures.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-red-200 mb-8">
            <div className="p-6 border-b border-red-100 bg-red-50">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <h2 className="text-lg font-semibold text-red-900">
                  Recent Failures ({stats.recentFailures.length})
                </h2>
              </div>
            </div>
            <div className="divide-y">
              {stats.recentFailures.map((failure) => (
                <div key={failure.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">{failure.webhook.url}</p>
                    <p className="text-sm text-gray-500">{failure.event.eventType} • {failure.errorMessage}</p>
                  </div>
                  <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-700">
                    <RefreshCw className="w-4 h-4" />
                    <span>Retry</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                <div className="flex items-center">
                  <Plus className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="font-medium text-blue-900">Create Webhook</span>
                </div>
                <span className="text-blue-600">→</span>
              </button>
              <button className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                <div className="flex items-center">
                  <Send className="w-5 h-5 text-gray-600 mr-3" />
                  <span className="font-medium text-gray-900">Send Test Event</span>
                </div>
                <span className="text-gray-400">→</span>
              </button>
              <button className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                <div className="flex items-center">
                  <Activity className="w-5 h-5 text-gray-600 mr-3" />
                  <span className="font-medium text-gray-900">View Logs</span>
                </div>
                <span className="text-gray-400">→</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">System Status</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-gray-700">API Server</span>
                </div>
                <span className="text-green-600 text-sm font-medium">Operational</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-gray-700">Queue Workers</span>
                </div>
                <span className="text-green-600 text-sm font-medium">Operational</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-gray-700">Database</span>
                </div>
                <span className="text-green-600 text-sm font-medium">Operational</span>
              </div>
              <div className="pt-4 border-t">
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>Last updated: Just now</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ 
  icon, 
  label, 
  value, 
  change, 
  subtext, 
  negative 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number;
  change?: string;
  subtext?: string;
  negative?: boolean;
}) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        {icon}
        {change && (
          <span className={`text-sm font-medium ${negative ? 'text-red-600' : 'text-green-600'}`}>
            {change}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {subtext && <p className="text-sm text-gray-400 mt-1">{subtext}</p>}
    </div>
  );
}
