'use client';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

interface Batch {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

interface Invite {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  type: string;
  status: string;
  errorMessage: string | null;
  batch: Batch;
}

const RetriggerPage = () => {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [selectedInvites, setSelectedInvites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [resending, setResending] = useState<boolean>(false);
  const [marking, setMarking] = useState<boolean>(false);

  useEffect(() => {
    fetchInvites();
  }, []);

  const fetchInvites = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/retrigger');
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const data = await response.json();
      setInvites(data);
    } catch (error) {
      console.error('Error fetching invites:', error);
      toast.error('Failed to fetch pending invites');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (id: string) => {
    setSelectedInvites(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  };

  const handleResendInvites = async () => {
    if (selectedInvites.size === 0) return;
    
    setResending(true);
    try {
      const selectedArray = Array.from(selectedInvites);
      const response = await fetch('/api/admin/resend-invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inviteIds: selectedArray }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Resend result:', result);
      
      if (result.success) {
        toast.success(`Successfully resent ${result.successful.length} invites`);
        if (result.failedCount > 0) {
          toast.error(`Failed to resend ${result.failedCount} invites`);
        }
        // Refresh the invites list
        fetchInvites();
      } else {
        toast.error(result.error || 'Failed to resend invites');
      }
      
      setSelectedInvites(new Set());
    } catch (error) {
      console.error('Error resending invites:', error);
      toast.error('Failed to resend invites');
    } finally {
      setResending(false);
    }
  };

  const handleMarkBatchAsSent = async (batchId: string) => {
    setMarking(true);
    try {
      const response = await fetch('/api/admin/mark-batch-sent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ batchId }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(`Batch marked as sent successfully`);
        // Refresh the invites list
        fetchInvites();
      } else {
        toast.error(result.error || 'Failed to mark batch as sent');
      }
    } catch (error) {
      console.error('Error marking batch as sent:', error);
      toast.error('Failed to mark batch as sent');
    } finally {
      setMarking(false);
    }
  };

  // Group invites by batch
  const invitesByBatch = invites.reduce((acc, invite) => {
    const batchId = invite.batch?.id || 'unknown';
    if (!acc[batchId]) {
      acc[batchId] = {
        batch: invite.batch,
        invites: []
      };
    }
    acc[batchId].invites.push(invite);
    return acc;
  }, {} as Record<string, { batch: Batch, invites: Invite[] }>);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Retrigger Invites</h1>
      
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <p className="text-lg">Loading pending invites...</p>
        </div>
      ) : invites.length === 0 ? (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p>All invites have been sent successfully! There are no pending invites to retrigger.</p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded mr-2 disabled:bg-gray-400"
              onClick={handleResendInvites}
              disabled={selectedInvites.size === 0 || resending}
            >
              {resending ? 'Resending...' : `Resend Selected Invites (${selectedInvites.size})`}
            </button>
            <button
              className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-400"
              onClick={fetchInvites}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
          
          {Object.values(invitesByBatch).map(({ batch, invites }) => (
            <div key={batch?.id || 'unknown'} className="mb-8 border rounded-lg overflow-hidden">
              <div className="bg-gray-100 p-4 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">
                    Batch: {batch?.name || 'Unknown'} 
                    <span className={`ml-2 px-2 py-1 text-xs rounded ${
                      batch?.status === 'pending' ? 'bg-yellow-200 text-yellow-800' : 
                      batch?.status === 'sent' ? 'bg-green-200 text-green-800' : 
                      batch?.status === 'failed' ? 'bg-red-200 text-red-800' : 
                      'bg-gray-200 text-gray-800'
                    }`}>
                      {batch?.status || 'Unknown'}
                    </span>
                  </h2>
                  <p className="text-sm text-gray-600">
                    Created: {batch?.createdAt ? new Date(batch.createdAt).toLocaleString() : 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Invites: {invites.length}
                  </p>
                </div>
                <button
                  className="px-3 py-1 bg-green-500 text-white rounded text-sm disabled:bg-gray-400"
                  onClick={() => handleMarkBatchAsSent(batch.id)}
                  disabled={marking || batch?.status === 'sent'}
                >
                  {marking ? 'Marking...' : 'Mark as Sent'}
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-2 px-3 text-left">Select</th>
                      <th className="py-2 px-3 text-left">Name</th>
                      <th className="py-2 px-3 text-left">Email</th>
                      <th className="py-2 px-3 text-left">Phone</th>
                      <th className="py-2 px-3 text-left">Type</th>
                      <th className="py-2 px-3 text-left">Status</th>
                      <th className="py-2 px-3 text-left">Error Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map((invite) => (
                      <tr key={invite.id} className="border-t hover:bg-gray-50">
                        <td className="py-2 px-3">
                          <input
                            type="checkbox"
                            checked={selectedInvites.has(invite.id)}
                            onChange={() => handleCheckboxChange(invite.id)}
                            className="h-4 w-4"
                          />
                        </td>
                        <td className="py-2 px-3">{invite.name}</td>
                        <td className="py-2 px-3">{invite.email || 'N/A'}</td>
                        <td className="py-2 px-3">{invite.phone || 'N/A'}</td>
                        <td className="py-2 px-3">{invite.type}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-1 text-xs rounded ${
                            invite.status === 'pending' ? 'bg-yellow-200 text-yellow-800' : 
                            invite.status === 'sent' ? 'bg-green-200 text-green-800' : 
                            invite.status === 'failed' ? 'bg-red-200 text-red-800' : 
                            invite.status === 'partial' ? 'bg-blue-200 text-blue-800' : 
                            'bg-gray-200 text-gray-800'
                          }`}>
                            {invite.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 max-w-xs truncate" title={invite.errorMessage || ''}>
                          {invite.errorMessage || 'None'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default RetriggerPage;
