'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Swal from 'sweetalert2';


interface Souvenir {
  id: string;
  name: string;
  description: string;
  image: string;
  quantity: number;
}

export default function SouvenirsPage() {
  const router = useRouter();
  const [souvenirs, setSouvenirs] = useState<Souvenir[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingSouvenir, setEditingSouvenir] = useState<Souvenir | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    quantity: 0,
  });

  useEffect(() => {
    fetchSouvenirs();
  }, []);

  const fetchSouvenirs = async () => {
    try {
      const response = await fetch('/api/admin/souvenirs');
      if (!response.ok) throw new Error('Failed to fetch souvenirs');
      const data = await response.json();
      setSouvenirs(data);
    } catch (error) {
      console.error('Error:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to fetch souvenirs',
        icon: 'error',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingSouvenir
        ? `/api/admin/souvenirs/${editingSouvenir.id}`
        : '/api/admin/souvenirs';
      const method = editingSouvenir ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save souvenir');

      Swal.fire({
        title: 'Success',
        text: `Souvenir ${editingSouvenir ? 'updated' : 'created'} successfully`,
        icon: 'success',
      });

      setIsOpen(false);
      setEditingSouvenir(null);
      setFormData({ name: '', description: '', image: '', quantity: 0 });
      fetchSouvenirs();
    } catch (error) {
      console.error('Error:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to save souvenir',
        icon: 'error',
      });
    }
  };

  const handleEdit = (souvenir: Souvenir) => {
    setEditingSouvenir(souvenir);
    setFormData({
      name: souvenir.name,
      description: souvenir.description || '',
      image: souvenir.image || '',
      quantity: souvenir.quantity || 0,
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this souvenir?')) return;

    try {
      const response = await fetch(`/api/admin/souvenirs/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete souvenir');

      Swal.fire({
        title: 'Success',
        text: 'Souvenir deleted successfully',
        icon: 'success',
      });

      fetchSouvenirs();
    } catch (error) {
      console.error('Error:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to delete souvenir',
        icon: 'error',
      });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Souvenirs</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingSouvenir(null);
              setFormData({ name: '', description: '', image: '', quantity: 0 });
            }}>
              Add Souvenir
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSouvenir ? 'Edit Souvenir' : 'Add New Souvenir'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="image">Image URL</Label>
                <Input
                  id="image"
                  type="url"
                  value={formData.image}
                  onChange={(e) =>
                    setFormData({ ...formData, image: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: parseInt(e.target.value) || 0,
                    })
                  }
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editingSouvenir ? 'Update' : 'Create'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {souvenirs.map((souvenir) => (
              <TableRow key={souvenir.id}>
                <TableCell>{souvenir.name}</TableCell>
                <TableCell>{souvenir.description}</TableCell>
                <TableCell>
                  {souvenir.image && (
                    <img
                      src={souvenir.image}
                      alt={souvenir.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                </TableCell>
                <TableCell>{souvenir.quantity}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(souvenir)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(souvenir.id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
