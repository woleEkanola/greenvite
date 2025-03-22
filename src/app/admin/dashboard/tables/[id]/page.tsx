'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ChromePicker } from 'react-color';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Host {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
}

interface Souvenir {
  id: string;
  name: string;
  description?: string;
  image?: string;
  quantity: number;
}

interface SouvenirAssignment {
  id: string;
  quantity: number;
  souvenir: Souvenir;
  host?: Host;
}

interface AccessCode {
  id: string;
  code: string;
  type: string;
  name: string;
  isAdmitted: boolean;
  admittedAt?: string;
  rsvp: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    hasGuest: boolean;
    hasDriver: boolean;
    hasAide: boolean;
  };
}

interface TableData {
  id: string;
  name: string;
  capacity: number;
  color: string;
  accessCodes: AccessCode[];
  hosts: Host[];
  souvenirs: SouvenirAssignment[];
}

export default function TableDetailPage() {
  const params = useParams();
  const [table, setTable] = useState<TableData | null>(null);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [souvenirs, setSouvenirs] = useState<Souvenir[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
  const [selectedSouvenir, setSelectedSouvenir] = useState<string>('');
  const [souvenirQuantity, setSouvenirQuantity] = useState<number>(1);

  useEffect(() => {
    fetchTableData();
    fetchHosts();
    fetchSouvenirs();
  }, []);

  const fetchTableData = async () => {
    try {
      const res = await fetch(`/api/admin/tables/${params.id}`);
      const data = await res.json();
      if (data.success && data.table) {
        setTable(data.table);
      } else {
        console.error('Error fetching table:', data.error);
      }
    } catch (error) {
      console.error('Error fetching table:', error);
    }
  };

  const fetchHosts = async () => {
    try {
      const res = await fetch('/api/admin/hosts');
      const data = await res.json();
      setHosts(data);
    } catch (error) {
      console.error('Error fetching hosts:', error);
    }
  };

  const fetchSouvenirs = async () => {
    try {
      const res = await fetch('/api/admin/souvenirs');
      const data = await res.json();
      setSouvenirs(data);
    } catch (error) {
      console.error('Error fetching souvenirs:', error);
    }
  };

  const handleColorChange = async (color: any) => {
    try {
      await fetch(`/api/admin/tables/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: color.hex }),
      });
      setTable(prev => prev ? { ...prev, color: color.hex } : null);
    } catch (error) {
      console.error('Error updating color:', error);
    }
  };

  const handleHostAssignment = async () => {
    try {
      await fetch(`/api/admin/tables/${params.id}/hosts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostIds: selectedHosts }),
      });
      fetchTableData();
      setSelectedHosts([]);
    } catch (error) {
      console.error('Error assigning hosts:', error);
    }
  };

  const handleSouvenirAssignment = async () => {
    try {
      await fetch(`/api/admin/tables/${params.id}/souvenirs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          souvenirId: selectedSouvenir,
          quantity: souvenirQuantity,
        }),
      });
      fetchTableData();
      setSelectedSouvenir('');
      setSouvenirQuantity(1);
    } catch (error) {
      console.error('Error assigning souvenir:', error);
    }
  };

  if (!table) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Table: {table.name}</h1>
        <div className="flex items-center gap-4">
          <div
            className="w-6 h-6 rounded cursor-pointer border border-gray-300"
            style={{ backgroundColor: table.color }}
            onClick={() => setShowColorPicker(!showColorPicker)}
          />
          {showColorPicker && (
            <div className="absolute z-10">
              <ChromePicker color={table.color} onChange={handleColorChange} />
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="guests">
        <TabsList>
          <TabsTrigger value="guests">Guest List</TabsTrigger>
          <TabsTrigger value="hosts">Hosts</TabsTrigger>
          <TabsTrigger value="souvenirs">Souvenirs</TabsTrigger>
        </TabsList>

        <TabsContent value="guests">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.accessCodes?.map((accessCode) => (
                <TableRow key={accessCode.id}>
                  <TableCell>{accessCode.name}</TableCell>
                  <TableCell>{accessCode.type}</TableCell>
                  <TableCell>{accessCode.rsvp.email}</TableCell>
                  <TableCell>{accessCode.rsvp.phone || '-'}</TableCell>
                  <TableCell>
                    {accessCode.isAdmitted ? 'Admitted' : 'Not Admitted'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="hosts">
          <div className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label>Assign Hosts</Label>
                <select
                  multiple
                  className="w-full p-2 border rounded"
                  value={selectedHosts}
                  onChange={(e) => setSelectedHosts(Array.from(e.target.selectedOptions, option => option.value))}
                >
                  {hosts.map((host) => (
                    <option key={host.id} value={host.id}>
                      {host.name} ({host.role})
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={handleHostAssignment}>Assign</Button>
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
                {table.hosts?.map((host) => (
                  <TableRow key={host.id}>
                    <TableCell>{host.name}</TableCell>
                    <TableCell>{host.role}</TableCell>
                    <TableCell>{host.email}</TableCell>
                    <TableCell>{host.phone || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="souvenirs">
          <div className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label>Assign Souvenir</Label>
                <select
                  className="w-full p-2 border rounded"
                  value={selectedSouvenir}
                  onChange={(e) => setSelectedSouvenir(e.target.value)}
                >
                  <option value="">Select a souvenir</option>
                  {souvenirs.map((souvenir) => (
                    <option key={souvenir.id} value={souvenir.id}>
                      {souvenir.name} (Available: {souvenir.quantity})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Quantity</Label>
                <input
                  type="number"
                  min="1"
                  className="w-24 p-2 border rounded"
                  value={souvenirQuantity}
                  onChange={(e) => setSouvenirQuantity(parseInt(e.target.value))}
                />
              </div>
              <Button onClick={handleSouvenirAssignment}>Assign</Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Souvenir</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Assigned To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.souvenirs?.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>{assignment.souvenir.name}</TableCell>
                    <TableCell>{assignment.quantity}</TableCell>
                    <TableCell>{assignment.host?.name || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
