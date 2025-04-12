'use client'

import { useState, useEffect, useRef, createRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, QrCode, Search, Send, Download, RefreshCw, Filter, ChevronDown, ChevronUp, Users, User, Trash2, CheckCircle, XCircle, UserPlus, Car, UserCog, Table2 } from 'lucide-react'
import QRCodeLib from 'qrcode'
import Swal from 'sweetalert2'
import ReactDOM from 'react-dom'
import { toPng } from 'html-to-image'

interface AccessCode {
  id: string
  name: string
  code: string
  rsvpId: string
  rsvpStatus: string
  isAdmitted: boolean
  tableId: string | null
  tableName: string | null
  email?: string | null
  phone?: string | null
  type: string
  isSent: boolean
  sentAt: Date | null
  isVirtual?: boolean
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
  isExpanded?: boolean
  qrCodeDataUrl?: string
  relatedQrCodes?: string[]
  isSent?: boolean
  sentAt?: Date | null
}

export default function QRCodesPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const eventId = params.id
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [event, setEvent] = useState<any>(null)
  const [primaryAttendees, setPrimaryAttendees] = useState<PrimaryAttendee[]>([])
  const [filteredAttendees, setFilteredAttendees] = useState<PrimaryAttendee[]>([])
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterOptions, setFilterOptions] = useState({
    admitted: 'all', // all, admitted, not_admitted
    hasTable: 'all', // all, assigned, not_assigned
    qrSent: 'all', // all, sent, not_sent
    hasDependents: 'all' // all, with_dependents, without_dependents
  })
  const [selectAll, setSelectAll] = useState(false)
  const [selectAllCurrentPage, setSelectAllCurrentPage] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [pageSizeOptions] = useState([10, 20, 50, 100])
  const [sendMethod, setSendMethod] = useState('both') // 'both', 'email', 'whatsapp'
  const [rsvpSummary, setRsvpSummary] = useState({
    totalInvitees: 0,
    primaryAttendees: 0,
    guests: 0,
    drivers: 0,
    aides: 0,
    admitted: 0,
    notAdmitted: 0
  })

  // Function to fetch and process data
  const refreshData = async () => {
    try {
      setLoading(true)

      // Fetch event details
      const eventResponse = await fetch(`/api/admin/events/${eventId}`)
      if (!eventResponse.ok) {
        throw new Error('Failed to fetch event details')
      }
      const eventData = await eventResponse.json()
      setEvent(eventData)

      // Fetch RSVP summary
      const summaryResponse = await fetch(`/api/admin/events/${eventId}/rsvp-summary`)
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json()
        setRsvpSummary(summaryData)
      }

      // Fetch access codes
      const response = await fetch(`/api/admin/events/${eventId}/access-codes`)
      if (!response.ok) {
        throw new Error('Failed to fetch access codes')
      }

      const codesData = await response.json()

      // Process the access codes
      const processedCodes = codesData.accessCodes.map((code: any) => ({
        id: code.id,
        name: code.name,
        code: code.code,
        rsvpId: code.rsvpId,
        rsvpStatus: code.rsvpStatus,
        isAdmitted: code.isAdmitted,
        tableId: code.tableId,
        tableName: code.table?.name || null,
        email: code.rsvp?.email || null,
        phone: code.rsvp?.phone || null,
        type: code.type,
        isSent: code.isSent || false,
        sentAt: code.sentAt ? new Date(code.sentAt) : null
      }))

      // Create virtual dependent codes for RSVPs with hasGuest, hasDriver, or hasAide flags
      // This ensures we show dependents even if they don't have actual access codes
      const virtualDependentCodes: AccessCode[] = [];
      
      codesData.accessCodes.forEach((code: any) => {
        // Only process primary codes
        if (code.type === 'primary' && code.rsvp) {
          // Add virtual guest code if RSVP has guest flag
          if (code.rsvp.hasGuest) {
            const existingGuestCode = processedCodes.find((c: AccessCode) => 
              c.rsvpId === code.rsvpId && c.type === 'guest'
            );
            
            // Only add virtual code if no actual code exists
            if (!existingGuestCode) {
              virtualDependentCodes.push({
                id: `virtual-guest-${code.rsvpId}`,
                name: `${code.name}'s Guest`,
                code: 'VIRTUAL',
                rsvpId: code.rsvpId,
                rsvpStatus: code.rsvpStatus,
                isAdmitted: false,
                tableId: null,
                tableName: null,
                email: code.rsvp.email || null,
                phone: code.rsvp.phone || null,
                type: 'guest',
                isSent: false,
                sentAt: null,
                isVirtual: true // Flag to identify virtual codes
              });
            }
          }
          
          // Add virtual driver code if RSVP has driver flag
          if (code.rsvp.hasDriver) {
            const existingDriverCode = processedCodes.find((c: AccessCode) => 
              c.rsvpId === code.rsvpId && c.type === 'driver'
            );
            
            // Only add virtual code if no actual code exists
            if (!existingDriverCode) {
              virtualDependentCodes.push({
                id: `virtual-driver-${code.rsvpId}`,
                name: `${code.name}'s Driver`,
                code: 'VIRTUAL',
                rsvpId: code.rsvpId,
                rsvpStatus: code.rsvpStatus,
                isAdmitted: false,
                tableId: null,
                tableName: null,
                email: code.rsvp.email || null,
                phone: code.rsvp.phone || null,
                type: 'driver',
                isSent: false,
                sentAt: null,
                isVirtual: true // Flag to identify virtual codes
              });
            }
          }
          
          // Add virtual aide code if RSVP has aide flag
          if (code.rsvp.hasAide) {
            const existingAideCode = processedCodes.find((c: AccessCode) => 
              c.rsvpId === code.rsvpId && c.type === 'aide'
            );
            
            // Only add virtual code if no actual code exists
            if (!existingAideCode) {
              virtualDependentCodes.push({
                id: `virtual-aide-${code.rsvpId}`,
                name: `${code.name}'s Aide`,
                code: 'VIRTUAL',
                rsvpId: code.rsvpId,
                rsvpStatus: code.rsvpStatus,
                isAdmitted: false,
                tableId: null,
                tableName: null,
                email: code.rsvp.email || null,
                phone: code.rsvp.phone || null,
                type: 'aide',
                isSent: false,
                sentAt: null,
                isVirtual: true // Flag to identify virtual codes
              });
            }
          }
        }
      });
      
      // Combine actual codes with virtual dependent codes
      const allCodes = [...processedCodes, ...virtualDependentCodes];

      // Group codes by RSVP ID (which connects primary attendees with guests, aids, drivers)
      const groupedByRsvp: Record<string, AccessCode[]> = allCodes.reduce((groups: Record<string, AccessCode[]>, code: AccessCode) => {
        const key = code.rsvpId
        if (!groups[key]) groups[key] = []
        groups[key].push(code)
        return groups;
      }, {});

      // Create primary attendees with their related codes
      const primaryAttendees: PrimaryAttendee[] = Object.values(groupedByRsvp).map((group: AccessCode[]) => {
        const primaryCode = group.find((code: AccessCode) => code.type === 'primary') || group[0]
        
        return {
          id: primaryCode.id,
          name: primaryCode.name,
          email: primaryCode.email || null,
          phone: primaryCode.phone || null,
          code: primaryCode.code,
          tableId: primaryCode.tableId,
          tableName: primaryCode.tableName,
          isAdmitted: primaryCode.isAdmitted,
          relatedCodes: group.filter((code: AccessCode) => code.id !== primaryCode.id),
          isExpanded: false,
          isSent: primaryCode.isSent,
          sentAt: primaryCode.sentAt
        }
      })

      setPrimaryAttendees(primaryAttendees)
      
      // Apply filters
      applyFilters(primaryAttendees)
      
      // Calculate total pages
      setTotalPages(Math.ceil(primaryAttendees.length / pageSize))
    } catch (error) {
      console.error('Error fetching data:', error)
      Swal.fire({
        title: 'Error',
        text: 'Failed to load attendees. Please try again.',
        icon: 'error',
        confirmButtonText: 'OK'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshData()
  }, [eventId])

  // Apply filters whenever access codes or filter options change
  useEffect(() => {
    applyFilters()
  }, [primaryAttendees, filterOptions, searchQuery])

  const applyFilters = (attendees: PrimaryAttendee[] = primaryAttendees) => {
    let filtered = [...attendees]

    // Filter by admission status
    if (filterOptions.admitted === 'admitted') {
      filtered = filtered.filter((attendee: PrimaryAttendee) => attendee.isAdmitted)
    } else if (filterOptions.admitted === 'not_admitted') {
      filtered = filtered.filter((attendee: PrimaryAttendee) => !attendee.isAdmitted)
    }

    // Filter by table assignment
    if (filterOptions.hasTable === 'assigned') {
      filtered = filtered.filter((attendee: PrimaryAttendee) => !!attendee.tableId)
    } else if (filterOptions.hasTable === 'not_assigned') {
      filtered = filtered.filter((attendee: PrimaryAttendee) => !attendee.tableId)
    }

    // Filter by QR code send status
    if (filterOptions.qrSent === 'sent') {
      filtered = filtered.filter((attendee: PrimaryAttendee) => attendee.isSent)
    } else if (filterOptions.qrSent === 'not_sent') {
      filtered = filtered.filter((attendee: PrimaryAttendee) => !attendee.isSent)
    }
    
    // Filter by dependent status
    if (filterOptions.hasDependents === 'with_dependents') {
      filtered = filtered.filter((attendee: PrimaryAttendee) => 
        attendee.relatedCodes && attendee.relatedCodes.length > 0
      )
    } else if (filterOptions.hasDependents === 'without_dependents') {
      filtered = filtered.filter((attendee: PrimaryAttendee) => 
        !attendee.relatedCodes || attendee.relatedCodes.length === 0
      )
    }

    // Apply search query if present
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((attendee: PrimaryAttendee) =>
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
        ? prev.filter((attendeeId: string) => attendeeId !== id)
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
    setSelectedAttendees(newSelectAll ? filteredAttendees.map((attendee: PrimaryAttendee) => attendee.id) : []);
  }
  
  // Handle selecting all attendees on the current page
  const handleSelectAllCurrentPage = () => {
    const newSelectAllCurrentPage = !selectAllCurrentPage;
    setSelectAllCurrentPage(newSelectAllCurrentPage);
    
    if (newSelectAllCurrentPage) {
      // Add all current page attendees to selection
      const currentPageIds = paginatedAttendees.map(attendee => attendee.id);
      setSelectedAttendees(prevSelected => {
        // Combine previously selected (not on current page) with all current page attendees
        const otherSelectedIds = prevSelected.filter(id => !currentPageIds.includes(id));
        return [...otherSelectedIds, ...currentPageIds];
      });
    } else {
      // Remove all current page attendees from selection
      const currentPageIds = paginatedAttendees.map(attendee => attendee.id);
      setSelectedAttendees(prevSelected => 
        prevSelected.filter(id => !currentPageIds.includes(id))
      );
    }
  };

  const paginatedAttendees = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredAttendees.slice(start, end);
  }, [filteredAttendees, page, pageSize]);

  // Update selectAllCurrentPage state when page changes or selections change
  useEffect(() => {
    // Check if all attendees on current page are selected
    const currentPageIds = paginatedAttendees.map(attendee => attendee.id);
    const allCurrentPageSelected = currentPageIds.every(id => selectedAttendees.includes(id));
    setSelectAllCurrentPage(allCurrentPageSelected && currentPageIds.length > 0);
  }, [paginatedAttendees, selectedAttendees]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      // Scroll to top when changing pages
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setPage(1) // Reset to first page when changing page size
    
    // Recalculate total pages
    const newTotalPages = Math.ceil(filteredAttendees.length / newSize)
    setTotalPages(newTotalPages)
  }

  const handleSendQRCodes = async (method = sendMethod) => {
    if (selectedAttendees.length === 0) {
      Swal.fire({
        title: 'No Attendees Selected',
        text: 'Please select at least one attendee to send QR codes.',
        icon: 'warning',
        confirmButtonText: 'OK'
      })
      return
    }

    try {
      // Get selected attendees data
      const selectedAttendeesData = primaryAttendees.filter(
        (attendee: PrimaryAttendee) => selectedAttendees.includes(attendee.id)
      )

      // Show recipient confirmation modal
      const { value: formResult, isConfirmed } = await Swal.fire({
        title: 'Review Recipients',
        html: `
          <div class="text-sm mb-4">Review and edit recipient details before sending QR codes.</div>
          <div class="grid grid-cols-4 gap-2 font-medium text-gray-700 mb-2 text-left">
            <div>Name</div>
            <div>Email</div>
            <div>Phone</div>
            <div>Method</div>
          </div>
          <form id="recipientsForm" class="max-h-[50vh] overflow-y-auto">
            ${selectedAttendeesData.map((attendee: PrimaryAttendee, index: number) => {
              // Format phone number if it exists
              let formattedPhone = attendee.phone || '';
              
              // Ensure phone number has country code
              if (formattedPhone && !formattedPhone.startsWith('+')) {
                // Default to +234 (Nigeria) if no country code is present
                formattedPhone = `+234${formattedPhone.startsWith('0') ? formattedPhone.substring(1) : formattedPhone}`;
              }
              
              // Determine the default method based on the current method parameter and available contact info
              let defaultMethod = method;
              
              // If the selected method isn't possible with the available contact info, adjust it
              if (defaultMethod === 'email' && !attendee.email) {
                defaultMethod = attendee.phone ? 'whatsapp' : 'none';
              } else if (defaultMethod === 'whatsapp' && !attendee.phone) {
                defaultMethod = attendee.email ? 'email' : 'none';
              } else if (defaultMethod === 'both' && (!attendee.email || !attendee.phone)) {
                if (attendee.email && !attendee.phone) {
                  defaultMethod = 'email';
                } else if (!attendee.email && attendee.phone) {
                  defaultMethod = 'whatsapp';
                } else {
                  defaultMethod = 'none';
                }
              }
              
              return `
              <div class="grid grid-cols-4 gap-2 mb-3 text-left">
                <div class="text-sm">${attendee.name}</div>
                <div>
                  <input type="email" name="email_${attendee.id}" value="${attendee.email || ''}" 
                    class="w-full text-sm p-1 border rounded" ${!attendee.email ? 'placeholder="No email"' : ''}>
                </div>
                <div>
                  <input type="tel" name="phone_${attendee.id}" value="${formattedPhone}" 
                    class="w-full text-sm p-1 border rounded" ${!attendee.phone ? 'placeholder="No phone"' : ''}>
                  <div class="text-xs text-gray-500 mt-1">Include country code (e.g. +234, +1)</div>
                </div>
                <div>
                  <select name="method_${attendee.id}" class="w-full text-sm p-1 border rounded">
                    ${attendee.email && formattedPhone 
                      ? `<option value="both" ${defaultMethod === 'both' ? 'selected' : ''}>Email & WhatsApp</option>
                         <option value="email" ${defaultMethod === 'email' ? 'selected' : ''}>Email Only</option>
                         <option value="whatsapp" ${defaultMethod === 'whatsapp' ? 'selected' : ''}>WhatsApp Only</option>` 
                      : attendee.email 
                        ? `<option value="email" selected>Email Only</option>` 
                        : formattedPhone 
                          ? `<option value="whatsapp" selected>WhatsApp Only</option>` 
                          : `<option value="none" selected>No Contact</option>`}
                  </select>
                </div>
              </div>
            `}).join('')}
          </form>
        `,
        width: '80%',
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Send QR Codes',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#4CAF50',  // Green color for confirm button
        cancelButtonColor: '#f44336',   // Red color for cancel button
        preConfirm: () => {
          const form = document.getElementById('recipientsForm') as HTMLFormElement
          const formData = new FormData(form)
          
          const result: Record<string, { email: string, phone: string, method: string }> = {}
          
          selectedAttendeesData.forEach((attendee: PrimaryAttendee) => {
            result[attendee.id] = {
              email: formData.get(`email_${attendee.id}`) as string || '',
              phone: formData.get(`phone_${attendee.id}`) as string || '',
              method: formData.get(`method_${attendee.id}`) as string || 'none'
            }
          })
          
          return result
        }
      })

      if (!isConfirmed || !formResult) {
        return
      }

      // Show loading state
      Swal.fire({
        title: 'Sending QR Codes',
        text: 'Please wait while we send the QR codes...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading()
        }
      })

      // Prepare data for API
      type RecipientData = { email: string, phone: string, method: string };
      const attendeesData = Object.entries(formResult as Record<string, RecipientData>).map(([attendeeId, recipient]) => {
        const attendee = primaryAttendees.find((a: PrimaryAttendee) => a.id === attendeeId)
        if (!attendee) return null
        
        return {
          primary: {
            id: attendee.id,
            name: attendee.name,
            code: attendee.code,
            email: recipient.email,
            phone: recipient.phone
          },
          related: attendee.relatedCodes.map((related: AccessCode) => ({
            id: related.id,
            name: related.name,
            code: related.code
          })),
          sendMethod: recipient.method
        }
      }).filter(Boolean)

      // Send QR codes
      setSending(true)
      const response = await fetch(`/api/admin/events/${params.id}/access-codes/send-qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          attendees: attendeesData,
          method: 'both' // Default method (will be overridden by individual preferences)
        })
      })

      const data = await response.json()

      if (data.success) {
        // Update local state to reflect the sent status
        const updatedPrimaryAttendees = [...primaryAttendees]
        
        // Update primary attendees
        attendeesData.forEach((attendeeData: any) => {
          if (!attendeeData) return
          
          const primaryIndex = updatedPrimaryAttendees.findIndex((a: PrimaryAttendee) => a.id === attendeeData.primary.id)
          if (primaryIndex !== -1) {
            updatedPrimaryAttendees[primaryIndex] = {
              ...updatedPrimaryAttendees[primaryIndex],
              isSent: true,
              sentAt: new Date()
            }
            
            // Also update related codes
            const relatedIds = attendeeData.related.map((r: any) => r.id)
            updatedPrimaryAttendees[primaryIndex].relatedCodes = 
              updatedPrimaryAttendees[primaryIndex].relatedCodes.map((related: AccessCode) => ({
                ...related,
                isSent: relatedIds.includes(related.id) ? true : related.isSent,
                sentAt: relatedIds.includes(related.id) ? new Date() : related.sentAt
              }))
          }
        })
        
        // Update state
        setPrimaryAttendees(updatedPrimaryAttendees)
        
        // Apply filters to update the filtered list
        applyFilters(updatedPrimaryAttendees)
        
        // Clear selection
        setSelectedAttendees([])
        setSelectAll(false)

        // Show success message
        Swal.fire({
          title: 'QR Codes Sent',
          html: `
            Successfully sent QR codes to ${data.successCount} recipients.
            ${data.errorCount > 0 ? `
              <div class="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                Failed to send ${data.errorCount} QR codes. Please try again for these recipients.
              </div>
            ` : ''}
          `,
          icon: 'success',
          confirmButtonColor: '#4CAF50',  // Green color for confirm button
        })
      } else {
        throw new Error(data.error || 'Failed to send QR codes')
      }
    } catch (error) {
      console.error('Error sending QR codes:', error)
      Swal.fire({
        title: 'Error',
        text: error instanceof Error ? error.message : 'An error occurred while sending QR codes',
        icon: 'error',
        confirmButtonColor: '#f44336'  // Red color for error button
      })
    } finally {
      setSending(false)
    }
  }

  const handleDownloadQRCode = async (attendee: PrimaryAttendee) => {
    try {
      // Show loading modal
      Swal.fire({
        title: 'Generating QR Codes',
        html: 'Please wait while we generate the QR codes...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading()
        }
      })

      // Base URL for QR code content
      const baseUrl = window.location.origin
      
      // Generate QR code for primary attendee
      const primaryQrCodeUrl = `${baseUrl}/admin/dashboard/events/${eventId}/qr/${attendee.code}`
      
      // Generate QR code data URL for primary
      const primaryQrDataUrl = await QRCodeLib.toDataURL(primaryQrCodeUrl, {
        width: 180,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
      
      // Generate QR codes for related attendees
      const relatedQrDataUrls = await Promise.all(
        attendee.relatedCodes.map(async (relatedCode: AccessCode) => {
          const relatedQrCodeUrl = `${baseUrl}/admin/dashboard/events/${eventId}/qr/${relatedCode.code}`
          
          // Generate QR code data URL for related
          return QRCodeLib.toDataURL(relatedQrCodeUrl, {
            width: 180,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#ffffff'
            }
          })
        })
      )
      
      // Store the QR code data URLs in the attendee object for future use
      const updatedAttendees = primaryAttendees.map((a: PrimaryAttendee) => {
        if (a.id === attendee.id) {
          return {
            ...a,
            qrCodeDataUrl: primaryQrDataUrl,
            relatedQrCodes: relatedQrDataUrls
          }
        }
        return a
      })
      
      setPrimaryAttendees(updatedAttendees)
      
      // Create array to store all QR code data URLs
      const allQrDataUrls = [primaryQrDataUrl, ...relatedQrDataUrls]
      
      // Show QR codes in modal for download
      Swal.fire({
        title: 'QR Codes',
        html: `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto p-4">
            ${allQrDataUrls.map((dataUrl: string, index: number) => {
              const isMain = index === 0
              const codeInfo = isMain 
                ? { name: attendee.name, code: attendee.code, type: 'Primary' }
                : { 
                    name: attendee.relatedCodes[index - 1].name, 
                    code: attendee.relatedCodes[index - 1].code,
                    type: attendee.relatedCodes[index - 1].name.toLowerCase().includes('guest') ? 'Guest' :
                          attendee.relatedCodes[index - 1].name.toLowerCase().includes('aid') ? 'Aid' :
                          attendee.relatedCodes[index - 1].name.toLowerCase().includes('driver') ? 'Driver' : 'Related'
                  }
              
              return `
                <div class="border rounded-lg p-4 bg-white flex flex-col items-center">
                  <img src="${dataUrl}" alt="QR Code" class="w-48 h-48 object-contain mb-2" />
                  <div class="text-center">
                    <p class="font-bold">${codeInfo.name} (${codeInfo.type})</p>
                    <p class="text-sm text-gray-600">Code: ${codeInfo.code}</p>
                  </div>
                  <a href="${dataUrl}" download="qrcode-${codeInfo.code}.png" class="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </a>
                </div>
              `
            }).join('')}
          </div>
        `,
        width: '80%',
        showCloseButton: true,
        showConfirmButton: false,
        confirmButtonColor: '#4CAF50'
      })
      
    } catch (error) {
      console.error('Error generating QR codes:', error)
      Swal.fire({
        title: 'Error',
        text: 'Failed to generate QR codes. Please try again.',
        icon: 'error',
        confirmButtonColor: '#f44336'  // Red color for error button
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
      const attendee = primaryAttendees.find((attendee: PrimaryAttendee) => attendee.id === id)
      if (attendee) {
        await handleDownloadQRCode(attendee)
        // Small delay to prevent browser issues with multiple downloads
        await new Promise((resolve: (value: void) => void) => setTimeout(resolve, 300))
      }
    }
  }

  const handleDeleteDependents = async () => {
    if (selectedAttendees.length === 0) return;
    
    // Get the selected attendees with their related codes
    const selectedAttendeeData = primaryAttendees.filter((attendee: PrimaryAttendee) => 
      selectedAttendees.includes(attendee.id)
    );
    
    // Show selection dialog for dependent types
    const { value: dependentTypes } = await Swal.fire({
      title: 'Select Dependent Types to Delete',
      html: `
        <div class="text-left">
          <p class="mb-4">Select which types of dependents you want to delete:</p>
          <div class="flex items-center mb-3">
            <input type="checkbox" id="delete-guests" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" checked>
            <label for="delete-guests" class="ml-2 text-gray-700">Guests</label>
          </div>
          <div class="flex items-center mb-3">
            <input type="checkbox" id="delete-drivers" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" checked>
            <label for="delete-drivers" class="ml-2 text-gray-700">Drivers</label>
          </div>
          <div class="flex items-center">
            <input type="checkbox" id="delete-aides" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" checked>
            <label for="delete-aides" class="ml-2 text-gray-700">Aides</label>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Continue',
      cancelButtonText: 'Cancel',
      preConfirm: () => {
        return {
          guests: (document.getElementById('delete-guests') as HTMLInputElement).checked,
          drivers: (document.getElementById('delete-drivers') as HTMLInputElement).checked,
          aides: (document.getElementById('delete-aides') as HTMLInputElement).checked
        };
      }
    });
    
    // If canceled or no types selected
    if (!dependentTypes || (!dependentTypes.guests && !dependentTypes.drivers && !dependentTypes.aides)) {
      return;
    }
    
    // Collect only dependent access code IDs to delete based on selected types
    const codeIdsToDelete: string[] = [];
    const attendeesWithDependents: {name: string, dependents: {id: string, name: string, type: string}[]}[] = [];
    
    selectedAttendeeData.forEach((attendee: PrimaryAttendee) => {
      // Only add dependent codes (not the primary attendee)
      const dependents: {id: string, name: string, type: string}[] = [];
      
      if (attendee.relatedCodes && attendee.relatedCodes.length > 0) {
        attendee.relatedCodes.forEach((code: AccessCode) => {
          if ((code.type === 'guest' && dependentTypes.guests) || 
              (code.type === 'driver' && dependentTypes.drivers) || 
              (code.type === 'aide' && dependentTypes.aides)) {
            codeIdsToDelete.push(code.id);
            dependents.push({
              id: code.id,
              name: code.name,
              type: code.type
            });
          }
        });
      }
      
      if (dependents.length > 0) {
        attendeesWithDependents.push({
          name: attendee.name,
          dependents
        });
      }
    });
    
    // If no dependent codes to delete, show message and return
    if (codeIdsToDelete.length === 0) {
      await Swal.fire({
        title: 'No Dependents Found',
        text: 'The selected attendees have no dependent guests, aides, or drivers of the selected types to delete.',
        icon: 'info',
        confirmButtonColor: '#3085d6'
      });
      return;
    }
    
    // Create type labels for confirmation message
    const typeLabels = [];
    if (dependentTypes.guests) typeLabels.push('Guests');
    if (dependentTypes.drivers) typeLabels.push('Drivers');
    if (dependentTypes.aides) typeLabels.push('Aides');
    const typeString = typeLabels.join(', ');
    
    // Show confirmation dialog
    const result = await Swal.fire({
      title: 'Delete Dependent Access Codes',
      html: `
        <p>Are you sure you want to delete <strong>${codeIdsToDelete.length}</strong> dependent access codes?</p>
        <p class="text-sm text-gray-600">This will remove all <strong>${typeString}</strong> associated with the selected attendees, but keep the primary attendees.</p>
        <p class="text-red-600 mt-2">This action cannot be undone!</p>
        <div class="mt-4 text-left">
          <p class="font-semibold">The following dependents will be deleted:</p>
          <ul class="mt-2 max-h-40 overflow-y-auto">
            ${attendeesWithDependents.map((a: any) => `
              <li class="mb-2">
                <p class="font-medium">${a.name}</p>
                <ul class="ml-4 text-sm text-gray-600">
                  ${a.dependents.map((d: any) => `<li>• ${d.name} (${d.type})</li>`).join('')}
                </ul>
              </li>
            `).join('')}
          </ul>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete dependents',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      reverseButtons: true
    });
    
    if (!result.isConfirmed) return;
    
    try {
      setDeleting(true);
      
      // Call the API to delete the access codes
      const response = await fetch(`/api/admin/events/${eventId}/access-codes/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          codeIds: codeIdsToDelete
        })
      });
      
      // Check if response is OK before trying to parse JSON
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        
        // If response is JSON, parse it for the error message
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          throw new Error(data.error || `Failed with status: ${response.status}`);
        } else {
          // If not JSON, use the status text
          throw new Error(`Failed with status: ${response.status} - ${response.statusText}`);
        }
      }
      
      // Parse JSON response only if we know it's valid
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete dependent access codes');
      }
      
      // Show success message
      Swal.fire({
        title: 'Deleted Successfully',
        text: `${data.count} dependent access codes have been deleted.`,
        icon: 'success',
        confirmButtonColor: '#3085d6'
      });
      
      // Clear selection
      setSelectedAttendees([]);
      setSelectAll(false);
      
      // Refresh the data
      refreshData();
      
    } catch (error) {
      console.error('Error deleting dependent access codes:', error);
      Swal.fire({
        title: 'Error',
        text: error instanceof Error ? error.message : 'Failed to delete dependent access codes',
        icon: 'error',
        confirmButtonColor: '#3085d6'
      });
    } finally {
      setDeleting(false);
    }
  };

  const toggleExpanded = (id: string) => {
    setPrimaryAttendees(prev => 
      prev.map((attendee: PrimaryAttendee) => 
        attendee.id === id 
          ? { ...attendee, isExpanded: !attendee.isExpanded } 
          : attendee
      )
    );
    
    // Also update filtered attendees to reflect the change
    setFilteredAttendees(prev => 
      prev.map((attendee: PrimaryAttendee) => 
        attendee.id === id 
          ? { ...attendee, isExpanded: !attendee.isExpanded } 
          : attendee
      )
    );
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href={`/admin/dashboard/events/${eventId}`} className="text-blue-600 hover:text-blue-800 flex items-center mb-2">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Event
          </Link>
          <h1 className="text-2xl font-semibold">{event?.title ? `QR Codes for ${event.title}` : 'Event QR Codes'}</h1>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleAutoAssignTables}
            disabled={loading || assigningTables}
            className="flex items-center px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:bg-amber-300"
          >
            <Table2 className="h-4 w-4 mr-2" />
            {assigningTables ? 'Assigning...' : 'Auto-Assign Tables'}
          </button>
          
          <button
            onClick={handleSendQRCodes}
            disabled={selectedAttendees.length === 0 || sending}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300"
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Sending...' : `Send QR Codes (${selectedAttendees.length})`}
          </button>
          
          <button
            onClick={handleDownloadSelected}
            disabled={selectedAttendees.length === 0}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Selected ({selectedAttendees.length})
          </button>
        </div>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-bold">Attendees</h2>
        <p className="text-gray-600 mt-1">
          {filteredAttendees.length} of {primaryAttendees.length} attendees shown
        </p>
      </div>

      {/* RSVP Summary Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">RSVP Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">Total Invitees</span>
            </div>
            <p className="text-2xl font-bold text-blue-700 mt-2">{rsvpSummary.totalInvitees}</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <User className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">Primary Attendees</span>
            </div>
            <p className="text-2xl font-bold text-green-700 mt-2">{rsvpSummary.primaryAttendees}</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <UserPlus className="h-5 w-5 text-purple-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">Guests</span>
            </div>
            <p className="text-2xl font-bold text-purple-700 mt-2">{rsvpSummary.guests}</p>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Car className="h-5 w-5 text-yellow-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">Drivers</span>
            </div>
            <p className="text-2xl font-bold text-yellow-700 mt-2">{rsvpSummary.drivers}</p>
          </div>
          
          <div className="bg-indigo-50 p-4 rounded-lg">
            <div className="flex items-center">
              <UserCog className="h-5 w-5 text-indigo-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">Aides</span>
            </div>
            <p className="text-2xl font-bold text-indigo-700 mt-2">{rsvpSummary.aides}</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">Admitted</span>
            </div>
            <p className="text-2xl font-bold text-green-700 mt-2">{rsvpSummary.admitted}</p>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center">
              <XCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">Not Admitted</span>
            </div>
            <p className="text-2xl font-bold text-red-700 mt-2">{rsvpSummary.notAdmitted}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div className="mb-3 sm:mb-0">
            <h3 className="text-lg font-bold">Filters</h3>
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
        
        {/* Select All on Current Page Checkbox */}
        <div className="mb-4 flex items-center">
          <input
            type="checkbox"
            id="select-all-current-page"
            checked={selectAllCurrentPage}
            onChange={handleSelectAllCurrentPage}
            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="select-all-current-page" className="ml-2 text-sm font-medium text-gray-700">
            Select All on Current Page ({paginatedAttendees.length} attendees)
          </label>
        </div>

        {isFilterOpen && (
          <div className="mb-6 p-4 border rounded-md bg-gray-50">
            <h3 className="text-lg font-semibold mb-3">Filter Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admission Status
                </label>
                <select
                  value={filterOptions.admitted}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange('admitted', e.target.value)}
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
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange('hasTable', e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="all">All Tables</option>
                  <option value="assigned">Assigned to Table</option>
                  <option value="not_assigned">Not Assigned to Table</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  QR Code Send Status
                </label>
                <select
                  value={filterOptions.qrSent}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange('qrSent', e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="all">All QR Codes</option>
                  <option value="sent">Sent Only</option>
                  <option value="not_sent">Not Sent Only</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dependents
                </label>
                <select
                  value={filterOptions.hasDependents}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange('hasDependents', e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="all">All Attendees</option>
                  <option value="with_dependents">With Dependents</option>
                  <option value="without_dependents">Without Dependents</option>
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

                <button
                  onClick={handleDeleteDependents}
                  disabled={deleting}
                  className="flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Dependents
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
              {paginatedAttendees.map((attendee: PrimaryAttendee) => (
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

                    <div className="flex flex-wrap gap-2 mt-2">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        attendee.tableId ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {attendee.tableId ? `Table: ${attendee.tableName || attendee.tableId}` : 'No Table'}
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        attendee.isAdmitted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {attendee.isAdmitted ? 'Admitted' : 'Not Admitted'}
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        attendee.isSent ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {attendee.isSent ? 'QR Sent' : 'QR Not Sent'}
                      </div>
                    </div>
                    
                  </div>

                  {attendee.isSent && attendee.sentAt && (
                    <div className="text-xs text-gray-500 mt-1">
                      Sent on: {new Date(attendee.sentAt).toLocaleDateString()} at {new Date(attendee.sentAt).toLocaleTimeString()}
                    </div>
                  )}
                  
                  <div className="p-4 flex flex-col items-center">
                    <div className="mb-3 bg-white p-2 rounded-lg shadow-sm">
                      {attendee.qrCodeDataUrl ? (
                        <img src={attendee.qrCodeDataUrl} alt="QR Code" width={150} height={150} />
                      ) : (
                        <div className="w-[150px] h-[150px] flex items-center justify-center bg-gray-100">
                          <QrCode className="text-gray-400" size={50} />
                        </div>
                      )}
                    </div>

                    <div className="w-full text-center mb-3">
                      <div className="font-medium">{attendee.name}</div>
                      <div className="text-sm text-gray-500">Code: {attendee.code}</div>
                    </div>

                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => handleDownloadQRCode(attendee)}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center"
                      >
                        <Download size={14} className="mr-1" />
                        Download
                      </button>
                    </div>
                  </div>

                  {attendee.isExpanded && (
                    <div className="mt-4 w-full border-t pt-3">
                      <h4 className="text-sm font-medium mb-2 flex items-center">
                        <Users className="h-4 w-4 mr-1 text-gray-500" />
                        Associated Guests
                      </h4>
                      {attendee.relatedCodes.map((guest: AccessCode) => (
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
              ))}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col md:flex-row justify-between items-center mt-6">
                <div className="flex items-center mb-4 md:mb-0">
                  <label htmlFor="page-size" className="mr-2 text-sm text-gray-600">
                    Attendees per page:
                  </label>
                  <select
                    id="page-size"
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {pageSizeOptions.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
                
                <nav className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-1 rounded-md border bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum: number) => (
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
