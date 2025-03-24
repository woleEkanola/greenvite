'use client';

import { useState, useEffect } from 'react';
import { PencilIcon, TrashIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

type User = {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  role: string;
};

type EventAdmin = {
  id: string;
  userId: string;
  eventId: string;
  user: User;
};

type Event = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startDate: Date;
  endDate: Date;
  imageUrl: string | null;
  status: string;
  slug: string | null;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  owner: User;
  admins: EventAdmin[];
};

export default function SuperAdminEventsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedEventForAdmins, setSelectedEventForAdmins] = useState<Event | null>(null);
  const [selectedAdminIds, setSelectedAdminIds] = useState<string[]>([]);

  useEffect(() => {
    // Redirect if not authenticated or not a superadmin
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'SUPERADMIN') {
      router.push('/admin/dashboard');
    } else if (status === 'authenticated') {
      fetchEvents();
      fetchUsers();
    }
  }, [status, session, router]);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/superadmin/events');
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/superadmin/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleManageAdmins = (event: Event) => {
    setSelectedEventForAdmins(event);
    // Pre-select existing admins
    const adminIds = event.admins.map(admin => admin.userId);
    setSelectedAdminIds(adminIds);
    setIsAdminModalOpen(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      const response = await fetch(`/api/superadmin/events/${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      // Refresh events list
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleSaveAdmins = async () => {
    if (!selectedEventForAdmins) return;

    try {
      const response = await fetch(`/api/superadmin/events/${selectedEventForAdmins.id}/admins`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminIds: selectedAdminIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to update event admins');
      }

      // Close modal and refresh events
      setIsAdminModalOpen(false);
      fetchEvents();
    } catch (error) {
      console.error('Error updating event admins:', error);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        items={[
          { name: 'Users', href: '/superadmin/users', icon: 'users' },
          { name: 'Events', href: '/superadmin/events', icon: 'calendar' }
        ]} 
      />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Events Management</h1>
          <Link
            href="/superadmin/events/create"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Event
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">No events found. Create your first event!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {events.map((event) => (
              <div key={event.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold">{event.title}</h2>
                    <p className="text-gray-500 mt-1">{event.slug ? `/${event.slug}` : 'No slug'}</p>
                    <p className="text-gray-700 mt-2">{event.description || 'No description'}</p>
                    <div className="mt-3 text-sm text-gray-500">
                      <p>Location: {event.location || 'Not specified'}</p>
                      <p>
                        Date: {format(new Date(event.startDate), 'PPP')} - {format(new Date(event.endDate), 'PPP')}
                      </p>
                      <p>Status: <span className={`font-medium ${event.status === 'published' ? 'text-green-600' : 'text-yellow-600'}`}>{event.status}</span></p>
                      <p className="mt-2">Owner: {event.owner?.name || event.owner?.username || 'Unknown'}</p>
                      <p>Admins: {event.admins.length} users</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditEvent(event)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleManageAdmins(event)}
                      className="text-purple-500 hover:text-purple-700"
                    >
                      <UserGroupIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Event Modal */}
        {isModalOpen && (
          <EventModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            event={selectedEvent}
            users={users}
            onEventSaved={fetchEvents}
          />
        )}

        {/* Admin Management Modal */}
        {isAdminModalOpen && selectedEventForAdmins && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Manage Event Admins</h2>
                <p className="text-gray-600 mb-4">Event: {selectedEventForAdmins.title}</p>
                
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Select Admins</label>
                  <div className="max-h-60 overflow-y-auto border rounded-lg p-2">
                    {users.filter(user => user.id !== selectedEventForAdmins.ownerId).map(user => (
                      <div key={user.id} className="flex items-center p-2 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          id={`user-${user.id}`}
                          checked={selectedAdminIds.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAdminIds([...selectedAdminIds, user.id]);
                            } else {
                              setSelectedAdminIds(selectedAdminIds.filter(id => id !== user.id));
                            }
                          }}
                          className="mr-2"
                        />
                        <label htmlFor={`user-${user.id}`} className="flex-1 cursor-pointer">
                          <span className="font-medium">{user.name || user.username}</span>
                          {user.email && <span className="text-sm text-gray-500 ml-2">({user.email})</span>}
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded ml-2">{user.role}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    onClick={() => setIsAdminModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAdmins}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

type EventModalProps = {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  users: User[];
  onEventSaved: () => void;
};

function EventModal({ isOpen, onClose, event, users, onEventSaved }: EventModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    startDate: '',
    endDate: '',
    imageUrl: '',
    status: 'draft',
    slug: '',
    ownerId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description || '',
        location: event.location || '',
        startDate: new Date(event.startDate).toISOString().split('T')[0],
        endDate: new Date(event.endDate).toISOString().split('T')[0],
        imageUrl: event.imageUrl || '',
        status: event.status,
        slug: event.slug || '',
        ownerId: event.ownerId,
      });
    } else {
      // Default values for new event
      setFormData({
        title: '',
        description: '',
        location: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
        imageUrl: '',
        status: 'draft',
        slug: '',
        ownerId: users.length > 0 ? users[0].id : '',
      });
    }
  }, [event, users]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const url = event
        ? `/api/superadmin/events/${event.id}`
        : '/api/superadmin/events';
      
      const method = event ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save event');
      }

      onClose();
      onEventSaved();
    } catch (error) {
      console.error('Error saving event:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">{event ? 'Edit Event' : 'Create Event'}</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full p-2 border rounded-lg"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Slug</label>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg"
                placeholder="unique-event-url"
              />
              <p className="text-xs text-gray-500 mt-1">Used for URL: /event-slug</p>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 mb-2">Start Date *</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">End Date *</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Image URL</label>
              <input
                type="url"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg"
                placeholder="https://example.com/image.jpg"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Status *</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full p-2 border rounded-lg"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Owner *</label>
              <select
                name="ownerId"
                value={formData.ownerId}
                onChange={handleChange}
                required
                className="w-full p-2 border rounded-lg"
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.username} ({user.role})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-green-300"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Event'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
