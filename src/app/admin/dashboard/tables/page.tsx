'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

interface TableData {
  id: string;
  name: string;
  capacity: number;
  accessCodes: Array<{
    id: string;
    code: string;
    type: string;
    name: string;
    isAdmitted: boolean;
    admittedAt: Date | null;
    isSent: boolean;
    sentAt: Date | null;
    rsvp: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      hasGuest: boolean;
      hasDriver: boolean;
      hasAide: boolean;
    };
  }>;
  createdAt: string;
  updatedAt: string;
  color: string;
}

interface Guest {
  id: string;
  code: string;
  type: string;
  name: string;
  isAdmitted: boolean;
  admittedAt: Date | null;
  isSent: boolean;
  sentAt: Date | null;
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

export default function TablesPage() {
  const router = useRouter();
  const [tables, setTables] = useState<TableData[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null);
  const [newTableName, setNewTableName] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('');
  const [showNewTableDialog, setShowNewTableDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedGuests, setSelectedGuests] = useState<string[]>([]);
  const [selectedTargetTable, setSelectedTargetTable] = useState<string>('');

  // Fetch tables and guests on mount
  useEffect(() => {
    fetchTables();
    fetchGuests();
  }, []);

  async function fetchTables() {
    try {
      const res = await fetch('/api/admin/tables');
      const data = await res.json();
      if (data.success) {
        setTables(data.tables);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast.error('Failed to fetch tables');
    } finally {
      setLoading(false);
    }
  }

  async function fetchGuests() {
    try {
      const res = await fetch('/api/admin/access-codes');
      const data = await res.json();
      if (data.success) {
        setGuests(data.accessCodes);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error fetching guests:', error);
      toast.error('Failed to fetch guests');
    }
  }

  async function createTable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newTableName.trim()) {
      toast.error('Table name is required');
      return;
    }
    const capacity = parseInt(newTableCapacity);
    if (isNaN(capacity) || capacity < 1) {
      toast.error('Capacity must be a positive number');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTableName,
          capacity,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Table created successfully');
        setNewTableName('');
        setNewTableCapacity('');
        setShowNewTableDialog(false);
        fetchTables();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error creating table:', error);
      toast.error('Failed to create table');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteTable(tableId: string) {
    if (!confirm('Are you sure you want to delete this table?')) return;

    try {
      const res = await fetch(`/api/admin/tables/${tableId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Table deleted successfully');
        fetchTables();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error deleting table:', error);
      toast.error('Failed to delete table');
    }
  }

  async function assignGuestToTable(guestId: string, tableId: string | null) {
    try {
      const res = await fetch('/api/admin/tables/assign', {
        method: tableId ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          accessCodeIds: [guestId],
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          tableId
            ? 'Guest assigned to table successfully'
            : 'Guest removed from table successfully'
        );
        fetchTables();
        fetchGuests(); // Refresh guest list to update assignments
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error updating guest table assignment:', error);
      toast.error('Failed to update guest table assignment');
    }
  }

  // Filter guests based on search and type
  const filteredGuests = guests
    .filter(guest => !guest.table)
    .filter(guest => {
      const matchesSearch = searchTerm === '' || 
        guest.rsvp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guest.rsvp.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = selectedType === 'all' || guest.type === selectedType;
      
      return matchesSearch && matchesType;
    });

  // Toggle guest selection
  const toggleGuestSelection = (guestId: string) => {
    setSelectedGuests(prev => 
      prev.includes(guestId)
        ? prev.filter(id => id !== guestId)
        : [...prev, guestId]
    );
  };

  // Toggle all guests selection
  const toggleAllGuests = () => {
    if (selectedGuests.length === filteredGuests.length) {
      setSelectedGuests([]);
    } else {
      setSelectedGuests(filteredGuests.map(guest => guest.id));
    }
  };

  // Assign selected guests to table
  const assignSelectedGuests = async () => {
    if (!selectedTargetTable || selectedGuests.length === 0) {
      toast.error('Please select guests and a target table');
      return;
    }

    try {
      const res = await fetch('/api/admin/tables/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: selectedTargetTable,
          accessCodeIds: selectedGuests,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Guests assigned to table successfully');
        fetchTables();
        fetchGuests();
        setSelectedGuests([]);
        setSelectedTargetTable('');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error assigning guests to table:', error);
      toast.error('Failed to assign guests to table');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const hasNoTables = tables.length === 0;

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Table Management</h1>
        <Button 
          className="bg-emerald-500 hover:bg-emerald-600"
          onClick={() => setShowNewTableDialog(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Table
        </Button>
      </div>

      <Dialog open={showNewTableDialog} onOpenChange={setShowNewTableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Table</DialogTitle>
          </DialogHeader>
          <form onSubmit={createTable} className="space-y-4 mt-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Table Name
              </label>
              <Input
                id="name"
                type="text"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder="e.g., Table 1"
                className="w-full"
                required
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="capacity" className="block text-sm font-medium mb-1">
                Seating Capacity
              </label>
              <Input
                id="capacity"
                type="number"
                min="1"
                value={newTableCapacity}
                onChange={(e) => setNewTableCapacity(e.target.value)}
                placeholder="e.g., 8"
                className="w-full"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewTableDialog(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Table'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tables List */}
      <div className="space-y-8">
        <div className="bg-white rounded-lg shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table Name</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Guests Assigned</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hasNoTables ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No tables created yet</h3>
                    <p className="text-gray-500">Get started by creating your first table.</p>
                  </TableCell>
                </TableRow>
              ) : (
                tables.map((table) => (
                  <TableRow key={table.id}>
                    <TableCell>{table.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: table.color }}
                        />
                        {table.accessCodes?.length || 0}/{table.capacity}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/admin/dashboard/tables/${table.id}`)}
                        >
                          View Details
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTable(table.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Unassigned Guests List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Unassigned Guests</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder="Search guests..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                  <Select
                    value={selectedType}
                    onValueChange={setSelectedType}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="primary">Primary</SelectItem>
                      <SelectItem value="guest">Guest</SelectItem>
                      <SelectItem value="driver">Driver</SelectItem>
                      <SelectItem value="aide">Aide</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {selectedGuests.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedTargetTable}
                      onValueChange={setSelectedTargetTable}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select target table" />
                      </SelectTrigger>
                      <SelectContent>
                        {tables.map((table) => (
                          <SelectItem
                            key={table.id}
                            value={table.id}
                            disabled={table.accessCodes?.length >= table.capacity}
                          >
                            {table.name} ({table.accessCodes?.length || 0}/{table.capacity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={assignSelectedGuests}
                      disabled={!selectedTargetTable}
                      className="bg-emerald-500 hover:bg-emerald-600"
                    >
                      Assign {selectedGuests.length} Selected
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <input
                    type="checkbox"
                    checked={selectedGuests.length === filteredGuests.length && filteredGuests.length > 0}
                    onChange={toggleAllGuests}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Guest Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGuests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <p className="text-gray-500">No unassigned guests found.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredGuests.map((guest) => (
                  <TableRow key={guest.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedGuests.includes(guest.id)}
                        onChange={() => toggleGuestSelection(guest.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        guest.type === 'primary' ? 'bg-blue-100 text-blue-800' :
                        guest.type === 'guest' ? 'bg-purple-100 text-purple-800' :
                        guest.type === 'driver' ? 'bg-orange-100 text-orange-800' :
                        'bg-teal-100 text-teal-800'
                      }`}>
                        {guest.type}
                      </span>
                    </TableCell>
                    <TableCell>{guest.rsvp.name}</TableCell>
                    <TableCell>{guest.rsvp.email}</TableCell>
                    <TableCell>
                      <Select
                        value={guest.tableId || 'unassigned'}
                        onValueChange={(value) =>
                          assignGuestToTable(
                            guest.id,
                            value === 'unassigned' ? null : value
                          )
                        }
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Select a table" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {tables.map((table) => (
                            <SelectItem
                              key={table.id}
                              value={table.id}
                              disabled={table.accessCodes?.length >= table.capacity}
                            >
                              {table.name} ({table.accessCodes?.length || 0}/{table.capacity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
