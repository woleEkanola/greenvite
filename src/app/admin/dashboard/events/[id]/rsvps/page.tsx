'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import { Download, Search, Send, UserPlus, UserMinus, Edit, Users, Table2 } from 'lucide-react'
import DataTable from '@/components/DataTable'
import debounce from 'lodash/debounce'
import toast from 'react-hot-toast'

interface Rsvp {
  id: string
  name: string
  email: string
  phone: string
  hasGuest: boolean
  hasDriver: boolean
  hasAide: boolean
  createdAt: string
  registrationCode?: {
    code: string
  }
  accessCodes?: AccessCode[]
}

interface AccessCode {
  id: string
  name: string
  code: string
  type: string
  isSent: boolean
  sentAt: string | null
}

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function EventRsvpsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [rsvps, setRsvps] = useState<Rsvp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [event, setEvent] = useState<any>(null)
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  })
  const [search, setSearch] = useState('')
  const [selectedRsvps, setSelectedRsvps] = useState<string[]>([])
  const [exporting, setExporting] = useState(false)
  const [managingRsvp, setManagingRsvp] = useState<Rsvp | null>(null)
  const [processingAction, setProcessingAction] = useState(false)
  const [tables, setTables] = useState<any[]>([])
  const [assigningTables, setAssigningTables] = useState(false)
  const [summary, setSummary] = useState({
    totalInvitees: 0,
    totalPrimary: 0,
    totalGuests: 0,
    totalDrivers: 0,
    totalAides: 0
  })

  // Fetch event data
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/admin/events/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setEvent(data)
        } else {
          console.error('Failed to fetch event')
          toast.error('Failed to fetch event details')
        }
      } catch (error) {
        console.error('Error:', error)
        toast.error('An error occurred while fetching event data')
      }
    }

    fetchEvent()
    
    // Fetch tables
    const fetchTables = async () => {
      try {
        const response = await fetch(`/api/admin/events/${params.id}/tables`)
        if (response.ok) {
          const data = await response.json()
          setTables(data.tables || [])
        } else {
          console.error('Failed to fetch tables')
        }
      } catch (error) {
        console.error('Error fetching tables:', error)
      }
    }
    
    fetchTables()
  }, [params.id])

  // Fetch RSVPs
  const fetchRsvps = useCallback(async (searchTerm?: string, page: number = 1) => {
    try {
      setLoading(true)
      const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(searchTerm && { search: searchTerm })
      })

      const response = await fetch(`/api/admin/events/${params.id}/rsvps?${searchParams.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch RSVPs')

      const data = await response.json()
      if (!data.success) throw new Error(data.error)

      setRsvps(data.rsvps)
      setPagination({
        total: data.stats.total,
        page,
        limit: pagination.limit,
        totalPages: Math.ceil(data.stats.total / pagination.limit)
      })
      
      // Fetch summary data
      fetchSummary()
      
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch RSVPs')
      setRsvps([])
    } finally {
      setLoading(false)
    }
  }, [pagination.limit, params.id])

  // Fetch summary data
  const fetchSummary = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/events/${params.id}/rsvps/summary`)
      if (!response.ok) throw new Error('Failed to fetch summary data')

      const data = await response.json()
      if (!data.success) throw new Error(data.error)

      setSummary({
        totalInvitees: data.totalInvitees || 0,
        totalPrimary: data.totalPrimary || 0,
        totalGuests: data.totalGuests || 0,
        totalDrivers: data.totalDrivers || 0,
        totalAides: data.totalAides || 0
      })
    } catch (error) {
      console.error('Error fetching summary data:', error)
      // Don't show error toast for summary as it's not critical
    }
  }, [params.id])

  // Fetch a single RSVP to ensure data consistency
  const fetchSingleRsvp = useCallback(async (rsvpId: string) => {
    try {
      const response = await fetch(`/api/admin/events/${params.id}/rsvps/${rsvpId}`)
      if (!response.ok) throw new Error('Failed to fetch RSVP details')

      const data = await response.json()
      if (!data.success) throw new Error(data.error)

      // Update the RSVP in the local state with the fresh data from the server
      setRsvps(prevRsvps => {
        // Create a new array to trigger a re-render
        return prevRsvps.map(r => {
          if (r.id === data.rsvp.id) {
            // Return the updated RSVP from the server
            return data.rsvp;
          }
          return r;
        });
      });

      return data.rsvp
    } catch (error) {
      console.error('Error fetching RSVP details:', error)
      toast.error('Failed to refresh RSVP data')
      return null
    }
  }, [params.id])

  // Initial fetch
  useEffect(() => {
    fetchRsvps()
  }, [fetchRsvps])

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      fetchRsvps(value, 1)
    }, 500),
    [fetchRsvps]
  )

  // Handle page change
  const handlePageChange = (newPage: number) => {
    fetchRsvps(search, newPage)
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  // Handle export
  const handleExportRsvps = async (format: 'csv' | 'pdf') => {
    setExporting(true)
    try {
      // Create URL with search parameters
      const searchParams = new URLSearchParams({
        format,
        ...(search && { search })
      })

      const response = await fetch(`/api/admin/events/${params.id}/rsvps/export?${searchParams.toString()}`)
      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rsvps-${format === 'csv' ? 'csv' : 'pdf'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Export Failed',
        text: err instanceof Error ? err.message : 'Failed to export RSVPs'
      })
    } finally {
      setExporting(false)
    }
  }

  // Handle managing guests for a primary attendee
  const handleManageGuests = (rsvp: Rsvp) => {
    setManagingRsvp(rsvp)
    
    // Find primary access code and dependent codes
    const primaryCode = rsvp.accessCodes?.find(code => code.type === 'primary')
    const dependentCodes = rsvp.accessCodes?.filter(code => code.type !== 'primary') || []
    
    // Create HTML for the guest list
    const guestListHtml = dependentCodes.length > 0 
      ? dependentCodes.map(code => `
          <div class="flex justify-between items-center p-3 border-b">
            <div>
              <p class="font-medium">${code.name}</p>
              <p class="text-sm text-gray-500">Code: ${code.code}</p>
            </div>
            <button 
              class="remove-guest-btn px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700" 
              data-code-id="${code.id}"
              data-rsvp-id="${rsvp.id}"
              data-dependent-type="${code.type}"
            >
              Remove
            </button>
          </div>
        `).join('')
      : '<p class="text-center py-4 text-gray-500">No dependent guests found</p>';
    
    // Show modal with guest management options
    Swal.fire({
      title: `Manage Guests for ${rsvp.name}`,
      html: `
        <div class="mb-4">
          <p class="text-sm font-medium text-gray-700 mb-1">Primary Attendee:</p>
          <div class="p-3 bg-gray-50 rounded-md">
            <p class="font-medium">${rsvp.name}</p>
            <p class="text-sm text-gray-500">Email: ${rsvp.email || 'N/A'}</p>
            <p class="text-sm text-gray-500">Phone: ${rsvp.phone || 'N/A'}</p>
            <p class="text-sm text-gray-500">Code: ${primaryCode?.code || 'N/A'}</p>
          </div>
        </div>
        
        <div class="mb-4">
          <div class="flex justify-between items-center mb-2">
            <p class="text-sm font-medium text-gray-700">Accompanying Guests:</p>
            <button 
              id="add-guest-btn" 
              class="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center"
              data-rsvp-id="${rsvp.id}"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="16" y1="11" x2="22" y2="11"></line></svg>
              Add Guest
            </button>
          </div>
          <div id="guest-list" class="border rounded-md max-h-60 overflow-y-auto">
            ${guestListHtml}
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Done',
      confirmButtonColor: '#4CAF50',
      cancelButtonColor: '#9CA3AF',
      width: '600px',
      didOpen: () => {
        // Add event listener for adding a guest
        const addGuestBtn = document.getElementById('add-guest-btn')
        if (addGuestBtn) {
          addGuestBtn.addEventListener('click', () => {
            const rsvpId = addGuestBtn.getAttribute('data-rsvp-id');
            if (rsvpId) {
              // Close current modal before opening the add guest modal
              Swal.close();
              setTimeout(() => {
                handleAddGuest(rsvpId);
              }, 300);
            }
          })
        }
        
        // Add event listeners for removing guests
        const removeGuestBtns = document.querySelectorAll('.remove-guest-btn')
        removeGuestBtns.forEach(btn => {
          btn.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLButtonElement;
            const codeId = target.getAttribute('data-code-id');
            const rsvpId = target.getAttribute('data-rsvp-id');
            const dependentType = target.getAttribute('data-dependent-type');
            
            if (codeId && rsvpId && dependentType) {
              // Close current modal before opening the remove confirmation
              Swal.close();
              setTimeout(() => {
                handleRemoveGuest(codeId, rsvpId, dependentType);
              }, 300);
            }
          })
        })
      }
    }).then((result) => {
      // Reset managing RSVP when modal is closed
      if (result.isDismissed || result.isConfirmed) {
        setManagingRsvp(null);
      }
    });
  };
  
  // Handle adding a new guest
  const handleAddGuest = async (rsvpId: string) => {
    // Show form to add a new guest
    const { value: formValues, isConfirmed } = await Swal.fire({
      title: 'Add Dependent',
      html: `
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Dependent Type</label>
          <select id="guest-type" class="w-full p-2 border rounded-md">
            <option value="guest">Guest</option>
            <option value="driver">Driver</option>
            <option value="aide">Aide</option>
          </select>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Add',
      confirmButtonColor: '#4CAF50',
      cancelButtonColor: '#9CA3AF',
      preConfirm: () => {
        const dependentType = (document.getElementById('guest-type') as HTMLSelectElement).value
        
        if (!['guest', 'driver', 'aide'].includes(dependentType)) {
          Swal.showValidationMessage('Invalid dependent type')
          return false
        }
        
        return { dependentType }
      }
    })
    
    if (!isConfirmed || !formValues) return
    
    try {
      setProcessingAction(true)
      
      // Call API to update the RSVP flags
      const response = await fetch(`/api/admin/events/${params.id}/rsvps/${rsvpId}/update-dependents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dependentType: formValues.dependentType,
          action: 'add'
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add dependent')
      }
      
      const data = await response.json()
      
      // Show success message
      toast.success(`Added ${formValues.dependentType} to attendee`)
      
      // Fetch the updated RSVP from the server to ensure data consistency
      const updatedRsvp = await fetchSingleRsvp(rsvpId)
      
      // If we have the updated RSVP and we're managing it, refresh the modal
      if (updatedRsvp && managingRsvp && managingRsvp.id === updatedRsvp.id) {
        setManagingRsvp(updatedRsvp)
        handleManageGuests(updatedRsvp)
      }
      
      // Refresh summary data
      fetchSummary()
      
    } catch (error) {
      console.error('Error adding dependent:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to add dependent')
    } finally {
      setProcessingAction(false)
    }
  }
  
  // Handle removing a guest
  const handleRemoveGuest = async (codeId: string, rsvpId: string, dependentType: string) => {
    // Show confirmation dialog
    const result = await Swal.fire({
      title: 'Remove Dependent?',
      text: `Are you sure you want to remove this ${dependentType}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, remove it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      reverseButtons: true
    })

    if (!result.isConfirmed) return

    try {
      setProcessingAction(true)

      // Call API to update the RSVP flags
      const response = await fetch(`/api/admin/events/${params.id}/rsvps/${rsvpId}/update-dependents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dependentType,
          action: 'remove'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove dependent')
      }

      const data = await response.json()

      // Show success message
      toast.success(`Removed ${dependentType} from attendee`)

      // Fetch the updated RSVP from the server to ensure data consistency
      const updatedRsvp = await fetchSingleRsvp(rsvpId)

      // If we have the updated RSVP and we're managing it, refresh the modal
      if (updatedRsvp && managingRsvp && managingRsvp.id === updatedRsvp.id) {
        setManagingRsvp(updatedRsvp)
        handleManageGuests(updatedRsvp)
      }
      
      // Refresh summary data
      fetchSummary()

    } catch (error) {
      console.error('Error removing dependent:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to remove dependent')
    } finally {
      setProcessingAction(false)
    }
  }

  // Handle auto-assigning tables
  const handleAutoAssignTables = async () => {
    // Get all RSVPs with access codes
    const rsvpsWithCodes = rsvps.filter(rsvp => rsvp.accessCodes && rsvp.accessCodes.length > 0)
    
    if (rsvpsWithCodes.length === 0) {
      toast.error('No RSVPs with access codes found. Generate access codes first.')
      return
    }
    
    // Show modal to configure auto-assignment
    const { value: formValues, isConfirmed } = await Swal.fire({
      title: 'Auto-Assign Tables',
      html: `
        <div class="text-left">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Select Tables</label>
            <div class="flex items-center mb-2">
              <input type="checkbox" id="select-all-tables" class="mr-2">
              <label for="select-all-tables" class="text-sm font-medium">Select All Tables</label>
            </div>
            <div class="max-h-40 overflow-y-auto border rounded p-2">
              ${tables.map(table => `
                <div class="flex items-center mb-2">
                  <input type="checkbox" id="table-${table.id}" name="tables" value="${table.id}" class="mr-2 table-checkbox">
                  <label for="table-${table.id}" class="text-sm">
                    ${table.name} (${table.accessCodes?.length || 0}/${table.capacity})
                  </label>
                </div>
              `).join('')}
            </div>
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Keep Groups Together</label>
            <div class="flex items-center">
              <input type="checkbox" id="keep-groups" name="keepGroups" checked class="mr-2">
              <label for="keep-groups" class="text-sm">Keep primary attendees with their guests on the same table</label>
            </div>
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Include Attendee Types</label>
            <div class="flex flex-wrap gap-2">
              <div class="flex items-center">
                <input type="checkbox" id="type-primary" name="types" value="primary" checked class="mr-1">
                <label for="type-primary" class="text-sm">Primary</label>
              </div>
              <div class="flex items-center">
                <input type="checkbox" id="type-guest" name="types" value="guest" checked class="mr-1">
                <label for="type-guest" class="text-sm">Guest</label>
              </div>
              <div class="flex items-center">
                <input type="checkbox" id="type-driver" name="types" value="driver" checked class="mr-1">
                <label for="type-driver" class="text-sm">Driver</label>
              </div>
              <div class="flex items-center">
                <input type="checkbox" id="type-aide" name="types" value="aide" checked class="mr-1">
                <label for="type-aide" class="text-sm">Aide</label>
              </div>
            </div>
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Assignment Options</label>
            <div class="flex items-center">
              <input type="checkbox" id="only-unassigned" name="onlyUnassigned" checked class="mr-2">
              <label for="only-unassigned" class="text-sm">Only assign attendees without a table</label>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Assign Tables',
      confirmButtonColor: '#4CAF50',
      cancelButtonColor: '#9CA3AF',
      didOpen: () => {
        // Add functionality for "Select All" checkbox
        const selectAllCheckbox = document.getElementById('select-all-tables') as HTMLInputElement;
        const tableCheckboxes = document.querySelectorAll('.table-checkbox') as NodeListOf<HTMLInputElement>;
        
        // Function to update "Select All" state based on individual checkboxes
        const updateSelectAllCheckbox = () => {
          const allChecked = Array.from(tableCheckboxes).every(checkbox => checkbox.checked);
          const someChecked = Array.from(tableCheckboxes).some(checkbox => checkbox.checked);
          
          selectAllCheckbox.checked = allChecked;
          selectAllCheckbox.indeterminate = someChecked && !allChecked;
        };
        
        // Handle "Select All" checkbox click
        selectAllCheckbox.addEventListener('change', () => {
          const isChecked = selectAllCheckbox.checked;
          tableCheckboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
          });
        });
        
        // Handle individual checkbox clicks
        tableCheckboxes.forEach(checkbox => {
          checkbox.addEventListener('change', updateSelectAllCheckbox);
        });
      },
      preConfirm: () => {
        const tableCheckboxes = document.querySelectorAll('.table-checkbox') as NodeListOf<HTMLInputElement>;
        
        const selectedTables = Array.from(tableCheckboxes).filter(checkbox => checkbox.checked).map(
          (el) => el.value
        );
        
        if (selectedTables.length === 0) {
          Swal.showValidationMessage('Please select at least one table');
          return false;
        }
        
        const selectedTypes = Array.from(document.querySelectorAll('input[name="types"]:checked')).map(
          (el) => (el as HTMLInputElement).value
        );
        
        if (selectedTypes.length === 0) {
          Swal.showValidationMessage('Please select at least one attendee type');
          return false;
        }
        
        return {
          tableIds: selectedTables,
          keepGroupsTogether: (document.getElementById('keep-groups') as HTMLInputElement).checked,
          includeTypes: selectedTypes,
          onlyUnassigned: (document.getElementById('only-unassigned') as HTMLInputElement).checked
        };
      }
    });
    
    if (!isConfirmed || !formValues) return;
    
    try {
      setAssigningTables(true);
      
      // Call the API to auto-assign tables
      const response = await fetch(`/api/admin/events/${params.id}/access-codes/auto-assign-tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formValues)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to auto-assign tables');
      }
      
      const data = await response.json();
      
      // Show success message
      Swal.fire({
        title: 'Tables Assigned',
        html: `
          <p>${data.message}</p>
          <div class="mt-4 text-left">
            <h3 class="font-medium mb-2">Table Assignments:</h3>
            <div class="max-h-60 overflow-y-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr>
                    <th class="text-left py-2">Table</th>
                    <th class="text-right py-2">Assigned</th>
                    <th class="text-right py-2">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.tableAssignments.map((table: any) => `
                    <tr>
                      <td class="py-1">${table.name}</td>
                      <td class="text-right py-1">${table.finalOccupancy}/${table.initialCapacity}</td>
                      <td class="text-right py-1">${table.remainingCapacity}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `,
        icon: 'success'
      });
      
      // Refresh the RSVPs to show the new table assignments
      fetchRsvps(search, pagination.page);
      
    } catch (error) {
      console.error('Error auto-assigning tables:', error);
      Swal.fire({
        title: 'Error',
        text: error instanceof Error ? error.message : 'Failed to auto-assign tables',
        icon: 'error'
      });
    } finally {
      setAssigningTables(false);
    }
  };

  // Table columns
  const columns = [
    {
      header: 'Name',
      accessor: 'name' as keyof Rsvp,
      searchable: true,
    },
    {
      header: 'Email',
      accessor: 'email' as keyof Rsvp,
      searchable: true,
    },
    {
      header: 'Code',
      accessor: (rsvp: Rsvp) => rsvp.registrationCode?.code || '-',
      searchable: true,
    },
    {
      header: 'Coming With',
      accessor: (rsvp: Rsvp) => {
        // Create an array to hold the dependent types
        const dependents = [];
        
        // Add each dependent type if present
        if (rsvp.hasGuest) dependents.push(
          <span key="guest" className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-800">
            Guest
          </span>
        );
        
        if (rsvp.hasDriver) dependents.push(
          <span key="driver" className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
            Driver
          </span>
        );
        
        if (rsvp.hasAide) dependents.push(
          <span key="aide" className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
            Aide
          </span>
        );
        
        // If no dependents, show "None"
        if (dependents.length === 0) {
          return <span className="text-gray-500">None</span>;
        }
        
        // Return the flex container with all dependent types
        return (
          <div className="flex flex-wrap gap-1">
            {dependents}
          </div>
        );
      },
    },
    {
      header: 'Date',
      accessor: (rsvp: Rsvp) => formatDate(rsvp.createdAt),
    },
    {
      header: 'Actions',
      accessor: (rsvp: Rsvp) => (
        <div className="flex space-x-2 justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleManageGuests(rsvp);
            }}
            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full"
            title="Manage Guests"
          >
            <Users size={18} />
          </button>
        </div>
      ),
    },
  ]

  // Custom header with search and export buttons
  const customHeader = (
    <div className="flex justify-between items-center mb-6">
      <div className="relative flex-1 max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search RSVPs by name, email, or code..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            debouncedSearch(e.target.value)
          }}
          className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div className="flex gap-2 ml-4">
        <button
          onClick={handleAutoAssignTables}
          disabled={loading || assigningTables}
          className="inline-flex items-center px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-md hover:bg-amber-700 disabled:bg-amber-300 transition-colors"
        >
          <Table2 className="h-4 w-4 mr-2" />
          {assigningTables ? 'Assigning...' : 'Auto-Assign Tables'}
        </button>
        <button
          onClick={() => router.push(`/admin/dashboard/events/${params.id}/tables`)}
          className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 transition-colors"
        >
          Manage Tables
        </button>
        <button
          onClick={() => handleExportRsvps('csv')}
          disabled={rsvps.length === 0 || exporting}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:bg-gray-300"
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </button>
      </div>
    </div>
  )

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">
        {event?.title ? `RSVPs for ${event.title}` : 'Event RSVPs'}
      </h1>
      
      {/* Summary Section */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <h2 className="text-lg font-medium mb-3 text-gray-700">Attendee Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
            <p className="text-sm text-emerald-700 font-medium">Total Invitees</p>
            <p className="text-2xl font-bold text-emerald-800">{summary.totalInvitees}</p>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
            <p className="text-sm text-blue-700 font-medium">Primary Attendees</p>
            <p className="text-2xl font-bold text-blue-800">{summary.totalPrimary}</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
            <p className="text-sm text-purple-700 font-medium">Guests</p>
            <p className="text-2xl font-bold text-purple-800">{summary.totalGuests}</p>
          </div>
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
            <p className="text-sm text-amber-700 font-medium">Drivers</p>
            <p className="text-2xl font-bold text-amber-800">{summary.totalDrivers}</p>
          </div>
          <div className="bg-pink-50 p-3 rounded-lg border border-pink-100">
            <p className="text-sm text-pink-700 font-medium">Aides</p>
            <p className="text-2xl font-bold text-pink-800">{summary.totalAides}</p>
          </div>
        </div>
      </div>
      
      <DataTable
        data={rsvps}
        columns={columns}
        itemsPerPage={pagination.limit}
        useServerPagination
        serverPaginationInfo={{
          currentPage: pagination.page,
          totalPages: pagination.totalPages,
          totalItems: pagination.total,
          onPageChange: handlePageChange
        }}
        customHeader={customHeader}
        emptyMessage={loading ? "Loading..." : "No RSVPs found"}
        className="bg-white rounded-lg shadow"
      />
    </div>
  )
}
