'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChromePicker } from 'react-color';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, UserPlus, Gift } from 'lucide-react';

interface Host {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
}

interface Souvenir {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  quantity: number;
}

interface SouvenirAssignment {
  id: string;
  quantity: number;
  souvenir: Souvenir;
  host?: Host;
}

interface TableData {
  id: string;
  name: string;
  capacity: number;
  color: string;
  hosts: Host[];
  accessCodes: Array<{
    id: string;
    code: string;
    type: string;
    rsvp: {
      name: string;
      email: string;
    };
  }>;
  souvenirs: SouvenirAssignment[];
}

export default function TableDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [table, setTable] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showAddHostDialog, setShowAddHostDialog] = useState(false);
  const [showAddSouvenirDialog, setShowAddSouvenirDialog] = useState(false);
  const [availableHosts, setAvailableHosts] = useState<Host[]>([]);
  const [availableSouvenirs, setAvailableSouvenirs] = useState<Souvenir[]>([]);
  const [selectedHostIds, setSelectedHostIds] = useState<string[]>([]);
  const [selectedSouvenir, setSelectedSouvenir] = useState<string>('');
  const [souvenirQuantity, setSouvenirQuantity] = useState<number>(1);

  useEffect(() => {
    fetchTableData();
    fetchAvailableHosts();
    fetchAvailableSouvenirs();
  }, []);

  const fetchTableData = async () => {
    try {
      const res = await fetch(`/api/admin/tables/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setTable(data.table);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error fetching table:', error);
      toast.error('Failed to load table data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableHosts = async () => {
    try {
      const res = await fetch('/api/admin/hosts');
      const data = await res.json();
      if (data.success) {
        setAvailableHosts(data.hosts);
      }
    } catch (error) {
      console.error('Error fetching hosts:', error);
    }
  };

  const fetchAvailableSouvenirs = async () => {
    try {
      const res = await fetch('/api/admin/souvenirs');
      const data = await res.json();
      if (data.success) {
        setAvailableSouvenirs(data.souvenirs);
      }
    } catch (error) {
      console.error('Error fetching souvenirs:', error);
    }
  };

  const updateTableColor = async (color: string) => {
    try {
      const res = await fetch(`/api/admin/tables/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color }),
      });
      const data = await res.json();
      if (data.success) {
        setTable(prev => prev ? { ...prev, color } : null);
        toast.success('Table color updated');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error updating table color:', error);
      toast.error('Failed to update table color');
    }
  };

  const assignHostsToTable = async () => {
    try {
      const res = await fetch(`/api/admin/tables/${params.id}/hosts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostIds: selectedHostIds }),
      });
      const data = await res.json();
      if (data.success) {
        fetchTableData();
        setShowAddHostDialog(false);
        setSelectedHostIds([]);
        toast.success('Hosts assigned successfully');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error assigning hosts:', error);
      toast.error('Failed to assign hosts');
    }
  };

  const assignSouvenirToTable = async () => {
    try {
      const res = await fetch(`/api/admin/tables/${params.id}/souvenirs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          souvenirId: selectedSouvenir,
          quantity: souvenirQuantity,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchTableData();
        setShowAddSouvenirDialog(false);
        setSelectedSouvenir('');
        setSouvenirQuantity(1);
        toast.success('Souvenir assigned successfully');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error assigning souvenir:', error);
      toast.error('Failed to assign souvenir');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!table) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Table not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Table: {table.name}</h1>
          <p className="text-gray-500">
            Capacity: {table.accessCodes.length}/{table.capacity}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded cursor-pointer border"
              style={{ backgroundColor: table.color }}
              onClick={() => setShowColorPicker(!showColorPicker)}
            />
            {showColorPicker && (
              <div className="absolute mt-2">
                <ChromePicker
                  color={table.color}
                  onChange={(color) => updateTableColor(color.hex)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="guests">
        <TabsList>
          <TabsTrigger value="guests">Guests</TabsTrigger>
          <TabsTrigger value="hosts">Hosts</TabsTrigger>
          <TabsTrigger value="souvenirs">Souvenirs</TabsTrigger>
        </TabsList>

        <TabsContent value="guests" className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Access Code</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.accessCodes.map((code) => (
                <TableRow key={code.id}>
                  <TableCell>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      code.type === 'primary' ? 'bg-blue-100 text-blue-800' :
                      code.type === 'guest' ? 'bg-purple-100 text-purple-800' :
                      code.type === 'driver' ? 'bg-orange-100 text-orange-800' :
                      'bg-teal-100 text-teal-800'
                    }`}>
                      {code.type}
                    </span>
                  </TableCell>
                  <TableCell>{code.rsvp.name}</TableCell>
                  <TableCell>{code.rsvp.email}</TableCell>
                  <TableCell>{code.code}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="hosts" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showAddHostDialog} onOpenChange={setShowAddHostDialog}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Hosts
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Hosts to Table</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid gap-4">
                    {availableHosts.map((host) => (
                      <div key={host.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={host.id}
                          checked={selectedHostIds.includes(host.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedHostIds([...selectedHostIds, host.id]);
                            } else {
                              setSelectedHostIds(selectedHostIds.filter(id => id !== host.id));
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <Label htmlFor={host.id}>
                          {host.name} ({host.role})
                        </Label>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={assignHostsToTable}
                    disabled={selectedHostIds.length === 0}
                  >
                    Assign Selected Hosts
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.hosts.map((host) => (
                <TableRow key={host.id}>
                  <TableCell>{host.name}</TableCell>
                  <TableCell>{host.role}</TableCell>
                  <TableCell>{host.email}</TableCell>
                  <TableCell>{host.phone || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="souvenirs" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showAddSouvenirDialog} onOpenChange={setShowAddSouvenirDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Gift className="w-4 h-4 mr-2" />
                  Add Souvenirs
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Souvenirs to Table</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label>Select Souvenir</Label>
                      <select
                        value={selectedSouvenir}
                        onChange={(e) => setSelectedSouvenir(e.target.value)}
                        className="w-full p-2 border rounded"
                      >
                        <option value="">Select a souvenir...</option>
                        {availableSouvenirs.map((souvenir) => (
                          <option key={souvenir.id} value={souvenir.id}>
                            {souvenir.name} (Available: {souvenir.quantity})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={souvenirQuantity}
                        onChange={(e) => setSouvenirQuantity(parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={assignSouvenirToTable}
                    disabled={!selectedSouvenir || souvenirQuantity < 1}
                  >
                    Assign Souvenir
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Souvenir</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Assigned To Host</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.souvenirs.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>{assignment.souvenir.name}</TableCell>
                  <TableCell>{assignment.quantity}</TableCell>
                  <TableCell>{assignment.host?.name || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}
