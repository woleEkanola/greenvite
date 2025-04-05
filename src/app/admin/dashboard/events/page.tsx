'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon, PencilIcon, TrashIcon, UserPlusIcon, UsersIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import Link from 'next/link';

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

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedEventForAdmins, setSelectedEventForAdmins] = useState<Event | null>(null);
  const [selectedEventForInvites, setSelectedEventForInvites] = useState<Event | null>(null);
  const [selectedAdminIds, setSelectedAdminIds] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchEvents();
    fetchUsers();
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/admin/users/me');
      if (!response.ok) {
        throw new Error('Failed to fetch current user');
      }
      const data = await response.json();
      setCurrentUser(data);
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/events');
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
      const response = await fetch('/api/admin/users');
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
    router.push(`/admin/dashboard/events/edit/${event.id}`);
  };

  const handleDeleteEvent = async (id: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        const response = await fetch(`/api/admin/events/${id}`, {
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
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-xl font-semibold text-gray-900">Events</h1>
            <p className="mt-2 text-sm text-gray-700">
              A list of all the events you manage
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <Link
              href="/admin/dashboard/events/create"
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:w-auto"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Event
            </Link>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
          <p className="text-gray-500">No events found. Create your first event!</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {events.map((event) => (
              <li key={event.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Link 
                        href={`/admin/dashboard/events/${event.id}`}
                        className="text-sm font-medium text-green-600 truncate hover:text-green-800 hover:underline"
                      >
                        {event.title}
                      </Link>
                      <div className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(event.status)}`}>
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Link
                        href={`/admin/dashboard/events/edit/${event.id}`}
                        className="inline-flex items-center p-1.5 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <PencilIcon className="h-4 w-4" aria-hidden="true" />
                      </Link>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="inline-flex items-center p-1.5 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <TrashIcon className="h-4 w-4" aria-hidden="true" />
                      </button>
                      {/* Only show admin management buttons to event owners */}
                      {currentUser && currentUser.id === event.ownerId && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedEventForAdmins(event);
                              setIsAdminModalOpen(true);
                            }}
                            className="inline-flex items-center p-1.5 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            title="Manage existing admins"
                          >
                            <UsersIcon className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedEventForInvites(event);
                              setIsInviteModalOpen(true);
                            }}
                            className="inline-flex items-center p-1.5 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            title="Invite new admins"
                          >
                            <UserPlusIcon className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      {event.location && (
                        <p className="flex items-center text-sm text-gray-500">
                          <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          {event.location}
                        </p>
                      )}
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      <p>
                        {format(new Date(event.startDate), 'MMM d, yyyy h:mm a')} - {format(new Date(event.endDate), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Admin Modal */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        event={selectedEventForAdmins}
        users={users}
        onAdminsUpdated={fetchEvents}
      />

      {/* Invite Admin Modal */}
      <InviteAdminModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        event={selectedEventForInvites}
        onInviteSent={fetchEvents}
      />
    </div>
  );
}

type AdminModalProps = {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  users: User[];
  onAdminsUpdated: () => void;
};

function AdminModal({ isOpen, onClose, event, users, onAdminsUpdated }: AdminModalProps) {
  const [currentAdmins, setCurrentAdmins] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (event) {
      // Filter out superadmins and the owner from the admins list
      const admins = event.admins
        .map(admin => admin.user)
        .filter(user => 
          user.id !== event.ownerId && 
          user.role !== 'SUPERADMIN' && 
          user.role !== 'superadmin'
        );
      setCurrentAdmins(admins);
    }
  }, [event]);

  const handleRemoveAdmin = async (userId: string) => {
    if (!event) return;
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Get current admin IDs excluding the one to be removed
      const updatedAdminIds = event.admins
        .map(admin => admin.userId)
        .filter(id => id !== userId);
      
      // Always include the owner
      if (!updatedAdminIds.includes(event.ownerId)) {
        updatedAdminIds.push(event.ownerId);
      }
      
      const response = await fetch(`/api/admin/events/${event.id}/admins`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminIds: updatedAdminIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update admins');
      }

      // Update the local state to reflect the change
      setCurrentAdmins(prevAdmins => prevAdmins.filter(admin => admin.id !== userId));
      setSuccess('Admin removed successfully');
      
      // Refresh the events list
      onAdminsUpdated();
    } catch (err: any) {
      console.error('Error removing admin:', err);
      setError(err.message || 'Failed to remove admin');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full max-h-[90vh] flex flex-col">
        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 flex-grow overflow-auto">
          <div className="sm:flex sm:items-start mb-4">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
              <UsersIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Manage Admins for {event?.title}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                You can remove admins who currently have access to this event.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
              {success}
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded-md mb-4">
            <h4 className="font-medium text-gray-700 mb-2">Current Owner</h4>
            <div className="flex items-center p-3 bg-white rounded-md border border-gray-200">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500 font-medium">
                  {event?.owner?.name?.charAt(0) || event?.owner?.username?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {event?.owner?.name || event?.owner?.username}
                </p>
                <p className="text-xs text-gray-500">{event?.owner?.email || 'No email'}</p>
              </div>
              <div className="ml-auto">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Owner
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-2">Current Admins</h4>
            {currentAdmins.length > 0 ? (
              <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md overflow-hidden">
                {currentAdmins.map((admin) => (
                  <li key={admin.id} className="p-4 bg-white hover:bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500 font-medium">
                          {admin.name?.charAt(0) || admin.username?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {admin.name || admin.username}
                        </p>
                        <p className="text-xs text-gray-500">{admin.email || 'No email'}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAdmin(admin.id)}
                      disabled={isLoading}
                      className="inline-flex items-center p-1.5 border border-red-300 rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                      title="Remove admin"
                    >
                      <TrashIcon className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-500">No additional admins for this event</p>
                <p className="text-xs text-gray-400 mt-1">
                  Use the "Invite Admin" button to add new admins
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

type InviteAdminModalProps = {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  onInviteSent: () => void;
};

function InviteAdminModal({ isOpen, onClose, event, onInviteSent }: InviteAdminModalProps) {
  const [emails, setEmails] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    // Split and trim emails
    const emailList = emails
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0);

    if (emailList.length === 0) {
      setError('Please enter at least one email address');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/admin/events/${event?.id}/invite-admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          emails: emailList,
          message: message.trim() 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invitations');
      }

      const data = await response.json();
      setSuccess(`Successfully sent ${data.sent} invitation${data.sent !== 1 ? 's' : ''}`);
      setEmails('');
      setMessage('');
      onInviteSent();
      
      // Close the modal after a delay
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full">
        <form onSubmit={handleSubmit}>
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Invite Admins to {event?.title}</h3>
              <p className="mt-1 text-sm text-gray-500">
                Enter email addresses separated by commas. New users will be invited to sign up.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-2 bg-red-50 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-2 bg-green-50 text-green-700 rounded-md text-sm">
                {success}
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="emails" className="block text-sm font-medium text-gray-700 mb-1">
                Email Addresses
              </label>
              <input
                type="text"
                id="emails"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder="email1@example.com, email2@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                disabled={isSubmitting}
              />
              <p className="mt-1 text-xs text-gray-500">Separate multiple emails with commas</p>
            </div>

            <div className="mb-4">
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Personal Message (Optional)
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a personal message to the invitation email"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="submit"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send Invitations'}
            </button>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
