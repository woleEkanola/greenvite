'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, TrashIcon, LinkIcon, CheckIcon } from '@heroicons/react/24/outline';
import ImageUpload from '@/components/ImageUpload';

type User = {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  role: string;
};

type Event = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startDate: string;
  endDate: string;
  imageUrl: string | null;
  status: string;
  slug: string | null;
  ownerId: string;
  admins: Array<{
    id: string;
    userId: string;
    user: User;
  }>;
};

export default function EditEventPage({ params }: { params: { id: string } }) {
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    startDate: '',
    endDate: '',
    imageUrl: '',
    status: 'draft',
    slug: '',
    adminIds: [] as string[],
    ownerId: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentAdmins, setCurrentAdmins] = useState<User[]>([]);
  const router = useRouter();
  const { id } = params;

  useEffect(() => {
    fetchEventData();
    fetchUsers();
    fetchCurrentUser();
  }, [id]);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/admin/users/me');
      if (!response.ok) {
        throw new Error('Failed to fetch current user');
      }
      const user = await response.json();
      setCurrentUser(user);
      setIsSuperAdmin(
        user.role === 'SUPERADMIN' || 
        user.role === 'superadmin'
      );
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchEventData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/events/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch event');
      }
      const event: Event = await response.json();
      
      // Format dates for datetime-local input
      const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toISOString().slice(0, 16);
      };

      // Filter out superadmins from the admins list
      const admins = event.admins
        .map(admin => admin.user)
        .filter(user => 
          user.id !== event.ownerId && 
          user.role !== 'SUPERADMIN' && 
          user.role !== 'superadmin'
        );
      setCurrentAdmins(admins);

      setFormData({
        title: event.title,
        description: event.description || '',
        location: event.location || '',
        startDate: formatDate(event.startDate),
        endDate: formatDate(event.endDate),
        imageUrl: event.imageUrl || '',
        status: event.status,
        slug: event.slug || '',
        adminIds: event.admins.map(admin => admin.userId),
        ownerId: event.ownerId,
      });
    } catch (error) {
      console.error('Error fetching event:', error);
      setError('Failed to load event data');
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdminChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        adminIds: [...prev.adminIds, value],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        adminIds: prev.adminIds.filter((adminId) => adminId !== value),
      }));
    }
  };

  const handleRemoveAdmin = (userId: string) => {
    // Remove admin from the list
    setCurrentAdmins(prevAdmins => prevAdmins.filter(admin => admin.id !== userId));
    
    // Update adminIds in formData
    setFormData(prev => ({
      ...prev,
      adminIds: prev.adminIds.filter(id => id !== userId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Validate form data
      if (!formData.title) {
        throw new Error('Title is required');
      }
      if (!formData.startDate) {
        throw new Error('Start date is required');
      }
      if (!formData.endDate) {
        throw new Error('End date is required');
      }

      // Update the event
      const response = await fetch(`/api/admin/events/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          startDate: new Date(formData.startDate).toISOString(),
          endDate: new Date(formData.endDate).toISOString(),
          ...(isSuperAdmin && { ownerId: formData.ownerId }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update event');
      }

      // Update event admins
      const adminsResponse = await fetch(`/api/admin/events/${id}/admins`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminIds: formData.adminIds,
        }),
      });

      if (!adminsResponse.ok) {
        const errorData = await adminsResponse.json();
        throw new Error(errorData.error || 'Failed to update event admins');
      }

      setSuccess('Event updated successfully');
      // Redirect to events page after a short delay
      setTimeout(() => {
        router.push('/admin/dashboard/events');
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading event data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/admin/dashboard/events" className="inline-flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Events
        </Link>
        <h1 className="text-2xl font-bold mt-2">Edit Event</h1>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p>{success}</p>
          {formData.slug && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-green-800">RSVP Page:</span>
              <code className="text-xs bg-green-50 px-2 py-1 rounded border border-green-200">
                {typeof window !== 'undefined' ? window.location.origin : ''}/events/{formData.slug}
              </code>
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/events/${formData.slug}`;
                  navigator.clipboard.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="inline-flex items-center gap-1 text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
              >
                {copied ? <CheckIcon className="h-3 w-3" /> : <LinkIcon className="h-3 w-3" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="col-span-2">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title *
            </label>
            <input
              type="text"
              name="title"
              id="title"
              className="mt-1 focus:ring-green-500 focus:border-green-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              id="description"
              rows={3}
              className="mt-1 focus:ring-green-500 focus:border-green-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Location
            </label>
            <input
              type="text"
              name="location"
              id="location"
              className="mt-1 focus:ring-green-500 focus:border-green-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              value={formData.location}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
              Slug
            </label>
            <input
              type="text"
              name="slug"
              id="slug"
              className="mt-1 focus:ring-green-500 focus:border-green-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              value={formData.slug}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
              Start Date & Time *
            </label>
            <input
              type="datetime-local"
              name="startDate"
              id="startDate"
              className="mt-1 focus:ring-green-500 focus:border-green-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              value={formData.startDate}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
              End Date & Time *
            </label>
            <input
              type="datetime-local"
              name="endDate"
              id="endDate"
              className="mt-1 focus:ring-green-500 focus:border-green-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              value={formData.endDate}
              onChange={handleChange}
              required
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Event Image
            </label>
            <ImageUpload
              value={formData.imageUrl}
              onChange={(url) => setFormData((prev) => ({ ...prev, imageUrl: url }))}
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              name="status"
              id="status"
              className="mt-1 focus:ring-green-500 focus:border-green-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {isSuperAdmin && (
            <div>
              <label htmlFor="ownerId" className="block text-sm font-medium text-gray-700">
                Event Owner
              </label>
              <select
                id="ownerId"
                name="ownerId"
                value={formData.ownerId}
                onChange={handleChange}
                className="mt-1 focus:ring-green-500 focus:border-green-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              >
                <option value="">Select an owner</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.username} ({user.email})
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                As a superadmin, you can change the event owner.
              </p>
            </div>
          )}

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Admins
            </label>
            <div className="bg-gray-50 p-4 rounded-md mb-4">
              <h4 className="font-medium text-gray-700 mb-2">Current Owner</h4>
              {users.find(user => user.id === formData.ownerId) && (
                <div className="flex items-center p-3 bg-white rounded-md border border-gray-200">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500 font-medium">
                      {(users.find(user => user.id === formData.ownerId)?.name || users.find(user => user.id === formData.ownerId)?.username || 'U').charAt(0)}
                    </span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {users.find(user => user.id === formData.ownerId)?.name || users.find(user => user.id === formData.ownerId)?.username}
                    </p>
                    <p className="text-xs text-gray-500">{users.find(user => user.id === formData.ownerId)?.email || 'No email'}</p>
                  </div>
                  <div className="ml-auto">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Owner
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <h4 className="font-medium text-gray-700 mb-2">Additional Admins</h4>
              {currentAdmins.length > 0 ? (
                <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md overflow-hidden max-h-60 overflow-y-auto">
                  {currentAdmins.map((admin) => (
                    <li key={admin.id} className="p-3 bg-white hover:bg-gray-50 flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
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
                        className="inline-flex items-center p-1 border border-red-300 rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        title="Remove admin"
                      >
                        <TrashIcon className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-500">No additional admins for this event</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Use the "Invite Admin" button from the events page to add new admins
                  </p>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Note: Changes to admin access will be saved when you submit the form.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Link
            href="/admin/dashboard/events"
            className="mr-3 inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
