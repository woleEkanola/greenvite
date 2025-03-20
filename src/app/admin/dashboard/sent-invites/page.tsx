'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import Swal from 'sweetalert2'
import DataTable from '@/components/DataTable'
import { Search, RefreshCw, CheckCircle, XCircle, Mail, Phone, Trash2, Edit } from 'lucide-react'

interface SentInvite {
  id: string
  name: string
  email: string | null
  phone: string | null
  code: string | null
  sentAt: string
  type: string
  status: string
  emailStatus: string | null
  smsStatus: string | null
  hasRsvp: boolean
  rsvpDetails: {
    id: string
    name: string
    email: string
    hasGuest: boolean
    hasDriver: boolean
    hasAide: boolean
    createdAt: string
  } | null
}

export default function SentInvitesPage() {
  const [invites, setInvites] = useState<SentInvite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const fetchInvites = async (page = 1, search = '') => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/admin/sent-invites?page=${page}&limit=10${search ? `&search=${encodeURIComponent(search)}` : ''}`
      )
      
      if (response.ok) {
        const data = await response.json()
        setInvites(data.invites)
        setTotalPages(data.pagination.totalPages)
        setTotalItems(data.pagination.total)
        setCurrentPage(data.pagination.page)
      } else {
        throw new Error('Failed to fetch invites')
      }
    } catch (error) {
      console.error('Error fetching invites:', error)
      Swal.fire('Error', 'Failed to fetch sent invites', 'error')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchInvites(currentPage, searchTerm)
  }, [currentPage])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1) // Reset to first page
    fetchInvites(1, searchTerm)
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchInvites(currentPage, searchTerm)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleDeleteInvite = async (id: string, name: string) => {
    // Confirm deletion
    const result = await Swal.fire({
      title: 'Delete Invite',
      text: `Are you sure you want to delete the invite sent to ${name}? This will also make the registration code available again.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });
    
    if (result.isConfirmed) {
      setIsDeleting(true);
      try {
        const response = await fetch(`/api/admin/invites/${id}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          Swal.fire({
            title: 'Deleted!',
            text: `Invite to ${name} has been deleted and the registration code is now available.`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
          });
          
          // Update the local state to remove the deleted invite
          setInvites(prevInvites => prevInvites.filter(invite => invite.id !== id));
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete invite');
        }
      } catch (error) {
        console.error('Error deleting invite:', error);
        Swal.fire('Error', error instanceof Error ? error.message : 'Failed to delete invite', 'error');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleUpdateStatus = async (id: string, name: string, currentStatus: string) => {
    // Show status update modal
    const { value: newStatus } = await Swal.fire({
      title: 'Update Invite Status',
      text: `Current status: ${currentStatus}`,
      input: 'select',
      inputOptions: {
        'pending': 'Pending',
        'sent': 'Sent',
        'failed': 'Failed',
        'partial': 'Partial',
        'canceled': 'Canceled'
      },
      inputValue: currentStatus,
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'You need to select a status!';
        }
      }
    });
    
    if (newStatus) {
      setIsUpdating(true);
      try {
        const response = await fetch(`/api/admin/invites/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        });
        
        if (response.ok) {
          const data = await response.json();
          Swal.fire({
            title: 'Updated!',
            text: `Invite status for ${name} has been updated to ${newStatus}.`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
          });
          
          // Update the local state to reflect the change
          setInvites(prevInvites => 
            prevInvites.map(invite => 
              invite.id === id 
                ? { ...invite, status: newStatus } 
                : invite
            )
          );
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update status');
        }
      } catch (error) {
        console.error('Error updating invite status:', error);
        Swal.fire('Error', error instanceof Error ? error.message : 'Failed to update invite status', 'error');
      } finally {
        setIsUpdating(false);
      }
    }
  };

  // Define table columns
  const columns = [
    {
      header: 'Name',
      accessor: 'name' as keyof SentInvite,
      searchable: true
    },
    {
      header: 'Contact',
      accessor: (invite: SentInvite) => (
        <div className="flex flex-col space-y-1">
          {invite.email && (
            <div className="flex items-center text-xs">
              <Mail className="h-3 w-3 mr-1" />
              <span>{invite.email}</span>
            </div>
          )}
          {invite.phone && (
            <div className="flex items-center text-xs">
              <Phone className="h-3 w-3 mr-1" />
              <span>{invite.phone}</span>
            </div>
          )}
        </div>
      ),
      searchable: false
    },
    {
      header: 'Code',
      accessor: (invite: SentInvite) => {
        return (
          <div className="flex flex-col">
            <span className="font-medium">{invite.code || 'N/A'}</span>
            <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded mt-1 inline-block">
              Assigned to invite
            </span>
          </div>
        );
      },
      searchable: true
    },
    {
      header: 'Sent Via',
      accessor: (invite: SentInvite) => {
        let typeText = '';
        let typeClass = '';
        
        switch (invite.type) {
          case 'email':
            typeText = 'Email';
            typeClass = 'bg-blue-100 text-blue-800';
            break;
          case 'sms':
            typeText = 'SMS';
            typeClass = 'bg-purple-100 text-purple-800';
            break;
          case 'both':
            typeText = 'Email & SMS';
            typeClass = 'bg-indigo-100 text-indigo-800';
            break;
          default:
            typeText = invite.type;
            typeClass = 'bg-gray-100 text-gray-800';
        }
        
        return (
          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${typeClass}`}>
            {typeText}
          </span>
        );
      },
      searchable: false
    },
    {
      header: 'Sent At',
      accessor: (invite: SentInvite) => (
        format(new Date(invite.sentAt), 'MMM d, yyyy h:mm a')
      ),
      searchable: false
    },
    {
      header: 'RSVP Status',
      accessor: (invite: SentInvite) => {
        if (invite.hasRsvp) {
          return (
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-700 font-medium">Confirmed</span>
            </div>
          );
        } else {
          return (
            <div className="flex items-center">
              <XCircle className="h-4 w-4 text-gray-400 mr-1" />
              <span className="text-gray-500">Pending</span>
            </div>
          );
        }
      },
      searchable: false
    },
    {
      header: 'RSVP Details',
      accessor: (invite: SentInvite) => {
        if (!invite.hasRsvp || !invite.rsvpDetails) return 'N/A';
        
        const details = invite.rsvpDetails;
        return (
          <div className="text-xs space-y-1">
            <div><span className="font-semibold">Name:</span> {details.name}</div>
            <div><span className="font-semibold">Email:</span> {details.email}</div>
            <div className="flex space-x-2">
              {details.hasGuest && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">+Guest</span>
              )}
              {details.hasDriver && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">+Driver</span>
              )}
              {details.hasAide && (
                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">+Aide</span>
              )}
            </div>
            <div><span className="font-semibold">RSVP Date:</span> {format(new Date(details.createdAt), 'MMM d, yyyy')}</div>
          </div>
        );
      },
      searchable: false
    },
    {
      header: 'Actions',
      accessor: (invite: SentInvite) => {
        return (
          <div className="flex space-x-2">
            <button
              onClick={() => handleUpdateStatus(invite.id, invite.name, invite.status)}
              disabled={isUpdating || isDeleting}
              className="text-blue-600 hover:text-blue-900 p-1 rounded"
              title="Update Status"
            >
              <Edit className="h-4 w-4" />
            </button>
            
            <button
              onClick={() => handleDeleteInvite(invite.id, invite.name)}
              disabled={isUpdating || isDeleting}
              className="text-red-600 hover:text-red-900 p-1 rounded"
              title="Delete Invite"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
      searchable: false
    }
  ];

  if (isLoading && !isRefreshing) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-light text-gray-800">Sent Invites</h1>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`flex items-center px-3 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors ${
            isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="flex items-center space-x-2">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, email, or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors"
        >
          Search
        </button>
      </form>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        {totalItems > 0 ? (
          <p>Showing {invites.length} of {totalItems} sent invites</p>
        ) : (
          <p>No sent invites found</p>
        )}
      </div>

      {/* Data Table */}
      <DataTable
        data={invites}
        columns={columns}
        itemsPerPage={10}
        searchPlaceholder="Filter results..."
        emptyMessage="No sent invites found"
        useServerPagination={true}
        serverPaginationInfo={{
          currentPage,
          totalPages,
          totalItems,
          onPageChange: handlePageChange,
        }}
      />
    </div>
  );
}
