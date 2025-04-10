'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Search, Download, Clock, User, Users, Table2 } from 'lucide-react'
import DataTable from '@/components/DataTable'
import debounce from 'lodash/debounce'
import toast from 'react-hot-toast'

interface Guest {
  id: string
  name: string
  code: string
  email: string | null
  phone: string | null
  type: string
  tableId: string | null
  tableName: string | null
  isAdmitted: boolean
  admittedAt: string | null
  rsvpId: string
  primaryAttendee?: string
}

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function EventGuestsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [event, setEvent] = useState<any>(null)
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  })
  const [search, setSearch] = useState('')
  const [exporting, setExporting] = useState(false)
  const [admissionFilter, setAdmissionFilter] = useState<'all' | 'gate' | 'hall'>('all')

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
  }, [params.id])

  // Fetch admitted guests
  const fetchGuests = useCallback(async (searchTerm?: string, page: number = 1) => {
    try {
      setLoading(true)
      const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        admitted: 'true', // Only fetch admitted guests
        ...(searchTerm && { search: searchTerm }),
        ...(admissionFilter !== 'all' && { admissionType: admissionFilter })
      })

      const response = await fetch(`/api/admin/events/${params.id}/access-codes?${searchParams.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch guests')

      const data = await response.json()
      if (!data.success) throw new Error(data.error)

      // Process the guests data
      const processedGuests = data.accessCodes.map((code: any) => ({
        id: code.id,
        name: code.name,
        code: code.code,
        email: code.rsvp?.email || null,
        phone: code.rsvp?.phone || null,
        type: code.type,
        tableId: code.tableId,
        tableName: code.table?.name || null,
        isAdmitted: code.isAdmitted,
        admittedAt: code.admittedAt,
        rsvpId: code.rsvpId,
        primaryAttendee: code.type !== 'primary' ? code.primaryAttendee?.name || null : null
      }))

      setGuests(processedGuests)
      setPagination({
        total: data.stats.total,
        page,
        limit: pagination.limit,
        totalPages: Math.ceil(data.stats.total / pagination.limit)
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch guests')
      setGuests([])
    } finally {
      setLoading(false)
    }
  }, [pagination.limit, params.id, admissionFilter])

  // Initial fetch
  useEffect(() => {
    fetchGuests(search, pagination.page)
  }, [fetchGuests, search, pagination.page, admissionFilter])

  // Handle search with debounce
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      fetchGuests(term, 1) // Reset to first page when searching
    }, 500),
    [fetchGuests]
  )

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    
    try {
      const date = new Date(dateString)
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      })
    } catch (error) {
      return 'Invalid Date'
    }
  }

  // Handle export
  const handleExportGuests = async (format: 'csv' | 'pdf') => {
    try {
      setExporting(true)
      
      // Build query parameters
      const queryParams = new URLSearchParams({
        format,
        admitted: 'true',
        ...(search && { search }),
        ...(admissionFilter !== 'all' && { admissionType: admissionFilter })
      })
      
      const response = await fetch(`/api/admin/events/${params.id}/access-codes/export?${queryParams.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to export guests')
      }
      
      // Handle the response based on the format
      if (format === 'csv') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `admitted-guests-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        a.remove()
      } else {
        // For PDF, usually it's a direct download
        window.location.href = `/api/admin/events/${params.id}/access-codes/export?${queryParams.toString()}`
      }
      
      toast.success(`Guests exported as ${format.toUpperCase()} successfully`)
    } catch (error) {
      console.error('Error exporting guests:', error)
      toast.error('Failed to export guests')
    } finally {
      setExporting(false)
    }
  }

  // Table columns
  const columns = [
    {
      header: 'Name',
      accessor: (guest: Guest) => (
        <div>
          <div className="font-medium">{guest.name}</div>
          <div className="text-sm text-gray-500">{guest.code}</div>
        </div>
      ),
    },
    {
      header: 'Contact',
      accessor: (guest: Guest) => (
        <div>
          {guest.email && <div className="text-sm">{guest.email}</div>}
          {guest.phone && <div className="text-sm">{guest.phone}</div>}
          {!guest.email && !guest.phone && <span className="text-gray-500">No contact info</span>}
        </div>
      ),
    },
    {
      header: 'Type',
      accessor: (guest: Guest) => {
        const typeColors: Record<string, string> = {
          primary: 'bg-blue-100 text-blue-800',
          guest: 'bg-green-100 text-green-800',
          driver: 'bg-purple-100 text-purple-800',
          aide: 'bg-amber-100 text-amber-800'
        }
        
        return (
          <div>
            <span className={`px-2 py-1 text-xs rounded-full ${typeColors[guest.type] || 'bg-gray-100 text-gray-800'}`}>
              {guest.type.charAt(0).toUpperCase() + guest.type.slice(1)}
            </span>
            {guest.primaryAttendee && (
              <div className="text-xs text-gray-500 mt-1">
                With: {guest.primaryAttendee}
              </div>
            )}
          </div>
        )
      },
    },
    {
      header: 'Table',
      accessor: (guest: Guest) => (
        <div>
          {guest.tableName ? (
            <span className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">
              {guest.tableName}
            </span>
          ) : (
            <span className="text-gray-500">Not assigned</span>
          )}
        </div>
      ),
    },
    {
      header: 'Admitted At',
      accessor: (guest: Guest) => (
        <div>
          <div className="flex items-center text-sm">
            <Clock className="h-4 w-4 mr-1 text-gray-500" />
            {formatDate(guest.admittedAt)}
          </div>
        </div>
      ),
    },
    {
      header: 'Actions',
      accessor: (guest: Guest) => (
        <div className="flex space-x-2 justify-center">
          <Link
            href={`/admin/dashboard/events/${params.id}/qr/${guest.code}`}
            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full"
            title="View Details"
          >
            <User size={18} />
          </Link>
        </div>
      ),
    },
  ]

  // Custom header with search and export buttons
  const customHeader = (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
      <div className="relative flex-1 max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search admitted guests by name, email, or code..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            debouncedSearch(e.target.value)
          }}
          className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      
      <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
        <select
          value={admissionFilter}
          onChange={(e) => setAdmissionFilter(e.target.value as 'all' | 'gate' | 'hall')}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Admitted</option>
          <option value="gate">Gate Admitted</option>
          <option value="hall">Hall Admitted</option>
        </select>
        
        <button
          onClick={() => handleExportGuests('csv')}
          disabled={guests.length === 0 || exporting}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:bg-gray-300"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href={`/admin/dashboard/events/${params.id}`} className="text-blue-600 hover:text-blue-800 flex items-center mb-2">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Event
          </Link>
          <h1 className="text-2xl font-semibold">
            {event?.title ? `Admitted Guests for ${event.title}` : 'Admitted Guests'}
          </h1>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => router.push(`/admin/dashboard/events/${params.id}/tables`)}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 transition-colors"
          >
            <Table2 className="h-4 w-4 mr-2" />
            Manage Tables
          </button>
          <button
            onClick={() => router.push(`/admin/dashboard/events/${params.id}/qr-codes`)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            <Users className="h-4 w-4 mr-2" />
            QR Codes
          </button>
        </div>
      </div>
      
      <DataTable
        data={guests}
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
        emptyMessage={loading ? "Loading..." : "No admitted guests found"}
        className="bg-white rounded-lg shadow"
      />
    </div>
  )
}
