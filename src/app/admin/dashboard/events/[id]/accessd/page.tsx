'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { Search, UserCheck, RefreshCw, X, ChevronLeft, CheckCircle, Home, DoorOpen } from 'lucide-react';
import Link from 'next/link';
import Swal from 'sweetalert2';

interface AccessCode {
  id: string;
  code: string;
  type: string;
  name: string;
  isAdmitted: boolean;
  admittedAt: string | null;
  isHallAdmitted: boolean;
  hallAdmittedAt: string | null;
  tableId: string | null;
  table: {
    id: string;
    name: string;
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

export default function AccessdPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [filteredCodes, setFilteredCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [admitting, setAdmitting] = useState<{ [key: string]: boolean }>({});
  const [admittingHall, setAdmittingHall] = useState<{ [key: string]: boolean }>({});

  // Fetch event and access codes
  useEffect(() => {
    fetchData();
  }, [params.id]);

  // Filter access codes when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCodes(accessCodes);
      return;
    }

    const lowercasedSearch = searchTerm.toLowerCase();
    const filtered = accessCodes.filter(code => 
      code.name.toLowerCase().includes(lowercasedSearch) ||
      code.code.toLowerCase().includes(lowercasedSearch) ||
      (code.rsvp.email && code.rsvp.email.toLowerCase().includes(lowercasedSearch)) ||
      (code.rsvp.phone && code.rsvp.phone.toLowerCase().includes(lowercasedSearch)) ||
      (code.table && code.table.name.toLowerCase().includes(lowercasedSearch))
    );
    
    setFilteredCodes(filtered);
  }, [searchTerm, accessCodes]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch event details
      const eventResponse = await fetch(`/api/admin/events/${params.id}`);
      if (!eventResponse.ok) {
        throw new Error('Failed to fetch event');
      }
      const eventData = await eventResponse.json();
      setEvent(eventData);
      
      // Fetch access codes for this event (with a large limit to get all)
      await fetchAccessCodes();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccessCodes = async () => {
    try {
      setRefreshing(true);
      const response = await fetch(`/api/admin/events/${params.id}/access-codes?limit=1000`);
      if (!response.ok) {
        throw new Error('Failed to fetch access codes');
      }
      const data = await response.json();
      
      if (data.success && data.accessCodes) {
        setAccessCodes(data.accessCodes);
        setFilteredCodes(data.accessCodes);
      } else {
        setAccessCodes([]);
        setFilteredCodes([]);
      }
    } catch (error) {
      console.error('Error fetching access codes:', error);
      toast.error('Failed to fetch access codes');
    } finally {
      setRefreshing(false);
    }
  };

