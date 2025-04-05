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
    router.push(`/superadmin/events/edit/${event.id}`);
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
                    <Link
                      href={`/superadmin/events/edit/${event.id}`}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </Link>
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
