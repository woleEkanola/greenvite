'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import { Download, Search, Send } from 'lucide-react'
import DataTable from '@/components/DataTable'
import debounce from 'lodash/debounce'

interface Rsvp {
  id: string
  name: string
  email: string
  hasGuest: boolean
  hasDriver: boolean
  hasAide: boolean
  createdAt: string
  registrationCode?: {
    code: string
  }
}

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function RsvpsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [rsvps, setRsvps] = useState<Rsvp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  })
  const [search, setSearch] = useState('')
  const [selectedRsvps, setSelectedRsvps] = useState<string[]>([])
  const [exporting, setExporting] = useState(false)

  // Fetch RSVPs
  const fetchRsvps = useCallback(async (searchTerm?: string, page: number = 1) => {
    if (status === 'loading') return
    if (!session) {
      router.push('/admin')
      return
    }

    try {
      setLoading(true)
      const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(searchTerm && { search: searchTerm })
      })

      const response = await fetch(`/api/admin/rsvps?${searchParams.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch RSVPs')

      const data = await response.json()
      if (!data.success) throw new Error(data.error)

      setRsvps(data.rsvps)
      setPagination(data.pagination)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch RSVPs')
      setRsvps([])
    } finally {
      setLoading(false)
    }
  }, [session, router, pagination.limit, status])

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

      const response = await fetch(`/api/admin/rsvps/export?${searchParams.toString()}`)
      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rsvps-${new Date().toISOString()}.${format}`
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
      header: 'Type',
      accessor: (rsvp: Rsvp) => (
        <div className="flex gap-1">
          <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-800">
            Guest
          </span>
          {rsvp.hasDriver && (
            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
              Driver
            </span>
          )}
          {rsvp.hasAide && (
            <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
              Aide
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Date',
      accessor: (rsvp: Rsvp) => formatDate(rsvp.createdAt),
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
          onClick={() => router.push('/admin/dashboard/tables/new')}
          className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 transition-colors"
        >
          New Table
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
      <h1 className="text-2xl font-semibold mb-6">RSVP Management</h1>
      
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
