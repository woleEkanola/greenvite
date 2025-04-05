'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Search, UserCheck, ArrowLeft } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
      <div key={code.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden mb-4 max-w-sm mx-auto">
        <div className="p-6 text-center">
          <h3 className="text-3xl font-bold mb-2">{code.code || 'N/A'}</h3>
          <p className="text-gray-700 text-lg mb-1">{code.rsvp?.name || 'Unknown'}</p>
          <p className="text-sm text-gray-500 mb-2">{code.type || 'Unknown'}</p>
          
          {code.table && (
            <p className="text-sm text-gray-500 mb-4">Table {code.table.name}</p>
          )}
          
          <button
            onClick={() => markAsAdmitted(code.id)}
            disabled={code.isAdmitted || admitting === code.id}
            className={`w-full py-3 px-4 rounded-lg text-center font-medium text-lg ${
              code.isAdmitted 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : admitting === code.id
                  ? 'bg-emerald-400 text-white cursor-wait'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {code.isAdmitted 
              ? 'Admitted' 
              : admitting === code.id 
                ? 'Processing...' 
                : 'Admit'}
          </button>
          
          {code.isAdmitted && code.admittedAt && (
            <p className="text-xs text-gray-500 mt-2">
              Admitted at {new Date(code.admittedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 flex items-center">
          <Link href={`/admin/dashboard/events/${params.id}/access-codes`} className="mr-4">
            <ArrowLeft className="h-6 w-6 text-gray-500" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900 flex-1">
            {event?.name || 'Event'} - Access Check
          </h1>
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="max-w-md mx-auto px-4 pt-6 pb-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
            placeholder="Search by code or name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="absolute inset-y-0 right-0 px-4 text-emerald-600 font-medium"
            onClick={handleSearch}
          >
            Search
          </button>
        </div>
      </div>
      
      {/* Results */}
      <div className="max-w-md mx-auto px-4 pb-8">
        {filteredCodes.length > 0 ? (
          filteredCodes.map(code => renderAccessCard(code))
        ) : (
          <div className="text-center py-8 text-gray-500">
            {searchTerm.trim() ? 'No matching access codes found' : 'Enter a code or name to search'}
          </div>
        )}
      </div>
    </div>
  );
}
