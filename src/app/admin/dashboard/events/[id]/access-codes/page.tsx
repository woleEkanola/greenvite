'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { Search, UserCheck, RefreshCw, Send, Filter, X, ChevronDown, ChevronRight, Trash2, Table } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Swal from 'sweetalert2';

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
    vacancy: number;
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
  dependants?: AccessCode[];
  parentId?: string | null;
}

export default function EventAccessCodesPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const [event, setEvent] = useState<any>(null);
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [unassigning, setUnassigning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sentFilter, setSentFilter] = useState<'all' | 'sent' | 'not-sent'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'primary' | 'guest' | 'driver' | 'aide'>('all');
  const [tableFilter, setTableFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [specificTableFilter, setSpecificTableFilter] = useState<string>('all');
  const [admissionFilter, setAdmissionFilter] = useState<'all' | 'admitted' | 'not-admitted'>('all');
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [filteredCodes, setFilteredCodes] = useState<AccessCode[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<AccessCode | null>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [assigningTable, setAssigningTable] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [showTableAssignModal, setShowTableAssignModal] = useState(false);

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
        
        // Fetch tables for this event
        await fetchTables();
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
      
      console.log('Raw access codes from API:', data.accessCodes);
      
      // If no access codes, set empty arrays
      if (!data.accessCodes || data.accessCodes.length === 0) {
        setAccessCodes([]);
        setFilteredCodes([]);
        return;
      }
      
      // Log the types of access codes received to help debug
      const types = data.accessCodes.map((code: AccessCode) => code.type);
      const uniqueTypes = [...new Set(types)];
      console.log('Access code types found:', uniqueTypes);
      
      // Set the raw access codes directly without organizing
      setAccessCodes(data.accessCodes);
      setFilteredCodes(data.accessCodes);
    } catch (error) {
      console.error('Error fetching access codes:', error);
      toast.error('Failed to fetch access codes');
    }
  };

  // Fetch tables
  const fetchTables = async () => {
    try {
      const response = await fetch(`/api/admin/events/${params.id}/tables`);
      if (!response.ok) {
        throw new Error('Failed to fetch tables');
      }
      const data = await response.json();
      
      console.log('Tables received:', data.tables);
      
      if (data.success && data.tables) {
        setTables(data.tables);
      } else {
        setTables([]);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast.error('Failed to fetch tables');
    }
  };

  // Generate access codes
  const generateAccessCodes = async () => {
    try {
      setGenerating(true);
      const response = await fetch(`/api/admin/events/${params.id}/access-codes/generate`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error('Failed to generate access codes');
      }
      const data = await response.json();
      toast.success(data.message || 'Access codes generated successfully');
      fetchAccessCodes();
    } catch (error) {
      console.error('Error generating access codes:', error);
      toast.error('Failed to generate access codes');
    } finally {
      setGenerating(false);
    }
  };

  // Send access codes
  const sendAccessCodes = async () => {
    if (selectedCodes.length === 0) {
      toast.error('Please select access codes to send');
      return;
    }

    try {
      setSending(true);
      
      // Get all selected codes
      const response = await fetch(`/api/admin/events/${params.id}/access-codes/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeIds: selectedCodes })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send access codes');
      }
      
      const data = await response.json();
      toast.success(data.message || 'Access codes sent successfully');
      
      // Refresh the list to update the sent status
      fetchAccessCodes();
      
      // Clear selections
      setSelectedCodes([]);
    } catch (error) {
      console.error('Error sending access codes:', error);
      toast.error('Failed to send access codes');
    } finally {
      setSending(false);
    }
  };
  
  // Delete access codes
  const deleteAccessCodes = async () => {
    if (selectedCodes.length === 0) {
      toast.error('Please select access codes to delete');
      return;
    }

    // Confirm deletion
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete ${selectedCodes.length} access code(s). This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete them!',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch(`/api/admin/events/${params.id}/access-codes/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeIds: selectedCodes })
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete access codes');
      }
      
      const data = await response.json();
      toast.success(data.message || 'Access codes deleted successfully');
      
      // Refresh the list to update after deletion
      fetchAccessCodes();
      
      // Clear selections
      setSelectedCodes([]);
    } catch (error) {
      console.error('Error deleting access codes:', error);
      toast.error('Failed to delete access codes');
    } finally {
      setDeleting(false);
    }
  };

  // Unassign selected codes from their tables
  const unassignFromTable = async () => {
    if (selectedCodes.length === 0) {
      toast.error('Please select at least one access code');
      return;
    }
    
    try {
      setUnassigning(true);
      const response = await fetch(`/api/admin/events/${params.id}/access-codes/assign-table`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codeIds: selectedCodes,
          tableId: null // Setting tableId to null unassigns the codes
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unassign from table');
      }
      
      const data = await response.json();
      toast.success(data.message || 'Guests unassigned from tables successfully');
      
      // Update the local state
      setAccessCodes(prevCodes => 
        prevCodes.map(code => 
          selectedCodes.includes(code.id) 
            ? { ...code, tableId: null, table: null } 
            : code
        )
      );
      
      setFilteredCodes(prevCodes => 
        prevCodes.map(code => 
          selectedCodes.includes(code.id) 
            ? { ...code, tableId: null, table: null } 
            : code
        )
      );
      
      // Reset selection
      setSelectedCodes([]);
    } catch (error: any) {
      console.error('Error unassigning from table:', error);
      toast.error(error.message || 'Failed to unassign from table');
    } finally {
      setUnassigning(false);
    }
  };

  // Assign selected codes to a table
  const assignToTable = async () => {
    if (selectedCodes.length === 0) {
      toast.error('Please select at least one access code');
      return;
    }
    
    try {
      setAssigningTable(true);
      const response = await fetch(`/api/admin/events/${params.id}/access-codes/assign-table`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codeIds: selectedCodes,
          tableId: selectedTable
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle capacity exceeded error specifically
        if (errorData.error && errorData.error.includes('capacity would be exceeded')) {
          Swal.fire({
            title: 'Table Capacity Exceeded',
            html: `This table can only seat ${errorData.capacity} guests.<br>
                  Current occupancy: ${errorData.currentOccupancy}<br>
                  You're trying to add: ${errorData.attempting} more guests.`,
            icon: 'warning',
            confirmButtonText: 'OK',
            confirmButtonColor: '#10b981'
          });
          throw new Error('Table capacity would be exceeded');
        }
        
        throw new Error(errorData.error || 'Failed to assign table');
      }
      
      const data = await response.json();
      toast.success(data.message || 'Table assignment updated successfully');
      
      // Update the local state
      setAccessCodes(prevCodes => 
        prevCodes.map(code => 
          selectedCodes.includes(code.id) 
            ? { ...code, tableId: selectedTable, table: selectedTable 
                ? tables.find(t => t.id === selectedTable) || null 
                : null } 
            : code
        )
      );
      
      setFilteredCodes(prevCodes => 
        prevCodes.map(code => 
          selectedCodes.includes(code.id) 
            ? { ...code, tableId: selectedTable, table: selectedTable 
                ? tables.find(t => t.id === selectedTable) || null 
                : null } 
            : code
        )
      );
      
      // Reset selection
      setSelectedCodes([]);
      setSelectedTable(null);
      setShowTableAssignModal(false);
    } catch (error: any) {
      console.error('Error assigning table:', error);
      if (error.message && !error.message.includes('Table capacity would be exceeded')) {
        toast.error(error.message || 'Failed to assign table');
      }
    } finally {
      setAssigningTable(false);
    }
  };

  // Mark access code as admitted
  const markAsAdmitted = async (codeId: string) => {
    try {
      const response = await fetch(`/api/admin/events/${params.id}/access-codes/admit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark access code as admitted');
      }
      
      const data = await response.json();
      toast.success('Guest admitted successfully');
      
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
      toast.error('Failed to mark guest as admitted');
    }
  };

  // Apply filters
  useEffect(() => {
    console.log('Applying filters:', { searchTerm, sentFilter, typeFilter, tableFilter, specificTableFilter, admissionFilter });
    console.log('Original access codes count:', accessCodes.length);
    
    if (!accessCodes || accessCodes.length === 0) {
      setFilteredCodes([]);
      return;
    }
    
    let filtered = [...accessCodes];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(code => 
        (code.rsvp?.name?.toLowerCase()?.includes(term) || false) || 
        (code.code?.toLowerCase()?.includes(term) || false) ||
        (code.rsvp?.email?.toLowerCase()?.includes(term) || false)
      );
      console.log('After search filter count:', filtered.length);
    }
    
    // Apply sent filter
    if (sentFilter !== 'all') {
      filtered = filtered.filter(code => 
        sentFilter === 'sent' ? code.isSent : !code.isSent
      );
      console.log('After sent filter count:', filtered.length);
    }
    
    // Apply type filter with case-insensitive comparison
    if (typeFilter !== 'all') {
      console.log('Before type filter - codes:', filtered);
      console.log(`Filtering for type: ${typeFilter}`);
      
      // Log all the types in the filtered array to debug
      const typesBeforeFilter = filtered.map(code => code.type);
      console.log('Types before filter:', typesBeforeFilter);
      
      filtered = filtered.filter(code => {
        // Case insensitive comparison
        const codeType = code.type?.toLowerCase() || '';
        const filterType = typeFilter.toLowerCase();
        const matches = codeType === filterType;
        console.log(`Code ${code.id} type: ${code.type} (${codeType}), matches ${typeFilter} (${filterType}): ${matches}`);
        return matches;
      });
      
      console.log('After type filter count:', filtered.length);
      console.log('After type filter - codes:', filtered);
    }
    
    // Apply table assignment filter
    if (tableFilter !== 'all') {
      filtered = filtered.filter(code => 
        tableFilter === 'assigned' ? !!code.tableId : !code.tableId
      );
    }
    
    // Apply specific table filter
    if (specificTableFilter !== 'all') {
      filtered = filtered.filter(code => code.tableId === specificTableFilter);
    }
    
    // Apply admission status filter
    if (admissionFilter !== 'all') {
      filtered = filtered.filter(code => 
        admissionFilter === 'admitted' ? code.isAdmitted : !code.isAdmitted
      );
    }
    
    console.log('Final filtered codes count:', filtered.length);
    setFilteredCodes(filtered);
  }, [accessCodes, searchTerm, sentFilter, typeFilter, tableFilter, specificTableFilter, admissionFilter]);

  // Toggle code selection
  const toggleCodeSelection = (codeId: string) => {
    setSelectedCodes(prev => 
      prev.includes(codeId)
        ? prev.filter(id => id !== codeId)
        : [...prev, codeId]
    );
  };

  // Select all codes
  const selectAllCodes = () => {
    if (selectedCodes.length === filteredCodes.length) {
      setSelectedCodes([]);
    } else {
      setSelectedCodes(filteredCodes.map(code => code.id));
    }
  };

  // View guest details
  const viewGuestDetails = (code: AccessCode) => {
    setSelectedGuest(code);
  };

  // Render a mobile card for an access code
  const renderMobileCard = (code: AccessCode) => {
    return (
      <div key={code.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-4">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 mr-3"
              checked={selectedCodes.includes(code.id)}
              onChange={() => toggleCodeSelection(code.id)}
            />
            <div className="relative">
              <input 
                type="text" 
                value={code.code || ''} 
                readOnly 
                className="bg-gray-50 border border-gray-300 text-gray-900 text-lg font-bold rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 pr-10"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <Search className="w-5 h-5 text-gray-500" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 text-center">
          <h3 className="text-2xl font-bold mb-1">{code.code || 'N/A'}</h3>
          <p className="text-gray-600 mb-1">{code.rsvp?.name || 'Unknown'}</p>
          <p className="text-sm text-gray-500 mb-3">{code.type || 'Unknown'}</p>
          
          {code.table && (
            <p className="text-sm text-gray-500 mb-4">Table {code.table.name}</p>
          )}
          
          <button
            onClick={() => markAsAdmitted(code.id)}
            disabled={code.isAdmitted}
            className={`w-full py-2 px-4 rounded-lg text-center font-medium ${
              code.isAdmitted 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {code.isAdmitted ? 'Admitted' : 'Admit'}
          </button>
        </div>
      </div>
    );
  };

  // Open table assignment modal
  const openTableAssignModal = () => {
    if (selectedCodes.length === 0) {
      toast.error('Please select at least one access code');
      return;
    }
    
    setShowTableAssignModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Access Codes</h1>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={generateAccessCodes}
            disabled={generating}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-emerald-300"
          >
            <RefreshCw size={16} className={`mr-2 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating...' : 'Generate Codes'}
          </button>
          
          <button
            onClick={sendAccessCodes}
            disabled={sending || selectedCodes.length === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
          >
            <Send size={16} className="mr-2" />
            {sending ? 'Sending...' : 'Send Selected'}
          </button>
          
          <button
            onClick={openTableAssignModal}
            disabled={selectedCodes.length === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-purple-300"
          >
            <Table size={16} className="mr-2" />
            Assign Table
          </button>
          
          <button
            onClick={unassignFromTable}
            disabled={unassigning || selectedCodes.length === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:bg-amber-300"
          >
            <Table size={16} className="mr-2" />
            {unassigning ? 'Unassigning...' : 'Unassign from Table'}
          </button>
          
          <button
            onClick={deleteAccessCodes}
            disabled={deleting || selectedCodes.length === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-red-300"
          >
            <Trash2 size={16} className="mr-2" />
            {deleting ? 'Deleting...' : 'Delete Selected'}
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex flex-col space-y-4">
          {/* Search */}
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              placeholder="Search by code or name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {/* Type Filter */}
            <div className="w-full sm:w-auto">
              <select
                className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'all' | 'primary' | 'guest' | 'driver' | 'aide')}
              >
                <option value="all">All Types</option>
                <option value="primary">Primary</option>
                <option value="guest">Guest</option>
                <option value="driver">Driver</option>
                <option value="aide">Aide</option>
              </select>
            </div>
            
            {/* Sent Filter */}
            <div className="w-full sm:w-auto">
              <select
                className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                value={sentFilter}
                onChange={(e) => setSentFilter(e.target.value as 'all' | 'sent' | 'not-sent')}
              >
                <option value="all">All Status</option>
                <option value="sent">Sent</option>
                <option value="not-sent">Not Sent</option>
              </select>
            </div>
            
            {/* Table Assignment Filter */}
            <div className="w-full sm:w-auto">
              <select
                className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                value={tableFilter}
                onChange={(e) => {
                  setTableFilter(e.target.value as 'all' | 'assigned' | 'unassigned');
                  // Reset specific table filter when changing general table filter
                  if (e.target.value === 'unassigned') {
                    setSpecificTableFilter('all');
                  }
                }}
              >
                <option value="all">All Tables</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>
            
            {/* Specific Table Filter */}
            {tableFilter !== 'unassigned' && tables.length > 0 && (
              <div className="w-full sm:w-auto">
                <select
                  className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  value={specificTableFilter}
                  onChange={(e) => setSpecificTableFilter(e.target.value)}
                >
                  <option value="all">All Tables</option>
                  {tables.map((table) => (
                    <option key={table.id} value={table.id}>
                      Table: {table.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Admission Status Filter */}
            <div className="w-full sm:w-auto">
              <select
                className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                value={admissionFilter}
                onChange={(e) => setAdmissionFilter(e.target.value as 'all' | 'admitted' | 'not-admitted')}
              >
                <option value="all">All Admission</option>
                <option value="admitted">Admitted</option>
                <option value="not-admitted">Not Admitted</option>
              </select>
            </div>
            
            {(searchTerm || sentFilter !== 'all' || typeFilter !== 'all' || tableFilter !== 'all' || specificTableFilter !== 'all' || admissionFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSentFilter('all');
                  setTypeFilter('all');
                  setTableFilter('all');
                  setSpecificTableFilter('all');
                  setAdmissionFilter('all');
                }}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </button>
            )}
          </div>
        </div>
        
        {/* Quick filters for unassigned attendees */}
        {tables.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-700 mr-2">Quick Filters:</span>
              <button
                onClick={() => {
                  setTableFilter('unassigned');
                  setTypeFilter('primary');
                  setAdmissionFilter('all');
                  setSpecificTableFilter('all');
                }}
                className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-emerald-700 bg-emerald-100 hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                Unassigned Primary
              </button>
              <button
                onClick={() => {
                  setTableFilter('unassigned');
                  setTypeFilter('all');
                  setAdmissionFilter('all');
                  setSpecificTableFilter('all');
                }}
                className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                All Unassigned
              </button>
              <button
                onClick={() => {
                  setTableFilter('assigned');
                  setTypeFilter('all');
                  setAdmissionFilter('all');
                  setSpecificTableFilter('all');
                }}
                className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                All Assigned
              </button>
              <button
                onClick={() => {
                  setTableFilter('all');
                  setTypeFilter('all');
                  setAdmissionFilter('not-admitted');
                  setSpecificTableFilter('all');
                }}
                className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-amber-700 bg-amber-100 hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
              >
                Not Admitted
              </button>
              <button
                onClick={() => {
                  setTableFilter('all');
                  setTypeFilter('all');
                  setAdmissionFilter('admitted');
                  setSpecificTableFilter('all');
                }}
                className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Admitted
              </button>
            </div>
            
            {/* Table-specific quick filters */}
            {tables.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-sm font-medium text-gray-700 mr-2">Tables:</span>
                {tables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => {
                      setTableFilter('all');
                      setSpecificTableFilter(table.id);
                    }}
                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    {table.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Main content */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {/* Desktop view - Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="w-12 px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    checked={selectedCodes.length > 0 && selectedCodes.length === filteredCodes.length}
                    onChange={selectAllCodes}
                  />
                </th>
                <th scope="col" className="w-12 px-3 py-3.5 text-left text-sm font-semibold text-gray-900"></th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Name</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Code</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Type</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Table</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Sent</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Admitted</th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredCodes.length > 0 ? (
                filteredCodes.map((code: AccessCode) => (
                  <tr key={code.id} className={selectedCodes.includes(code.id) ? 'bg-emerald-50' : ''}>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        checked={selectedCodes.includes(code.id)}
                        onChange={() => toggleCodeSelection(code.id)}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {/* No expand/collapse button needed with flat structure */}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
                      {code.rsvp?.name || 'Unknown'} <span className="text-xs text-gray-500 ml-1">({code.type || 'Unknown'})</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {code.code || 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {code.type || 'Unknown'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {code.table ? code.table.name : 'Not Assigned'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {code.isSent ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Not Sent
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {code.isAdmitted ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Admitted
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Not Admitted
                        </span>
                      )}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <button
                        onClick={() => viewGuestDetails(code)}
                        className="text-emerald-600 hover:text-emerald-900 mr-4"
                      >
                        View
                      </button>
                      {!code.isAdmitted && (
                        <button
                          onClick={() => markAsAdmitted(code.id)}
                          className="text-emerald-600 hover:text-emerald-900"
                        >
                          Admit
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                    No access codes found. Generate some using the button above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Mobile view - Cards */}
        <div className="md:hidden p-4">
          <div className="grid grid-cols-1 gap-4">
            {filteredCodes.length > 0 ? (
              filteredCodes.map(code => renderMobileCard(code))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No access codes found. Generate some using the button above.
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={generateAccessCodes}
          disabled={generating}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          {generating ? (
            <>
              <RefreshCw className="animate-spin -ml-1 mr-2 h-4 w-4" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="-ml-1 mr-2 h-4 w-4" />
              Generate Access Codes
            </>
          )}
        </button>
        
        {selectedCodes.length > 0 && (
          <>
            <button
              onClick={sendAccessCodes}
              disabled={sending}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {sending ? (
                <>
                  <Send className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="-ml-1 mr-2 h-4 w-4" />
                  Send ({selectedCodes.length})
                </>
              )}
            </button>
            
            <button
              onClick={openTableAssignModal}
              disabled={selectedCodes.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <Table size={16} className="mr-2" />
              Assign Table
            </button>
            
            <button
              onClick={unassignFromTable}
              disabled={unassigning || selectedCodes.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
            >
              {unassigning ? (
                <>
                  <Table className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Unassigning...
                </>
              ) : (
                <>
                  <Table className="-ml-1 mr-2 h-4 w-4" />
                  Unassign from Table
                </>
              )}
            </button>
            
            <button
              onClick={deleteAccessCodes}
              disabled={deleting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              {deleting ? (
                <>
                  <Trash2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="-ml-1 mr-2 h-4 w-4" />
                  Delete ({selectedCodes.length})
                </>
              )}
            </button>
          </>
        )}
      </div>
      
      {/* Table Assignment Modal */}
      <Dialog open={showTableAssignModal} onOpenChange={setShowTableAssignModal}>
        <DialogContent>
          <div className="max-w-md mx-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Assign to Table</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <p>Assign {selectedCodes.length} selected {selectedCodes.length === 1 ? 'attendee' : 'attendees'} to a table:</p>
              
              <div className="space-y-2">
                <label htmlFor="table-select" className="block text-sm font-medium text-gray-700">
                  Select Table
                </label>
                <select
                  id="table-select"
                  value={selectedTable || ''}
                  onChange={(e) => setSelectedTable(e.target.value === '' ? null : e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm rounded-md"
                >
                  <option value="">-- Unassign from table --</option>
                  {tables.map((table) => (
                    <option 
                      key={table.id} 
                      value={table.id}
                    >
                      {table.name} (Available: {table.vacancy !== undefined ? `${table.vacancy}/${table.capacity}` : `${table.capacity}`})
                    </option>
                  ))}
                </select>
                {tables.length === 0 && (
                  <p className="text-sm text-amber-600 mt-1">
                    No tables available. Please create tables first.
                  </p>
                )}
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  onClick={() => setShowTableAssignModal(false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  Cancel
                </button>
                <button
                  onClick={assignToTable}
                  disabled={assigningTable}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-emerald-300"
                >
                  {assigningTable ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Guest Details Dialog */}
      <Dialog open={!!selectedGuest} onOpenChange={(open) => !open && setSelectedGuest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guest Details</DialogTitle>
          </DialogHeader>
          
          {selectedGuest && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Name</h3>
                  <p className="mt-1 text-sm text-gray-900">{selectedGuest.rsvp.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Email</h3>
                  <p className="mt-1 text-sm text-gray-900">{selectedGuest.rsvp.email || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                  <p className="mt-1 text-sm text-gray-900">{selectedGuest.rsvp.phone || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Type</h3>
                  <p className="mt-1 text-sm text-gray-900">{selectedGuest.type}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Code</h3>
                  <p className="mt-1 text-sm text-gray-900">{selectedGuest.code}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Table</h3>
                  <p className="mt-1 text-sm text-gray-900">{selectedGuest.table ? selectedGuest.table.name : 'Not Assigned'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Has Guest</h3>
                  <p className="mt-1 text-sm text-gray-900">{selectedGuest.rsvp.hasGuest ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Has Driver</h3>
                  <p className="mt-1 text-sm text-gray-900">{selectedGuest.rsvp.hasDriver ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Has Aide</h3>
                  <p className="mt-1 text-sm text-gray-900">{selectedGuest.rsvp.hasAide ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Sent</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedGuest.isSent 
                      ? `Yes, on ${selectedGuest.sentAt ? format(new Date(selectedGuest.sentAt), 'PPp') : 'N/A'}` 
                      : 'No'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Admitted</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedGuest.isAdmitted 
                      ? `Yes, on ${selectedGuest.admittedAt ? format(new Date(selectedGuest.admittedAt), 'PPp') : 'N/A'}` 
                      : 'No'}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                {!selectedGuest.isAdmitted && (
                  <button
                    onClick={() => {
                      markAsAdmitted(selectedGuest.id);
                      setSelectedGuest(null);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                  >
                    <UserCheck size={16} className="mr-2" />
                    Mark as Admitted
                  </button>
                )}
                
                {/* Add button to assign to table */}
                <button
                  onClick={() => {
                    setSelectedCodes([selectedGuest.id]);
                    setSelectedGuest(null);
                    setShowTableAssignModal(true);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <Table size={16} className="mr-2" />
                  {selectedGuest.tableId ? 'Change Table' : 'Assign to Table'}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
