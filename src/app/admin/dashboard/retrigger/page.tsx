'use client';
import React, { useEffect, useState } from 'react';
import { prisma } from '@/lib/prisma';

interface Invite {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  type: string;
  status: string;
  errorMessage: string;
}

const RetriggerPage = () => {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [selectedInvites, setSelectedInvites] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchInvites = async () => {
      try {
        const response = await fetch('/api/admin/retrigger');
        const data = await response.json();
        setInvites(data);
      } catch (error) {
        console.error('Error fetching invites:', error);
      }
    };
    fetchInvites();
  }, []);

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
    try {
      const selectedArray = Array.from(selectedInvites);
      const response = await fetch('/api/admin/resend-invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inviteIds: selectedArray }),
      });
      const result = await response.json();
      console.log('Resend result:', result);
      // Optionally refresh the invites list
      setSelectedInvites(new Set());
    } catch (error) {
      console.error('Error resending invites:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Retrigger Invites</h1>
      <button
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded"
        onClick={handleResendInvites}
        disabled={selectedInvites.size === 0}
      >
        Resend Selected Invites
      </button>
      <table className="min-w-full bg-white">
        <thead>
          <tr>
            <th className="py-2">Select</th>
            <th className="py-2">Name</th>
            <th className="py-2">Email</th>
            <th className="py-2">Phone</th>
            <th className="py-2">Type</th>
            <th className="py-2">Status</th>
            <th className="py-2">Error Message</th>
          </tr>
        </thead>
        <tbody>
          {invites.map((invite) => (
            <tr key={invite.id} className="text-center">
              <td className="py-2">
                <input
                  type="checkbox"
                  checked={selectedInvites.has(invite.id)}
                  onChange={() => handleCheckboxChange(invite.id)}
                />
              </td>
              <td className="py-2">{invite.name}</td>
              <td className="py-2">{invite.email || 'N/A'}</td>
              <td className="py-2">{invite.phone || 'N/A'}</td>
              <td className="py-2">{invite.type}</td>
              <td className="py-2">{invite.status}</td>
              <td className="py-2">{invite.errorMessage}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RetriggerPage;
