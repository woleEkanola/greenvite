'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import DataTable from '@/components/DataTable'

interface RegCode {
  id: string
  code: string
  used: boolean
  usedBy?: string
  usedAt?: string
  status?: 'available' | 'used' | 'pending' | 'invite-sent'
}

export default function EventRegCodesPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [event, setEvent] = useState<any>(null)
  const [regCodes, setRegCodes] = useState<RegCode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [codeCount, setCodeCount] = useState(1)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  useEffect(() => {
    const fetchEventAndCodes = async () => {
      try {
        setIsLoading(true)
        
        // Fetch event details
        const eventResponse = await fetch(`/api/admin/events/${params.id}`)
        if (!eventResponse.ok) {
          throw new Error('Failed to fetch event')
        }
        const eventData = await eventResponse.json()
        setEvent(eventData)
        
        // Fetch registration codes for this event
        await fetchRegCodes()
      } catch (error) {
        console.error('Error:', error)
        Swal.fire('Error', 'Failed to load event data', 'error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchEventAndCodes()
  }, [params.id])

  const fetchRegCodes = async () => {
    try {
      const response = await fetch(`/api/admin/events/${params.id}/reg-codes`)
      if (response.ok) {
        const data = await response.json()
        setRegCodes(data)
      } else {
        throw new Error('Failed to fetch registration codes')
      }
    } catch (error) {
      console.error('Error fetching registration codes:', error)
      Swal.fire('Error', 'Failed to fetch registration codes', 'error')
    }
  }

  const handleGenerateCodes = async () => {
    if (codeCount < 1 || codeCount > 100) {
      Swal.fire('Error', 'Please enter a number between 1 and 100', 'error')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch(`/api/admin/events/${params.id}/reg-codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count: codeCount }),
      })
      
      if (response.ok) {
        const result = await response.json()
        await fetchRegCodes() // Refresh the list
        Swal.fire('Success', `Generated ${result.count} new registration codes`, 'success')
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate codes')
      }
    } catch (error) {
      console.error('Error generating codes:', error)
      Swal.fire('Error', 'Failed to generate registration codes', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDeleteCode = async (id: string, code: string) => {
    // Confirm deletion
    const result = await Swal.fire({
      title: 'Delete Registration Code',
      text: `Are you sure you want to delete code ${code}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/admin/events/${params.id}/reg-codes`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ codeId: id }),
        });
        
        if (response.ok) {
          await fetchRegCodes(); // Refresh the list
          Swal.fire('Deleted!', `Registration code ${code} has been deleted.`, 'success');
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete code');
        }
      } catch (error) {
        console.error('Error deleting code:', error);
        Swal.fire('Error', 'Failed to delete registration code', 'error');
      }
    }
  };

  // Function to update the status of a registration code
  const handleUpdateStatus = async (code: string, newStatus: 'available' | 'used' | 'pending' | 'invite-sent') => {
    try {
      setIsUpdatingStatus(true);
      
      const response = await fetch(`/api/admin/events/${params.id}/update-code-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, status: newStatus }),
      });
      
      if (response.ok) {
        const data = await response.json();
        Swal.fire({
          title: 'Success',
          text: `Registration code ${code} status updated to ${newStatus}`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });
        
        // Update the local state to reflect the change
        setRegCodes(prevCodes => 
          prevCodes.map(c => 
            c.code === code 
              ? { ...c, status: newStatus, used: newStatus === 'used' } 
              : c
          )
        );
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating code status:', error);
      Swal.fire('Error', error instanceof Error ? error.message : 'Failed to update registration code status', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Define table columns
  const columns = [
    {
      header: 'Code',
      accessor: 'code' as keyof RegCode,
      searchable: true
    },
    {
      header: 'Status',
      accessor: (code: RegCode) => {
        let statusText = 'Available';
        let colorClass = 'bg-green-100 text-green-800';
        let description = 'Available for RSVP or invites';
        
        if (code.status === 'used' || code.used) {
          statusText = 'Used';
          colorClass = 'bg-red-100 text-red-800';
          description = 'Used for RSVP';
        } else if (code.status === 'invite-sent') {
          statusText = 'Invite Sent';
          colorClass = 'bg-blue-100 text-blue-800';
          description = 'Assigned to an invitation - can be used for RSVP but not for another invite';
        } else if (code.status === 'pending') {
          statusText = 'Pending';
          colorClass = 'bg-yellow-100 text-yellow-800';
          description = 'Invitation in progress';
        }
        
        return (
          <div className="flex flex-col">
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}>
              {statusText}
            </span>
            <span className="text-xs text-gray-500 mt-1">{description}</span>
          </div>
        );
      },
      searchable: false
    },
    {
      header: 'Used By',
      accessor: 'usedBy' as keyof RegCode,
      searchable: true
    },
    {
      header: 'Used At',
      accessor: 'usedAt' as keyof RegCode,
      searchable: true
    },
    {
      header: 'Actions',
      accessor: (code: RegCode) => {
        return (
          <div className="flex space-x-2">
            {/* Status update dropdown */}
            <div className="relative inline-block text-left">
              <select
                disabled={isUpdatingStatus}
                value={code.status || 'available'}
                onChange={(e) => handleUpdateStatus(code.code, e.target.value as 'available' | 'used' | 'pending' | 'invite-sent')}
                className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm rounded-md"
              >
                <option value="available">Available</option>
                <option value="used">Used</option>
                <option value="pending">Pending</option>
                <option value="invite-sent">Invite Sent</option>
              </select>
            </div>
            
            {/* Delete button - only for available codes */}
            {code.status === 'available' && !code.used && (
              <button
                onClick={() => handleDeleteCode(code.id, code.code)}
                className="text-red-600 hover:text-red-900 px-2 py-1"
              >
                Delete
              </button>
            )}
          </div>
        );
      },
      searchable: false
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">{event?.title} - Registration Codes</h1>
          <p className="text-gray-600 mt-1">Manage registration codes for this event</p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="number"
            min="1"
            max="100"
            value={codeCount}
            onChange={(e) => setCodeCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
            className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={handleGenerateCodes}
            disabled={isGenerating}
            className={`bg-emerald-500 text-white px-4 py-2 rounded-md hover:bg-emerald-600 transition-colors
                     ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isGenerating ? 'Generating...' : 'Generate Codes'}
          </button>
        </div>
      </div>

      {regCodes.length > 0 ? (
        <DataTable 
          data={regCodes}
          columns={columns}
          itemsPerPage={10}
          searchPlaceholder="Search registration codes..."
          emptyMessage="No registration codes found"
        />
      ) : (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500 py-8">
            No registration codes found for this event. Generate some using the button above.
          </p>
        </div>
      )}
    </div>
  )
}
