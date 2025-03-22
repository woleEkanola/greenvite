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

export default function AccessCodesPage() {
  const { data: session } = useSession();
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sentFilter, setSentFilter] = useState<'all' | 'sent' | 'not-sent'>('all');
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [filteredCodes, setFilteredCodes] = useState<AccessCode[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<AccessCode | null>(null);

  // Fetch access codes
  const fetchAccessCodes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/access-codes');
      const data = await response.json();
      if (data.success) {
        setAccessCodes(data.accessCodes);
        setFilteredCodes(data.accessCodes);
      }
    } catch (error) {
      toast.error('Failed to fetch access codes');
    } finally {
      setLoading(false);
    }
  };

  // Generate access codes
  const generateAccessCodes = async () => {
    try {
      setGenerating(true);
      const response = await fetch('/api/admin/access-codes/generate', {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        fetchAccessCodes();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
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
      const response = await fetch('/api/admin/access-codes/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeIds: selectedCodes })
      });
      const data = await response.json();
      
      if (data.success) {
        const successCount = data.results.filter((r: any) => r.success).length;
        const failureCount = data.results.filter((r: any) => !r.success).length;
        
        if (failureCount === 0) {
          toast.success(`Successfully sent ${successCount} access codes`);
        } else {
          toast.success(`Sent ${successCount} codes, ${failureCount} failed`);
        }
        
        fetchAccessCodes();
        setSelectedCodes([]);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error('Failed to send access codes');
    } finally {
      setSending(false);
    }
  };

  // Admit visitor
  const admitVisitor = async (code: string) => {
    try {
      const response = await fetch('/api/admin/access-codes/admit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Visitor admitted successfully');
        fetchAccessCodes();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error('Failed to admit visitor');
    }
  };

  // Filter access codes
  const filterCodes = (term: string, sentStatus: 'all' | 'sent' | 'not-sent') => {
    let filtered = accessCodes;

    // Filter by sent status
    if (sentStatus === 'sent') {
      filtered = filtered.filter(code => code.isSent);
    } else if (sentStatus === 'not-sent') {
      filtered = filtered.filter(code => !code.isSent);
    }

    // Filter by search term
    if (term) {
      filtered = filtered.filter(code => 
        code.code.toLowerCase().includes(term.toLowerCase()) ||
        code.name.toLowerCase().includes(term.toLowerCase()) ||
        code.rsvp.name.toLowerCase().includes(term.toLowerCase()) ||
        code.rsvp.email.toLowerCase().includes(term.toLowerCase()) ||
        (code.rsvp.phone && code.rsvp.phone.includes(term))
      );
    }

    setFilteredCodes(filtered);
  };

  // Toggle code selection
  const toggleCodeSelection = (id: string) => {
    setSelectedCodes(prev => 
      prev.includes(id) 
        ? prev.filter(codeId => codeId !== id)
        : [...prev, id]
    );
  };

  // Toggle all codes selection
  const toggleAllCodes = () => {
    if (selectedCodes.length === filteredCodes.length) {
      setSelectedCodes([]);
    } else {
      setSelectedCodes(filteredCodes.map(code => code.id));
    }
  };

  useEffect(() => {
    filterCodes(searchTerm, sentFilter);
  }, [searchTerm, sentFilter, accessCodes]);

  useEffect(() => {
    fetchAccessCodes();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Access Codes</h1>
        <div className="flex gap-4">
          <button
            onClick={sendAccessCodes}
            disabled={sending || selectedCodes.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
              disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {sending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Selected ({selectedCodes.length})
              </>
            )}
          </button>
          <button
            onClick={generateAccessCodes}
            disabled={generating}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 
              disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Access Codes'
            )}
          </button>
        </div>
      </div>

      {/* Guest Details Modal */}
      <Dialog open={!!selectedGuest} onOpenChange={(open) => !open && setSelectedGuest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guest Details</DialogTitle>
          </DialogHeader>
          {selectedGuest && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Name</h3>
                <p>{selectedGuest.rsvp.name}</p>
              </div>
              <div>
                <h3 className="font-medium">Email</h3>
                <p>{selectedGuest.rsvp.email}</p>
              </div>
              {selectedGuest.rsvp.phone && (
                <div>
                  <h3 className="font-medium">Phone</h3>
                  <p>{selectedGuest.rsvp.phone}</p>
                </div>
              )}
              <div>
                <h3 className="font-medium">Access Code</h3>
                <p className="font-mono">{selectedGuest.code}</p>
              </div>
              <div>
                <h3 className="font-medium">Type</h3>
                <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                  selectedGuest.type === 'primary' ? 'bg-blue-100 text-blue-800' :
                  selectedGuest.type === 'guest' ? 'bg-purple-100 text-purple-800' :
                  selectedGuest.type === 'driver' ? 'bg-orange-100 text-orange-800' :
                  'bg-teal-100 text-teal-800'
                }`}>
                  {selectedGuest.type}
                </span>
              </div>
              <div>
                <h3 className="font-medium">Table Assignment</h3>
                <p>{selectedGuest.table?.name || 'Not assigned'}</p>
              </div>
              <div>
                <h3 className="font-medium">Status</h3>
                <div className="space-y-1">
                  {selectedGuest.isSent && (
                    <div className="flex items-center gap-1 text-blue-600">
                      <Send className="w-4 h-4" />
                      <span>Sent on {format(new Date(selectedGuest.sentAt!), 'MMM d, yyyy HH:mm')}</span>
                    </div>
                  )}
                  {selectedGuest.isAdmitted && (
                    <div className="flex items-center gap-1 text-green-600">
                      <UserCheck className="w-4 h-4" />
                      <span>Admitted on {format(new Date(selectedGuest.admittedAt!), 'MMM d, yyyy HH:mm')}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    admitVisitor(selectedGuest.code);
                    setSelectedGuest(null);
                  }}
                  disabled={selectedGuest.isAdmitted}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 
                    disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {selectedGuest.isAdmitted ? 'Already Admitted' : 'Admit Guest'}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Search and Filter Bar */}
      <div className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name, code, or RSVP details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 
              focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <select
          value={sentFilter}
          onChange={(e) => setSentFilter(e.target.value as 'all' | 'sent' | 'not-sent')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 
            focus:ring-green-500 focus:border-transparent"
        >
          <option value="all">All Codes</option>
          <option value="sent">Sent</option>
          <option value="not-sent">Not Sent</option>
        </select>
      </div>

      {/* Access Codes Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedCodes.length === filteredCodes.length}
                    onChange={toggleAllCodes}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
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
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  </td>
                </tr>
              ) : filteredCodes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No access codes found
                  </td>
                </tr>
              ) : (
                filteredCodes.map((code) => (
                  <tr
                    key={code.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedGuest(code)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedCodes.includes(code.id)}
                        onChange={() => toggleCodeSelection(code.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        code.type === 'primary' ? 'bg-blue-100 text-blue-800' :
                        code.type === 'guest' ? 'bg-purple-100 text-purple-800' :
                        code.type === 'driver' ? 'bg-orange-100 text-orange-800' :
                        'bg-teal-100 text-teal-800'
                      }`}>
                        {code.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {code.rsvp.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {code.rsvp.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {code.table?.name || 'Not assigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {code.isSent && (
                          <div className="flex items-center gap-1 text-blue-600">
                            <Send className="w-4 h-4" />
                            <span className="text-xs">Sent</span>
                          </div>
                        )}
                        {code.isAdmitted && (
                          <div className="flex items-center gap-1 text-green-600">
                            <UserCheck className="w-4 h-4" />
                            <span className="text-xs">Admitted</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          admitVisitor(code.code);
                        }}
                        disabled={code.isAdmitted}
                        className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Admit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
