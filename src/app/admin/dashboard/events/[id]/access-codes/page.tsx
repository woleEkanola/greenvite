'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { Search, UserCheck, RefreshCw, Send, Filter, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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

export default function EventAccessCodesPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const [event, setEvent] = useState<any>(null);
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sentFilter, setSentFilter] = useState<'all' | 'sent' | 'not-sent'>('all');
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [filteredCodes, setFilteredCodes] = useState<AccessCode[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<AccessCode | null>(null);

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
      setFilteredCodes(data.accessCodes);
    } catch (error) {
      console.error('Error fetching access codes:', error);
      toast.error('Failed to fetch access codes');
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
      setSelectedCodes([]);
      fetchAccessCodes();
    } catch (error) {
      console.error('Error sending access codes:', error);
      toast.error('Failed to send access codes');
    } finally {
      setSending(false);
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

  // Filter access codes
  useEffect(() => {
    let filtered = [...accessCodes];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(code => 
        code.name.toLowerCase().includes(term) || 
        code.code.toLowerCase().includes(term) ||
        code.rsvp.name.toLowerCase().includes(term) ||
        (code.rsvp.email && code.rsvp.email.toLowerCase().includes(term)) ||
        (code.rsvp.phone && code.rsvp.phone.toLowerCase().includes(term))
      );
    }
    
    // Apply sent filter
    if (sentFilter === 'sent') {
      filtered = filtered.filter(code => code.isSent);
    } else if (sentFilter === 'not-sent') {
      filtered = filtered.filter(code => !code.isSent);
    }
    
    setFilteredCodes(filtered);
  }, [searchTerm, sentFilter, accessCodes]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">{event?.title} - Access Codes</h1>
          <p className="text-gray-600 mt-1">Manage access codes for this event</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={generateAccessCodes}
            disabled={generating}
            className="flex items-center px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 disabled:opacity-50"
          >
            <RefreshCw size={16} className="mr-2" />
            {generating ? 'Generating...' : 'Generate Access Codes'}
          </button>
          
          <button
            onClick={sendAccessCodes}
            disabled={sending || selectedCodes.length === 0}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            <Send size={16} className="mr-2" />
            {sending ? 'Sending...' : `Send (${selectedCodes.length})`}
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-grow max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by name, email, or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Filter size={18} className="text-gray-500" />
          <select
            value={sentFilter}
            onChange={(e) => setSentFilter(e.target.value as 'all' | 'sent' | 'not-sent')}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="all">All Codes</option>
            <option value="sent">Sent</option>
            <option value="not-sent">Not Sent</option>
          </select>
        </div>
        
        <button
          onClick={selectAllCodes}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {selectedCodes.length === filteredCodes.length && filteredCodes.length > 0
            ? 'Deselect All'
            : 'Select All'}
        </button>
        
        {selectedCodes.length > 0 && (
          <button
            onClick={() => setSelectedCodes([])}
            className="flex items-center text-sm text-red-600 hover:text-red-800"
          >
            <X size={16} className="mr-1" />
            Clear Selection
          </button>
        )}
      </div>
      
      {/* Access Codes Table */}
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedCodes.length === filteredCodes.length && filteredCodes.length > 0}
                    onChange={selectAllCodes}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Guest
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Table
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCodes.length > 0 ? (
                filteredCodes.map((code) => (
                  <tr key={code.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedCodes.includes(code.id)}
                        onChange={() => toggleCodeSelection(code.id)}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{code.rsvp.name}</div>
                      <div className="text-sm text-gray-500">{code.rsvp.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        {code.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {code.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {code.table ? code.table.name : 'Not Assigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        {code.isAdmitted ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Admitted
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Not Admitted
                          </span>
                        )}
                        {code.isSent ? (
                          <span className="mt-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            Sent
                          </span>
                        ) : (
                          <span className="mt-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Not Sent
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => viewGuestDetails(code)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </button>
                        {!code.isAdmitted && (
                          <button
                            onClick={() => markAsAdmitted(code.id)}
                            className="text-emerald-600 hover:text-emerald-900 flex items-center"
                          >
                            <UserCheck size={16} className="mr-1" />
                            Admit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No access codes found. Generate some using the button above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Guest Details Dialog */}
      <Dialog open={!!selectedGuest} onOpenChange={(open) => !open && setSelectedGuest(null)}>
        <DialogContent className="sm:max-w-md">
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
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
