'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface AccessCode {
  id: string;
  code: string;
  type: string;
  name: string;
  isAdmitted: boolean;
  admittedAt: string | null;
  isSent: boolean;
  sentAt: string | null;
  tableId: string | null;
  table: {
    id: string;
    name: string;
    capacity: number;
  } | null;
  rsvp: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    hasGuest: boolean;
    hasDriver: boolean;
    hasAide: boolean;
  };
}

export default function MobileAccessPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [filteredCodes, setFilteredCodes] = useState<AccessCode[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [admitting, setAdmitting] = useState<string | null>(null);

  useEffect(() => {
    const fetchEventAndCodes = async () => {
      try {
        setLoading(true);
        
        // Fetch event details
        const eventResponse = await fetch(`/api/admin/events/${params.id}`);
        if (!eventResponse.ok) {
          throw new Error('Failed to fetch event');
        }
        const eventData = await eventResponse.json();
        setEvent(eventData);
        
        // Fetch access codes for this event
        await fetchAccessCodes();
      } catch (error) {
        console.error('Error:', error);
        toast.error('Failed to load event data');
      } finally {
        setLoading(false);
      }
    };

    fetchEventAndCodes();
  }, [params.id]);

  // Fetch access codes
  const fetchAccessCodes = async () => {
    try {
      const response = await fetch(`/api/admin/events/${params.id}/access-codes`);
      if (!response.ok) {
        throw new Error('Failed to fetch access codes');
      }
      const data = await response.json();
      
      setAccessCodes(data.accessCodes);
      // Initially don't show any codes until search
      setFilteredCodes([]);
    } catch (error) {
      console.error('Error fetching access codes:', error);
      toast.error('Failed to fetch access codes');
    }
  };

  // Mark access code as admitted
  const markAsAdmitted = async (codeId: string) => {
    try {
      setAdmitting(codeId);
      const response = await fetch(`/api/admin/events/${params.id}/access-codes/admit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark as admitted');
      }
      
      const data = await response.json();
      toast.success(data.message || 'Marked as admitted successfully');
      
      // Update the local state
      setAccessCodes(prevCodes => 
        prevCodes.map(code => 
          code.id === codeId 
            ? { ...code, isAdmitted: true, admittedAt: new Date().toISOString() } 
            : code
        )
      );
      
      setFilteredCodes(prevCodes => 
        prevCodes.map(code => 
          code.id === codeId 
            ? { ...code, isAdmitted: true, admittedAt: new Date().toISOString() } 
            : code
        )
      );
    } catch (error) {
      console.error('Error marking as admitted:', error);
      toast.error('Failed to mark as admitted');
    } finally {
      setAdmitting(null);
    }
  };

  // Handle search
  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setFilteredCodes([]);
      return;
    }
    
    const term = searchTerm.toLowerCase().trim();
    const filtered = accessCodes.filter(code => 
      (code.code?.toLowerCase()?.includes(term) || false) ||
      (code.rsvp?.name?.toLowerCase()?.includes(term) || false)
    );
    
    setFilteredCodes(filtered);
    
    if (filtered.length === 0) {
      toast.error('No matching access codes found');
    }
  };

  // Handle search on enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Render a mobile card for an access code
  const renderAccessCard = (code: AccessCode) => {
    return (
      <div key={code.id} className="bg-white rounded-lg border border-dashed border-gray-300 overflow-hidden mb-4 p-6">
        <div className="text-center">
          <h3 className="text-3xl font-bold mb-2">{code.code || 'N/A'}</h3>
          <p className="text-gray-700 mb-1">{code.rsvp?.name || 'Unknown'}</p>
          <p className="text-sm text-gray-500 mb-1">{code.type || 'Unknown'}</p>
          
          {code.table && (
            <p className="text-sm text-gray-500 mb-4">Table {code.table.name}</p>
          )}
          
          <button
            onClick={() => markAsAdmitted(code.id)}
            disabled={code.isAdmitted || admitting === code.id}
            className={`mt-4 w-full py-2 px-4 rounded-lg border border-gray-300 text-center font-medium ${
              code.isAdmitted 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : admitting === code.id
                  ? 'bg-gray-200 text-gray-700 cursor-wait'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            style={{ fontFamily: 'cursive' }}
          >
            {code.isAdmitted 
              ? 'Admitted' 
              : admitting === code.id 
                ? 'Processing...' 
                : 'Admit'}
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-300"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-4 max-w-md mx-auto">
      {/* Search Input - 30% of available height */}
      <div className="w-full mb-4" style={{ height: '30vh' }}>
        <div className="border border-dashed border-gray-300 rounded-lg p-4 mb-2 flex flex-col justify-center h-4/5">
          <p className="text-center text-gray-500 text-sm mb-2">Type here to search</p>
          <input
            type="text"
            className="w-full text-center text-2xl font-bold border-none focus:outline-none focus:ring-0"
            placeholder="G3H45"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button
          onClick={handleSearch}
          className="w-full py-2 border border-gray-300 rounded-lg text-center font-medium h-1/5"
          style={{ fontFamily: 'cursive' }}
        >
          Search
        </button>
      </div>
      
      {/* Results - Remaining height */}
      <div className="w-full" style={{ height: '70vh', overflowY: 'auto' }}>
        {filteredCodes.length > 0 ? (
          filteredCodes.map(code => renderAccessCard(code))
        ) : (
          searchTerm.trim() && (
            <div className="text-center py-8 text-gray-500">
              No matching access codes found
            </div>
          )
        )}
      </div>
    </div>
  );
}