  const handleGateAdmit = async (codeId: string) => {
    try {
      // Set admitting state for this code
      setAdmitting(prev => ({ ...prev, [codeId]: true }));
      
      const response = await fetch(`/api/admin/events/${params.id}/access-codes/admit-gate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ codeId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to admit attendee');
      }
      
      const data = await response.json();
      
      // Update the access code in the local state
      setAccessCodes(prevCodes => 
        prevCodes.map(code => 
          code.id === codeId 
            ? { 
                ...code, 
                isAdmitted: true, 
                admittedAt: new Date().toISOString(),
                tableId: data.accessCode.tableId,
                table: data.accessCode.tableId ? { 
                  id: data.accessCode.tableId, 
                  name: data.accessCode.tableName || 'Unknown Table' 
                } : null
              } 
            : code
        )
      );
      
      // Also update filtered codes
      setFilteredCodes(prevCodes => 
        prevCodes.map(code => 
          code.id === codeId 
            ? { 
                ...code, 
                isAdmitted: true, 
                admittedAt: new Date().toISOString(),
                tableId: data.accessCode.tableId,
                table: data.accessCode.tableId ? { 
                  id: data.accessCode.tableId, 
                  name: data.accessCode.tableName || 'Unknown Table' 
                } : null
              } 
            : code
        )
      );
      
      // Show success message
      toast.success('Attendee admitted successfully');
      
      // Check if a table is assigned
      if (!data.hasTable) {
        // Prompt to assign a table
        Swal.fire({
          icon: 'warning',
          title: 'No Table Assigned',
          text: 'Would you like to assign a table for this attendee?',
          showCancelButton: true,
          confirmButtonText: 'Assign Table',
          cancelButtonText: 'Skip',
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33'
        }).then((result) => {
          if (result.isConfirmed) {
            // Redirect to the table assignment page
            router.push(`/admin/dashboard/events/${params.id}/access-codes/${codeId}/assign-table`);
          }
        });
      }
    } catch (error) {
      console.error('Error admitting attendee:', error);
      toast.error('Failed to admit attendee');
    } finally {
      // Clear admitting state for this code
      setAdmitting(prev => ({ ...prev, [codeId]: false }));
    }
  };

  const handleHallAdmit = async (codeId: string) => {
    try {
      // Set admitting hall state for this code
      setAdmittingHall(prev => ({ ...prev, [codeId]: true }));
      
      const response = await fetch(`/api/admin/events/${params.id}/access-codes/admit-hall`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ codeId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // If the guest hasn't been admitted at the gate yet
        if (errorData.requiresGateAdmission) {
          Swal.fire({
            icon: 'warning',
            title: 'Gate Admission Required',
            text: 'Attendee must be admitted at the gate first',
            confirmButtonText: 'Admit at Gate',
            showCancelButton: true,
            confirmButtonColor: '#10B981',
            cancelButtonColor: '#9CA3AF'
          }).then((result) => {
            if (result.isConfirmed) {
              handleGateAdmit(codeId);
            }
          });
          return;
        }
        
        throw new Error(errorData.error || 'Failed to admit attendee to hall');
      }
      
      const data = await response.json();
      
      // Update the access code in the local state
      setAccessCodes(prevCodes => 
        prevCodes.map(code => 
          code.id === codeId 
            ? { 
                ...code, 
                isHallAdmitted: true, 
                hallAdmittedAt: new Date().toISOString(),
                tableId: data.accessCode.tableId,
                table: data.accessCode.tableId ? { 
                  id: data.accessCode.tableId, 
                  name: data.accessCode.tableName || 'Unknown Table' 
                } : null
              } 
            : code
        )
      );
      
      // Also update filtered codes
      setFilteredCodes(prevCodes => 
        prevCodes.map(code => 
          code.id === codeId 
            ? { 
                ...code, 
                isHallAdmitted: true, 
                hallAdmittedAt: new Date().toISOString(),
                tableId: data.accessCode.tableId,
                table: data.accessCode.tableId ? { 
                  id: data.accessCode.tableId, 
                  name: data.accessCode.tableName || 'Unknown Table' 
                } : null
              } 
            : code
        )
      );
      
      // Show success message
      toast.success('Attendee admitted to hall successfully');
      
      // Check if a table is assigned
      if (!data.hasTable) {
        // Prompt to assign a table
        Swal.fire({
          icon: 'warning',
          title: 'No Table Assigned',
          text: 'Would you like to assign a table for this attendee?',
          showCancelButton: true,
          confirmButtonText: 'Assign Table',
          cancelButtonText: 'Skip',
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33'
        }).then((result) => {
          if (result.isConfirmed) {
            // Redirect to the table assignment page
            router.push(`/admin/dashboard/events/${params.id}/access-codes/${codeId}/assign-table`);
          }
        });
      }
    } catch (error) {
      console.error('Error admitting attendee to hall:', error);
      toast.error('Failed to admit attendee to hall');
    } finally {
      // Clear admitting hall state for this code
      setAdmittingHall(prev => ({ ...prev, [codeId]: false }));
    }
  };

  const renderAccessCodeCard = (code: AccessCode) => {
    const isAdmitting = admitting[code.id] || false;
    const isAdmittingHall = admittingHall[code.id] || false;
    
    return (
      <div key={code.id} className="bg-white rounded-lg shadow-md mb-4 overflow-hidden">
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{code.name}</h3>
              <p className="text-sm text-gray-500">{code.code}</p>
            </div>
            <div className="flex flex-col items-end">
              {code.type !== 'primary' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-1">
                  {code.type}
                </span>
              )}
              {code.isAdmitted && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Admitted
                </span>
              )}
              {code.isHallAdmitted && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                  <DoorOpen className="h-3 w-3 mr-1" />
                  Hall
                </span>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            <div>
              <span className="text-gray-500">Email:</span>
              <p className="text-gray-900 truncate">{code.rsvp.email || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-500">Phone:</span>
              <p className="text-gray-900">{code.rsvp.phone || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-500">Table:</span>
              <p className="text-gray-900">{code.table ? code.table.name : 'Not Assigned'}</p>
            </div>
            <div>
              <span className="text-gray-500">Admitted:</span>
              <p className="text-gray-900">
                {code.isAdmitted 
                  ? `${code.admittedAt ? format(new Date(code.admittedAt), 'HH:mm') : 'Yes'}` 
                  : 'No'}
              </p>
            </div>
          </div>
          
          <div className="flex justify-between mt-3 space-x-2">
            <button
              onClick={() => handleGateAdmit(code.id)}
              disabled={isAdmitting || code.isAdmitted}
              className={`flex-1 inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white 
                ${code.isAdmitted 
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : 'bg-emerald-600 hover:bg-emerald-700'}`}
            >
              {isAdmitting ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <UserCheck className="h-4 w-4 mr-1" />
              )}
              {code.isAdmitted ? 'Admitted' : 'Gate Admit'}
            </button>
            
            <button
              onClick={() => handleHallAdmit(code.id)}
              disabled={isAdmittingHall || code.isHallAdmitted || !code.isAdmitted}
              className={`flex-1 inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white 
                ${!code.isAdmitted 
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : code.isHallAdmitted 
                    ? 'bg-gray-300 cursor-not-allowed' 
                    : 'bg-purple-600 hover:bg-purple-700'}`}
            >
              {isAdmittingHall ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <DoorOpen className="h-4 w-4 mr-1" />
              )}
              {code.isHallAdmitted ? 'Hall Admitted' : 'Hall Admit'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Link href={`/admin/dashboard/events/${params.id}`} className="text-gray-500 hover:text-gray-700 mr-2">
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-lg font-medium text-gray-900">
                {event?.title ? `${event.title} - Access` : 'Event Access'}
              </h1>
            </div>
            <Link 
              href={`/admin/dashboard/events/${params.id}`}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200"
            >
              <Home className="h-4 w-4 mr-1" />
              Dashboard
            </Link>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        {/* Search bar */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, code, email, phone..."
            className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <X className="h-5 w-5 text-gray-400 hover:text-gray-500" />
            </button>
          )}
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded-lg shadow-sm p-3 text-center">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-lg font-semibold">{accessCodes.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-3 text-center">
            <p className="text-xs text-gray-500">Admitted</p>
            <p className="text-lg font-semibold">{accessCodes.filter(code => code.isAdmitted).length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-3 text-center">
            <p className="text-xs text-gray-500">Hall</p>
            <p className="text-lg font-semibold">{accessCodes.filter(code => code.isHallAdmitted).length}</p>
          </div>
        </div>
        
        {/* Results count and refresh button */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600">
            {filteredCodes.length} {filteredCodes.length === 1 ? 'result' : 'results'}
            {searchTerm && ` for "${searchTerm}"`}
          </p>
          <button
            onClick={fetchAccessCodes}
            disabled={refreshing}
            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-emerald-700 bg-emerald-100 hover:bg-emerald-200"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        
        {/* Access codes list */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin" />
            <span className="ml-2 text-gray-600">Loading...</span>
          </div>
        ) : filteredCodes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500">
              {searchTerm ? 'No access codes found matching your search.' : 'No access codes available.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCodes.map(code => renderAccessCodeCard(code))}
          </div>
        )}
      </main>
    </div>
  );
}
