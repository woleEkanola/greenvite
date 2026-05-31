'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface EvolutionInstance {
  id: string;
  instanceName: string;
  status: string;
  liveStatus?: string;
  messagesPerMinute: number;
  delayBetweenMs: number;
  maxBurst: number;
}

export default function EventEvolutionSettingsPage() {
  const params = useParams();
  const eventId = params?.id as string;
  const [instances, setInstances] = useState<EvolutionInstance[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [instancesRes, eventRes] = await Promise.all([
          fetch('/api/admin/evolution/instances'),
          fetch(`/api/admin/events/${eventId}`),
        ]);

        if (instancesRes.ok) {
          const data = await instancesRes.json();
          setInstances(data.instances || []);
        }

        if (eventRes.ok) {
          const eventData = await eventRes.json();
          setSelectedInstanceId(eventData.evolutionInstanceId || null);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    if (eventId) {
      loadData();
    }
  }, [eventId]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evolutionInstanceId: selectedInstanceId || null }),
      });

      if (!res.ok) throw new Error('Failed to update event');

      setMessage({ type: 'success', text: 'WhatsApp instance updated successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">WhatsApp Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Assign a WhatsApp instance to this event for sending invitations.
        </p>
      </div>

      {message && (
        <div
          className={`px-4 py-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Assign WhatsApp Instance</h2>
        <p className="text-sm text-gray-500 mb-4">
          Each WhatsApp instance represents a connected phone number. Messages for this event will be sent through the selected instance.
        </p>

        {instances.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500 mb-4">No WhatsApp instances available.</p>
            <a
              href="/admin/dashboard/evolution"
              className="inline-flex items-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
            >
              Create Instance
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            <select
              value={selectedInstanceId || ''}
              onChange={(e) => setSelectedInstanceId(e.target.value || null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">No WhatsApp instance (use default)</option>
              {instances.map((instance) => (
                <option key={instance.id} value={instance.id}>
                  {instance.instanceName}{' '}
                  {instance.liveStatus === 'connected' || instance.status === 'connected'
                    ? '✅ Connected'
                    : instance.liveStatus === 'connecting' || instance.status === 'connecting'
                    ? '⏳ Connecting'
                    : '❌ Disconnected'}
                </option>
              ))}
            </select>

            {selectedInstanceId && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Instance Settings</h3>
                {(() => {
                  const instance = instances.find((i) => i.id === selectedInstanceId);
                  if (!instance) return null;
                  return (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Messages/min</p>
                        <p className="font-medium">{instance.messagesPerMinute}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Delay</p>
                        <p className="font-medium">{instance.delayBetweenMs}ms</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Max burst</p>
                        <p className="font-medium">{instance.maxBurst}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-2">About WhatsApp Instances</h2>
        <div className="text-sm text-gray-600 space-y-2">
          <p>Each WhatsApp instance connects to a single phone number via Evolution API.</p>
          <p>To set up a new instance:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Go to the <a href="/admin/dashboard/evolution" className="text-emerald-600 hover:underline">WhatsApp Instances</a> page</li>
            <li>Create a new instance</li>
            <li>Scan the QR code with your phone</li>
            <li>Come back here and assign it to this event</li>
          </ol>
        </div>
      </div>
    </div>
  );
}