'use client'

import { useState, useEffect, useRef, createRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, QrCode, Search, Send, Download, RefreshCw, Filter, ChevronDown, ChevronUp, Users, User } from 'lucide-react'
import QRCode from 'react-qr-code'
import Swal from 'sweetalert2'

interface AccessCode {
  id: string
  code: string
  name: string
  isAdmitted: boolean
  rsvpId: string
  tableId?: string | null
  tableName?: string | null
  email?: string | null
  phone?: string | null
  isPrimary?: boolean
  relatedCodes?: AccessCode[]
}

interface PrimaryAttendee {
  id: string
  name: string
  email: string | null
  phone: string | null
  code: string
  tableId: string | null
  tableName: string | null
  isAdmitted: boolean
  relatedCodes: AccessCode[]
  isExpanded: boolean
}

export default function QRCodesPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const eventId = params.id
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [event, setEvent] = useState<any>(null)
  const [primaryAttendees, setPrimaryAttendees] = useState<PrimaryAttendee[]>([])
  const [filteredAttendees, setFilteredAttendees] = useState<PrimaryAttendee[]>([])
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterOptions, setFilterOptions] = useState({
    admitted: 'all', // all, admitted, not_admitted
    hasTable: 'all', // all, assigned, not_assigned
  })
  const [selectAll, setSelectAll] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize] = useState(20)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch event details
        const eventResponse = await fetch(`/api/admin/events/${eventId}`)
        if (!eventResponse.ok) {
          throw new Error('Failed to fetch event details')
        }
        const eventData = await eventResponse.json()
        setEvent(eventData)

        // Fetch access codes
        const codesResponse = await fetch(`/api/admin/events/${eventId}/access-codes`)
        if (!codesResponse.ok) {
          throw new Error('Failed to fetch access codes')
        }
        const codesData = await codesResponse.json()

        // Process the access codes
        const processedCodes = codesData.accessCodes.map((code: any) => ({
          id: code.id,
          code: code.code,
          name: code.name,
          isAdmitted: code.isAdmitted,
          rsvpId: code.rsvpId,
          tableId: code.tableId,
          tableName: code.table?.name || null,
          email: code.rsvp?.email || null,
          phone: code.rsvp?.phone || null
        }))

        // Group codes by RSVP ID (which connects primary attendees with guests, aids, drivers)
        const groupedByRsvp: { [key: string]: AccessCode[] } = processedCodes.reduce((groups, code) => {
          const rsvpId = code.rsvpId;
          if (!groups[rsvpId]) {
            groups[rsvpId] = [];
          }
          groups[rsvpId].push(code);
          return groups;
        }, {});

        // Create primary attendees list
        const primaryAttendeesList: PrimaryAttendee[] = [];
        
        // Process each RSVP group
        Object.entries(groupedByRsvp).forEach(([rsvpId, group]) => {
          if (group && group.length > 0) {
            // Find the primary attendee in the group (usually the first one or the one with the RSVP)
            // We'll consider the first code in each group as the primary for simplicity
            const primaryCode = group[0];
            
            // Create a primary attendee object
            const primaryAttendee: PrimaryAttendee = {
              id: primaryCode.id,
              name: primaryCode.name,
              email: primaryCode.email,
              phone: primaryCode.phone,
              code: primaryCode.code,
              tableId: primaryCode.tableId,
              tableName: primaryCode.tableName,
              isAdmitted: primaryCode.isAdmitted,
              relatedCodes: group.length > 1 ? group.slice(1) : [], // All codes except the primary
              isExpanded: false
            };
            
            primaryAttendeesList.push(primaryAttendee);
          }
        });
        
        // Sort primary attendees by name
        primaryAttendeesList.sort((a, b) => a.name.localeCompare(b.name));
        
        setPrimaryAttendees(primaryAttendeesList);
        setFilteredAttendees(primaryAttendeesList);
        
        // Calculate total pages
        setTotalPages(Math.ceil(primaryAttendeesList.length / pageSize));
      } catch (error) {
        console.error('Error fetching data:', error)
        Swal.fire({
          title: 'Error',
          text: 'Failed to load data. Please try again.',
          icon: 'error'
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [eventId, pageSize])

  // Apply filters whenever access codes or filter options change
  useEffect(() => {
    applyFilters()
  }, [primaryAttendees, filterOptions, searchQuery])

  const applyFilters = () => {
    let filtered = [...primaryAttendees]

    // Filter by admission status
    if (filterOptions.admitted === 'admitted') {
      filtered = filtered.filter(attendee => attendee.isAdmitted)
    } else if (filterOptions.admitted === 'not_admitted') {
      filtered = filtered.filter(attendee => !attendee.isAdmitted)
    }

    // Filter by table assignment
    if (filterOptions.hasTable === 'assigned') {
      filtered = filtered.filter(attendee => !!attendee.tableId)
    } else if (filterOptions.hasTable === 'not_assigned') {
      filtered = filtered.filter(attendee => !attendee.tableId)
    }

    // Apply search query if present
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(attendee =>
        attendee.name.toLowerCase().includes(query) ||
        attendee.code.toLowerCase().includes(query) ||
        (attendee.tableName && attendee.tableName.toLowerCase().includes(query)) ||
        (attendee.email && attendee.email.toLowerCase().includes(query)) ||
        (attendee.phone && attendee.phone.toLowerCase().includes(query))
      )
    }

    setFilteredAttendees(filtered)
  }

  const handleFilterChange = (field: string, value: string) => {
    setFilterOptions(prev => ({
      ...prev,
      [field]: value
    }))
    setSelectAll(false)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setSelectAll(false)
  }

  const handleSelectAttendee = (id: string) => {
    setSelectedAttendees(prev => {
      const newSelected = prev.includes(id) 
        ? prev.filter(attendeeId => attendeeId !== id)
        : [...prev, id];
      
      // Update selectAll state without triggering a separate render
      const allSelected = newSelected.length === filteredAttendees.length;
      if (allSelected !== selectAll) {
        // Use setTimeout to batch state updates
        setTimeout(() => setSelectAll(allSelected), 0);
      }
      
      return newSelected;
    });
  }

  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    
    // Use a single state update for better performance
    setSelectedAttendees(newSelectAll ? filteredAttendees.map(attendee => attendee.id) : []);
  }

  const handleSendQRCodes = async (method: 'whatsapp' | 'email' | 'both') => {
    if (selectedAttendees.length === 0) {
      Swal.fire({
        title: 'No Attendees Selected',
        text: 'Please select at least one attendee to send.',
        icon: 'warning'
      })
      return
    }

    try {
      setSending(true)
      
      // Show loading message
      Swal.fire({
        title: 'Generating QR Codes',
        text: 'Please wait while we generate and send the QR codes...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading()
        }
      })

      // Get the selected attendees
      const selectedAttendeesData = primaryAttendees.filter(attendee => selectedAttendees.includes(attendee.id))

      // Check if the selected attendees have the required contact information
      const missingContacts = selectedAttendeesData.filter(attendee => {
        if (method === 'email' && !attendee.email) return true
        if (method === 'whatsapp' && !attendee.phone) return true
        if (method === 'both' && (!attendee.email || !attendee.phone)) return true
        return false
      })
      
      if (missingContacts.length > 0) {
        Swal.close()
        const missingNames = missingContacts.map(attendee => attendee.name).join(', ')
        Swal.fire({
          title: 'Missing Contact Information',
          text: `The following attendees are missing required contact information: ${missingNames}`,
          icon: 'warning'
        })
        setSending(false)
        return
      }

      // Generate QR codes for each selected attendee on-the-fly
      const qrCodeData = await Promise.all(selectedAttendeesData.map(async (attendee) => {
        // Create a temporary SVG element to render the QR code
        const tempContainer = document.createElement('div')
        document.body.appendChild(tempContainer)
        
        // Render QR code to the temporary container
        const qrCodeValue = `${window.location.origin}/admin/dashboard/events/${eventId}/${attendee.code}`
        
        // Use ReactDOM to render the QR code to the temp container
        const ReactDOM = await import('react-dom/client')
        const root = ReactDOM.createRoot(tempContainer)
        root.render(
          <QRCode
            value={qrCodeValue}
            size={150}
            level="H"
          />
        )
        
        // Wait a moment for the QR code to render
        await new Promise(resolve => setTimeout(resolve, 50))
        
        // Get the SVG element
        const svgElement = tempContainer.querySelector('svg')
        let dataUrl = null
        
        if (svgElement) {
          // Convert SVG to data URL
          const svgData = new XMLSerializer().serializeToString(svgElement)
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          const img = new Image()
          
          // Create a data URL from the SVG
          const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
          const url = URL.createObjectURL(svgBlob)
          
          // Return a promise that resolves with the data URL
          dataUrl = await new Promise<string>((resolve) => {
            img.onload = () => {
              canvas.width = img.width
              canvas.height = img.height
              ctx?.drawImage(img, 0, 0)
              const pngDataUrl = canvas.toDataURL('image/png')
              URL.revokeObjectURL(url)
              resolve(pngDataUrl)
            }
            img.src = url
          })
        }
        
        // Clean up
        root.unmount()
        document.body.removeChild(tempContainer)
        
        // Prepare data for both the primary attendee and related codes
        const primaryData = {
          id: attendee.id,
          name: attendee.name,
          email: attendee.email,
          phone: attendee.phone,
          code: attendee.code,
          qrCodeDataUrl: dataUrl
        }
        
        // Also generate QR codes for related attendees (guests, aides, drivers)
        const relatedCodesData = await Promise.all(attendee.relatedCodes.map(async (relatedCode) => {
          // Create a temporary SVG element for each related code
          const relatedTempContainer = document.createElement('div')
          document.body.appendChild(relatedTempContainer)
          
          // Render QR code
          const relatedQrCodeValue = `${window.location.origin}/admin/dashboard/events/${eventId}/${relatedCode.code}`
          const relatedRoot = ReactDOM.createRoot(relatedTempContainer)
          relatedRoot.render(
            <QRCode
              value={relatedQrCodeValue}
              size={150}
              level="H"
            />
          )
          
          // Wait a moment for rendering
          await new Promise(resolve => setTimeout(resolve, 50))
          
          // Get the SVG element
          const relatedSvgElement = relatedTempContainer.querySelector('svg')
          let relatedDataUrl = null
          
          if (relatedSvgElement) {
            // Convert SVG to data URL
            const svgData = new XMLSerializer().serializeToString(relatedSvgElement)
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            const img = new Image()
            
            // Create a data URL from the SVG
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
            const url = URL.createObjectURL(svgBlob)
            
            // Return a promise that resolves with the data URL
            relatedDataUrl = await new Promise<string>((resolve) => {
              img.onload = () => {
                canvas.width = img.width
                canvas.height = img.height
                ctx?.drawImage(img, 0, 0)
                const pngDataUrl = canvas.toDataURL('image/png')
                URL.revokeObjectURL(url)
                resolve(pngDataUrl)
              }
              img.src = url
            })
          }
          
          // Clean up
          relatedRoot.unmount()
          document.body.removeChild(relatedTempContainer)
          
          return {
            id: relatedCode.id,
            name: relatedCode.name,
            code: relatedCode.code,
            qrCodeDataUrl: relatedDataUrl
          }
        }))
        
        return {
          primary: primaryData,
          related: relatedCodesData
        }
      }))

      // Send the QR codes
      const response = await fetch(`/api/admin/events/${eventId}/access-codes/send-qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          attendees: qrCodeData.map(data => ({ 
            id: data.primary.id,
            name: data.primary.name,
            email: data.primary.email,
            phone: data.primary.phone,
            code: data.primary.code,
            qrCodeDataUrl: data.primary.qrCodeDataUrl,
            related: data.related.map(related => ({
              id: related.id,
              name: related.name,
              code: related.code,
              qrCodeDataUrl: related.qrCodeDataUrl
            }))
          })),
          method
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send QR codes')
      }

      const result = await response.json()
      
      Swal.close()
      Swal.fire({
        title: 'Success',
        text: `QR codes sent successfully to ${result.successCount} attendees.`,
        icon: 'success'
      })

      // Clear selection
      setSelectedAttendees([])
      setSelectAll(false)
    } catch (error) {
      console.error('Error sending QR codes:', error)
      Swal.close()
      Swal.fire({
        title: 'Error',
        text: error instanceof Error ? error.message : 'Failed to send QR codes',
        icon: 'error'
      })
    } finally {
      setSending(false)
    }
  }

  const handleDownloadQRCode = async (attendee: PrimaryAttendee) => {
    try {
      // Show loading message
      Swal.fire({
        title: 'Generating QR Code',
        text: 'Please wait...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading()
        }
      })
      
      // Create a temporary SVG element to render the QR code
      const tempContainer = document.createElement('div')
      document.body.appendChild(tempContainer)
      
      // Render QR code to the temporary container
      const qrCodeValue = `${window.location.origin}/admin/dashboard/events/${eventId}/${attendee.code}`
      
      // Use ReactDOM to render the QR code to the temp container
      const ReactDOM = await import('react-dom/client')
      const root = ReactDOM.createRoot(tempContainer)
      root.render(
        <QRCode
          value={qrCodeValue}
          size={150}
          level="H"
        />
      )
      
      // Wait a moment for the QR code to render
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Get the SVG element
      const svgElement = tempContainer.querySelector('svg')
      if (!svgElement) {
        throw new Error('Failed to generate QR code')
      }
      
      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(svgElement)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      // Create a data URL from the SVG
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)
      
      // Wait for the image to load
      await new Promise<void>((resolve) => {
        img.onload = () => {
          canvas.width = img.width
          canvas.height = img.height
          ctx?.drawImage(img, 0, 0)
          const pngDataUrl = canvas.toDataURL('image/png')
          
          // Create download link
          const link = document.createElement('a')
          link.href = pngDataUrl
          link.download = `qrcode-${attendee.name.replace(/\s+/g, '-')}-${attendee.code}.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          
          // Clean up
          URL.revokeObjectURL(url)
          resolve()
        }
        img.src = url
      })
      
      // Clean up
      root.unmount()
      document.body.removeChild(tempContainer)
      
      Swal.close()
    } catch (error) {
      console.error('Error downloading QR code:', error)
      Swal.close()
      Swal.fire({
        title: 'Error',
        text: 'Failed to download QR code',
        icon: 'error'
      })
    }
  }

  const handleDownloadSelected = async () => {
    if (selectedAttendees.length === 0) {
      Swal.fire({
        title: 'No Attendees Selected',
        text: 'Please select at least one attendee to download.',
        icon: 'warning'
      })
      return
    }

    // Download each selected QR code
    for (const id of selectedAttendees) {
      const attendee = primaryAttendees.find(attendee => attendee.id === id)
      if (attendee) {
        await handleDownloadQRCode(attendee)
        // Small delay to prevent browser issues with multiple downloads
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }
  }

  const toggleExpanded = (id: string) => {
    setPrimaryAttendees(prev => 
      prev.map(attendee => 
        attendee.id === id 
          ? { ...attendee, isExpanded: !attendee.isExpanded } 
          : attendee
      )
    );
    
    // Also update filtered attendees to reflect the change
    setFilteredAttendees(prev => 
      prev.map(attendee => 
        attendee.id === id 
          ? { ...attendee, isExpanded: !attendee.isExpanded } 
          : attendee
      )
    );
  };

  const paginatedAttendees = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredAttendees.slice(start, end);
  }, [filteredAttendees, page, pageSize]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      // Scroll to top when changing pages
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2 text-lg">Loading QR codes...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <Link href={`/admin/dashboard/events/${eventId}`} className="flex items-center text-blue-600 hover:text-blue-800">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Event Dashboard
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">QR Codes for {event?.title}</h1>
        <p className="text-gray-600 mt-1">
          Generate and send QR codes for attendee check-in
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div className="mb-4 sm:mb-0">
            <h2 className="text-xl font-bold">Attendees</h2>
            <p className="text-sm text-gray-500">
              {filteredAttendees.length} of {primaryAttendees.length} attendees shown
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64 mb-2 sm:mb-0">
              <input
                type="text"
                placeholder="Search by name, code, table..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>

            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </button>
          </div>
        </div>

        {isFilterOpen && (
          <div className="mb-6 p-4 border rounded-md bg-gray-50">
            <h3 className="text-lg font-semibold mb-3">Filter Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admission Status
                </label>
                <select
                  value={filterOptions.admitted}
                  onChange={(e) => handleFilterChange('admitted', e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="all">All Attendees</option>
                  <option value="admitted">Admitted Only</option>
                  <option value="not_admitted">Not Admitted Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Table Assignment
                </label>
                <select
                  value={filterOptions.hasTable}
                  onChange={(e) => handleFilterChange('hasTable', e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="all">All Tables</option>
                  <option value="assigned">Assigned to Table</option>
                  <option value="not_assigned">Not Assigned to Table</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {selectedAttendees.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex flex-col sm:flex-row justify-between items-center">
              <div className="mb-3 sm:mb-0">
                <span className="font-medium">{selectedAttendees.length} attendees selected</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleDownloadSelected}
                  className="flex items-center px-3 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download Selected
                </button>

                <button
                  onClick={() => handleSendQRCodes('email')}
                  disabled={sending}
                  className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send className="h-4 w-4 mr-1" />
                  Send via Email
                </button>

                <button
                  onClick={() => handleSendQRCodes('whatsapp')}
                  disabled={sending}
                  className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  <Send className="h-4 w-4 mr-1" />
                  Send via WhatsApp
                </button>

                <button
                  onClick={() => handleSendQRCodes('both')}
                  disabled={sending}
                  className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  <Send className="h-4 w-4 mr-1" />
                  Send Both
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="select-all"
              checked={selectAll}
              onChange={handleSelectAll}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
            />
            <label htmlFor="select-all" className="ml-2 text-sm text-gray-700 cursor-pointer">
              Select All
            </label>
          </div>
        </div>

        {filteredAttendees.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedAttendees.map(attendee => (
                <div
                  key={attendee.id}
                  className={`border rounded-lg overflow-hidden ${
                    selectedAttendees.includes(attendee.id) ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                  }`}
                >
                  <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`select-${attendee.id}`}
                        checked={selectedAttendees.includes(attendee.id)}
                        onChange={() => handleSelectAttendee(attendee.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                      />
                      <div className="ml-2">
                        <h3 className="font-medium">{attendee.name}</h3>
                        <p className="text-sm text-gray-500">Code: {attendee.code}</p>
                        {attendee.relatedCodes.length > 0 && (
                          <p className="text-xs text-blue-600">
                            +{attendee.relatedCodes.length} {attendee.relatedCodes.length === 1 ? 'guest' : 'guests'}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      attendee.isAdmitted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {attendee.isAdmitted ? 'Admitted' : 'Not Admitted'}
                    </div>
                  </div>

                  <div className="p-4 flex flex-col items-center">
                    <div className="mb-3 bg-white p-2 rounded-lg shadow-sm">
                      <QRCode
                        id={`qrcode-${attendee.id}`}
                        value={`${window.location.origin}/admin/dashboard/events/${eventId}/${attendee.code}`}
                        size={150}
                        level="H"
                      />
                    </div>

                    <div className="w-full text-center mb-3">
                      <p className="text-sm text-gray-600 mb-1">
                        {attendee.tableId ? (
                          <span>Table: {attendee.tableName}</span>
                        ) : (
                          <span>No table assigned</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600">
                        {attendee.email && <span className="mr-2">Email: {attendee.email}</span>}
                        {attendee.phone && <span>Phone: {attendee.phone}</span>}
                      </p>
                    </div>

                    <div className="w-full space-y-2">
                      <button
                        onClick={() => handleDownloadQRCode(attendee)}
                        className="flex items-center justify-center w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download QR Code
                      </button>

                      {attendee.relatedCodes.length > 0 && (
                        <button
                          onClick={() => toggleExpanded(attendee.id)}
                          className="flex items-center justify-center w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                        >
                          {attendee.isExpanded ? (
                            <ChevronUp className="h-4 w-4 mr-1" />
                          ) : (
                            <ChevronDown className="h-4 w-4 mr-1" />
                          )}
                          {attendee.isExpanded ? 'Hide Guests' : 'Show Guests'}
                        </button>
                      )}
                    </div>

                    {attendee.isExpanded && (
                      <div className="mt-4 w-full border-t pt-3">
                        <h4 className="text-sm font-medium mb-2 flex items-center">
                          <Users className="h-4 w-4 mr-1 text-gray-500" />
                          Associated Guests
                        </h4>
                        {attendee.relatedCodes.map(guest => (
                          <div key={guest.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-2 text-gray-500 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium">{guest.name}</p>
                                <p className="text-xs text-gray-500">Code: {guest.code}</p>
                              </div>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                              guest.isAdmitted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {guest.isAdmitted ? 'Admitted' : 'Not Admitted'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <nav className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-1 rounded-md border bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1 rounded-md ${
                        pageNum === page
                          ? 'bg-blue-600 text-white'
                          : 'border bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                    className="px-3 py-1 rounded-md border bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <QrCode className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No Attendees Found</h3>
            <p className="text-gray-500">
              No attendees match your current filters. Try adjusting your search or filters.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
