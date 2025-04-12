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

interface HallAdmissionRecord {
  codeId: string;
  admittedAt: string;
}

export default function MobileAccessPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [filteredCodes, setFilteredCodes] = useState<AccessCode[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [admittingGate, setAdmittingGate] = useState<string | null>(null);
  const [admittingHall, setAdmittingHall] = useState<string | null>(null);
  const [admissionMode, setAdmissionMode] = useState<'gate' | 'hall'>('gate');
  const [hallAdmissions, setHallAdmissions] = useState<HallAdmissionRecord[]>([]);

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

  // Mark access code as admitted at gate
  const markAsGateAdmitted = async (codeId: string) => {
    try {
      setAdmittingGate(codeId);
      const response = await fetch(`/api/admin/events/${params.id}/access-codes/admit-gate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark as admitted at gate');
      }
      
      const data = await response.json();
      toast.success(data.message || 'Marked as admitted at gate successfully');
      
      // Update the local state
      setAccessCodes(prevCodes => 
        prevCodes.map(code => 
          code.id === codeId 
            ? { 
                ...code, 
                isAdmitted: true, 
                admittedAt: new Date().toISOString()
              } 
            : code
        )
      );
      
      setFilteredCodes(prevCodes => 
        prevCodes.map(code => 
          code.id === codeId 
            ? { 
                ...code, 
                isAdmitted: true, 
                admittedAt: new Date().toISOString()
              } 
            : code
        )
      );
    } catch (error) {
      console.error('Error marking as admitted at gate:', error);
      toast.error('Failed to mark as admitted at gate');
    } finally {
      setAdmittingGate(null);
    }
  };

  // Mark access code as admitted to hall
  const markAsHallAdmitted = async (codeId: string) => {
    try {
      setAdmittingHall(codeId);
      const response = await fetch(`/api/admin/events/${params.id}/access-codes/admit-hall`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // If the guest hasn't been admitted at the gate yet
        if (errorData.requiresGateAdmission) {
          toast.error('Attendee must be admitted at the gate first');
          // Switch to gate admission mode
          setAdmissionMode('gate');
          return;
        }
        
        throw new Error('Failed to mark as admitted to hall');
      }
      
      const data = await response.json();
      toast.success(data.message || 'Marked as admitted to hall successfully');
      
      // Update the local state for hall admission
      const now = new Date().toISOString();
      setHallAdmissions(prev => [...prev, { codeId, admittedAt: now }]);
      
    } catch (error) {
      console.error('Error marking as admitted to hall:', error);
      toast.error('Failed to mark as admitted to hall');
    } finally {
      setAdmittingHall(null);
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
    const isAdmitting = admittingGate === code.id || admittingHall === code.id;
    const isGateAdmitted = code.isAdmitted;
    const isHallAdmitted = hallAdmissions.some(record => record.codeId === code.id);
    
    // Determine if button should be disabled based on admission mode
    const isDisabled = 
      (admissionMode === 'gate' && isGateAdmitted) || 
      (admissionMode === 'hall' && (isHallAdmitted || !isGateAdmitted)) ||
      isAdmitting;
    
    // Determine button text based on admission mode and status
    const getButtonText = () => {
      if (isAdmitting) return 'Processing...';
      
      if (admissionMode === 'gate') {
        return isGateAdmitted ? 'Gate: Admitted' : 'Admit at Gate';
      } else {
        if (!isGateAdmitted) return 'Needs Gate Admission';
        return isHallAdmitted ? 'Hall: Admitted' : 'Admit to Hall';
      }
    };
    
    // Get button color based on mode and status
    const getButtonClass = () => {
      if (isAdmitting) return 'bg-gray-200 text-gray-700 cursor-wait';
      
      if (admissionMode === 'gate') {
        return isGateAdmitted 
          ? 'bg-green-100 text-green-700 cursor-not-allowed' 
          : 'bg-green-600 text-white hover:bg-green-700';
      } else {
        if (!isGateAdmitted) return 'bg-gray-100 text-gray-400 cursor-not-allowed';
        return isHallAdmitted 
          ? 'bg-blue-100 text-blue-700 cursor-not-allowed' 
          : 'bg-blue-600 text-white hover:bg-blue-700';
      }
    };
    
    return (
      <div key={code.id} className="bg-white rounded-lg border border-dashed border-gray-300 overflow-hidden mb-4 p-6">
        <div className="text-center">
          <h3 className="text-3xl font-bold mb-2">{code.code || 'N/A'}</h3>
          <p className="text-gray-700 mb-1">{code.rsvp?.name || 'Unknown'}</p>
          <p className="text-sm text-gray-500 mb-1">{code.type || 'Unknown'}</p>
          
          {code.table && (
            <p className="text-sm text-gray-500 mb-4">Table {code.table.name}</p>
          )}
          
          <div className="flex justify-between mb-4">
            <div className={`text-sm rounded-full px-3 py-1 ${code.isAdmitted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              Gate: {code.isAdmitted ? 'Admitted' : 'Pending'}
            </div>
            <div className={`text-sm rounded-full px-3 py-1 ${isHallAdmitted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              Hall: {isHallAdmitted ? 'Admitted' : 'Pending'}
            </div>
          </div>
          
          <button
            onClick={() => admissionMode === 'gate' ? markAsGateAdmitted(code.id) : markAsHallAdmitted(code.id)}
            disabled={isDisabled}
            className={`mt-4 w-full py-2 px-4 rounded-lg font-medium ${getButtonClass()}`}
          >
            {getButtonText()}
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
      {/* Admission Mode Toggle */}
      <div className="w-full mb-4 flex border border-gray-300 rounded-lg overflow-hidden">
        <button
          onClick={() => setAdmissionMode('gate')}
          className={`flex-1 py-2 text-center font-medium ${
            admissionMode === 'gate' 
              ? 'bg-green-600 text-white' 
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Gate Admission
        </button>
        <button
          onClick={() => setAdmissionMode('hall')}
          className={`flex-1 py-2 text-center font-medium ${
            admissionMode === 'hall' 
              ? 'bg-blue-600 text-white' 
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Hall Admission
        </button>
      </div>
      
      {/* Search Input - 30% of available height */}
      <div className="w-full mb-4" style={{ height: '25vh' }}>
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
        >
          Search
        </button>
      </div>
      
      {/* Results - Remaining height */}
      <div className="w-full" style={{ height: '65vh', overflowY: 'auto' }}>
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
