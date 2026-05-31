'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface EvolutionInstance {
  id: string;
  instanceName: string;
  status: string;
  liveStatus?: string;
  qrCode?: string | null;
  messagesPerMinute: number;
  delayBetweenMs: number;
  maxBurst: number;
  createdAt: string;
  updatedAt: string;
}

export default function EvolutionDashboard() {
  const { data: session } = useSession();
  const [instances, setInstances] = useState<EvolutionInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [creatingInstance, setCreatingInstance] = useState(false);
  const [qrCodeInstance, setQrCodeInstance] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [qrCodeLoading, setQrCodeLoading] = useState(false);

  const fetchInstances = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/evolution/instances');
      if (!res.ok) throw new Error('Failed to fetch instances');
      const data = await res.json();
      setInstances(data.instances || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstances();
    const interval = setInterval(fetchInstances, 30000);
    return () => clearInterval(interval);
  }, [fetchInstances]);

  const handleCreateInstance = async () => {
    if (!newInstanceName.trim()) return;
    setCreatingInstance(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/evolution/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName: newInstanceName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create instance');
      }

      const data = await res.json();
      setNewInstanceName('');
      await fetchInstances();

      if (data.qrCode) {
        setQrCodeInstance(data.instanceName);
        setQrCodeData(data.qrCode);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreatingInstance(false);
    }
  };

  const handleGetQrCode = async (instanceName: string) => {
    setQrCodeLoading(true);
    setQrCodeInstance(instanceName);
    setQrCodeData(null);

    try {
      const res = await fetch(`/api/admin/evolution/instances/${encodeURIComponent(instanceName)}/qr`);
      if (!res.ok) throw new Error('Failed to get QR code');
      const data = await res.json();

      if (data.status === 'connected') {
        setQrCodeData(null);
        setError('Instance is already connected!');
      } else if (data.qrCode) {
        setQrCodeData(data.qrCode);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setQrCodeLoading(false);
    }
  };

  const handleDisconnect = async (instanceName: string) => {
    if (!confirm(`Disconnect instance "${instanceName}"? You will need to scan the QR code again.`)) return;

    try {
      const res = await fetch(`/api/admin/evolution/instances/${encodeURIComponent(instanceName)}/disconnect`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to disconnect');
      await fetchInstances();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (instanceName: string) => {
    if (!confirm(`Delete instance "${instanceName}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/admin/evolution/instances/${encodeURIComponent(instanceName)}/disconnect`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete instance');
      await fetchInstances();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusBadge = (status: string, liveStatus?: string) => {
    const effectiveStatus = liveStatus || status;
    switch (effectiveStatus) {
      case 'connected':
      case 'open':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <span className="w-2 h-2 mr-1.5 rounded-full bg-green-400 animate-pulse"></span>
            Connected
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <span className="w-2 h-2 mr-1.5 rounded-full bg-yellow-400 animate-pulse"></span>
            Connecting
          </span>
        );
      case 'disconnected':
      case 'close':
      case 'closed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <span className="w-2 h-2 mr-1.5 rounded-full bg-red-400"></span>
            Disconnected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <span className="w-2 h-2 mr-1.5 rounded-full bg-gray-400"></span>
            {effectiveStatus || 'Unknown'}
          </span>
        );
    }
  };

  const connectedCount = instances.filter(
    (i) => i.liveStatus === 'connected' || i.liveStatus === 'open' || i.status === 'connected'
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Instances</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your Evolution API WhatsApp connections
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-gray-50 rounded-lg text-sm">
            <span className="font-medium">{connectedCount}</span> of{' '}
            <span className="font-medium">{instances.length}</span> connected
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Create New Instance */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Create New Instance</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={newInstanceName}
            onChange={(e) => setNewInstanceName(e.target.value)}
            placeholder="Instance name (e.g., my-event-whatsapp)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateInstance()}
          />
          <button
            onClick={handleCreateInstance}
            disabled={creatingInstance || !newInstanceName.trim()}
            className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creatingInstance ? 'Creating...' : 'Create & Connect'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Only letters, numbers, hyphens, and underscores allowed. After creation, scan the QR code with WhatsApp.
        </p>
      </div>

      {/* QR Code Display */}
      {qrCodeInstance && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Connect: {qrCodeInstance}
          </h2>
          <div className="flex flex-col items-center">
            <p className="text-sm text-gray-600 mb-4">
              Open WhatsApp on your phone &gt; Settings &gt; Linked Devices &gt; Link a Device, then scan this QR code.
            </p>
            {qrCodeLoading ? (
              <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-emerald-500"></div>
            ) : qrCodeData ? (
              <div className="bg-white p-4 border-2 border-gray-200 rounded-lg">
                {qrCodeData.startsWith('data:image') ? (
                  <img src={qrCodeData} alt="WhatsApp QR Code" className="w-64 h-64" />
                ) : (
                  <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded">
                    <pre className="text-xs text-center break-all p-2">{qrCodeData}</pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No QR code available. Instance may already be connected.</p>
              </div>
            )}
            <button
              onClick={() => {
                setQrCodeInstance(null);
                setQrCodeData(null);
              }}
              className="mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Instances List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Your Instances</h2>
        </div>
        {instances.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No WhatsApp instances yet. Create one above to get started.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {instances.map((instance) => (
              <div key={instance.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-medium text-gray-900">
                      {instance.instanceName}
                    </h3>
                    {getStatusBadge(instance.status, instance.liveStatus)}
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                    <span>{instance.messagesPerMinute} msg/min</span>
                    <span>{instance.delayBetweenMs}ms delay</span>
                    <span>{instance.maxBurst} burst</span>
                    <span>Created {new Date(instance.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleGetQrCode(instance.instanceName)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    QR Code
                  </button>
                  <button
                    onClick={() => handleDisconnect(instance.instanceName)}
                    className="px-3 py-1.5 text-sm border border-yellow-300 text-yellow-700 rounded-md hover:bg-yellow-50"
                  >
                    Disconnect
                  </button>
                  <button
                    onClick={() => handleDelete(instance.instanceName)}
                    className="px-3 py-1.5 text-sm border border-red-300 text-red-700 rounded-md hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rate Limiting Info */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Rate Limiting</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-medium text-gray-700">Default: 5 msg/min</p>
            <p className="text-gray-500 mt-1">
              Maximum messages per minute per instance to avoid WhatsApp spam detection.
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-medium text-gray-700">3-second delay</p>
            <p className="text-gray-500 mt-1">
              Random delay between 3-4 seconds between each message.
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-medium text-gray-700">Max 3 burst</p>
            <p className="text-gray-500 mt-1">
              No more than 3 messages in any 10-second window.
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          These limits are applied per instance and can be customized in instance settings.
          Rate limits help prevent WhatsApp from flagging your number as spam.
        </p>
      </div>
    </div>
  );
}