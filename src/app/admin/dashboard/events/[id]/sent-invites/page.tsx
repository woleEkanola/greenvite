'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Filter, RefreshCw, Send, Search } from 'lucide-react'
import Link from 'next/link'
import Swal from 'sweetalert2'

interface Invite {
  id: string
  name: string
  email: string
  phone: string
  type: 'email' | 'whatsapp' | 'both'
  status: string
  rsvpStatus: string | null
  emailStatus: string
  whatsappStatus: string
  code: string
  createdAt: string
  updatedAt: string
}

interface MessageTemplate {
  id: string
  name: string
  emailSubject: string
  emailContent: string
  whatsappContent: string
  isDefault: boolean
  imageUrl?: string
  createdAt: string
  updatedAt: string
  eventId: string
}

export default function EventSentInvitesPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<any>(null)
  const [invites, setInvites] = useState<Invite[]>([])
  const [filteredInvites, setFilteredInvites] = useState<Invite[]>([])
  const [selectedInvites, setSelectedInvites] = useState<string[]>([])
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [filterOptions, setFilterOptions] = useState({
    status: 'all',
    rsvpStatus: 'all', // Changed from 'not_responded' to 'all' to show all invites by default
    type: 'all'
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [sendingReminders, setSendingReminders] = useState(false)
  const [selectAll, setSelectAll] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch event details
        const eventResponse = await fetch(`/api/admin/events/${params.id}`)
        if (!eventResponse.ok) {
          throw new Error('Failed to fetch event')
        }
        const eventData = await eventResponse.json()
        setEvent(eventData)
        
        // Fetch sent invites
        const invitesResponse = await fetch(`/api/admin/events/${params.id}/invites`)
        if (!invitesResponse.ok) {
          throw new Error('Failed to fetch invites')
        }
        const invitesData = await invitesResponse.json()
        setInvites(invitesData.invites || [])
        
        // Fetch message templates
        const templatesResponse = await fetch(`/api/admin/events/${params.id}/message-templates`)
        if (templatesResponse.ok) {
          const templatesData = await templatesResponse.json()
          setTemplates(templatesData.templates || [])
          
          // Set default template if available
          const defaultTemplate = templatesData.templates?.find((t: MessageTemplate) => t.isDefault)
          if (defaultTemplate) {
            setSelectedTemplate(defaultTemplate.id)
          } else if (templatesData.templates?.length > 0) {
            setSelectedTemplate(templatesData.templates[0].id)
          }
        }
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
  }, [params.id])
  
  // Apply filters whenever invites or filter options change
  useEffect(() => {
    applyFilters()
  }, [invites, filterOptions, searchQuery])
  
  // Update selected invites when selectAll changes
  useEffect(() => {
    if (selectAll) {
      setSelectedInvites(filteredInvites.map(invite => invite.id))
    } else {
      setSelectedInvites([])
    }
  }, [selectAll, filteredInvites])
  
  const applyFilters = () => {
    let filtered = [...invites]
    
    // Filter by status
    if (filterOptions.status !== 'all') {
      filtered = filtered.filter(invite => invite.status === filterOptions.status)
    }
    
    // Filter by RSVP status
    if (filterOptions.rsvpStatus === 'not_responded') {
      filtered = filtered.filter(invite => !invite.rsvpStatus || invite.rsvpStatus === 'pending')
    } else if (filterOptions.rsvpStatus !== 'all') {
      filtered = filtered.filter(invite => invite.rsvpStatus === filterOptions.rsvpStatus)
    }
    
    // Filter by invite type
    if (filterOptions.type !== 'all') {
      filtered = filtered.filter(invite => invite.type === filterOptions.type)
    }
    
    // Apply search query if present
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(invite => 
        invite.name.toLowerCase().includes(query) ||
        (invite.email && invite.email.toLowerCase().includes(query)) ||
        (invite.phone && invite.phone.toLowerCase().includes(query)) ||
        (invite.code && invite.code.toLowerCase().includes(query))
      )
    }
    
    setFilteredInvites(filtered)
  }
  
  const handleFilterChange = (field: string, value: string) => {
    setFilterOptions(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Reset selection when filter changes
    setSelectedInvites([])
    setSelectAll(false)
  }
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }
  
  const handleSelectInvite = (id: string) => {
    setSelectedInvites(prev => {
      if (prev.includes(id)) {
        return prev.filter(inviteId => inviteId !== id)
      } else {
        return [...prev, id]
      }
    })
  }
  
  const handleRefresh = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/events/${params.id}/invites`)
      if (response.ok) {
        const data = await response.json()
        setInvites(data.invites || [])
      } else {
        throw new Error('Failed to refresh invites')
      }
    } catch (error) {
      console.error('Error refreshing invites:', error)
      Swal.fire({
        title: 'Error',
        text: 'Failed to refresh invites. Please try again.',
        icon: 'error'
      })
    } finally {
      setLoading(false)
    }
  }
  
  const handleSendReminders = async () => {
    if (selectedInvites.length === 0) {
      Swal.fire({
        title: 'No Invites Selected',
        text: 'Please select at least one invite to send a reminder.',
        icon: 'warning'
      })
      return
    }
    
    if (!selectedTemplate) {
      Swal.fire({
        title: 'No Template Selected',
        text: 'Please select a message template for the reminder.',
        icon: 'warning'
      })
      return
    }
    
    // Confirm before sending
    const result = await Swal.fire({
      title: 'Send Reminders?',
      text: `Are you sure you want to send reminders to ${selectedInvites.length} recipient(s)?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, send reminders',
      cancelButtonText: 'Cancel'
    })
    
    if (!result.isConfirmed) return
    
    try {
      setSendingReminders(true)
      
      const response = await fetch(`/api/admin/events/${params.id}/invites/remind`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inviteIds: selectedInvites,
          templateId: selectedTemplate
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        Swal.fire({
          title: 'Reminders Sent!',
          html: `
            <p>Successfully sent ${data.sent} out of ${selectedInvites.length} reminders.</p>
            ${data.failed > 0 ? `<p>Failed to send ${data.failed} reminders.</p>` : ''}
            ${data.details ? `<p>Details: ${data.details}</p>` : ''}
          `,
          icon: 'success'
        })
        
        // Refresh the invites list
        handleRefresh()
        
        // Clear selection
        setSelectedInvites([])
        setSelectAll(false)
      } else {
        throw new Error(data.error || 'Failed to send reminders')
      }
    } catch (error) {
      console.error('Error sending reminders:', error)
      Swal.fire({
        title: 'Error',
        text: error instanceof Error ? error.message : 'Failed to send reminders',
        icon: 'error'
      })
    } finally {
      setSendingReminders(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center mb-6">
        <Link 
          href={`/admin/dashboard/events/${params.id}`}
          className="mr-4 p-2 hover:bg-gray-100 rounded-full"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">Sent Invites</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h2 className="text-xl font-bold mb-4 sm:mb-0">Sent Invites</h2>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64 mb-2 sm:mb-0">
              <input
                type="text"
                placeholder="Search by name, email, phone, code..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            <button
              onClick={() => {}}
              className="flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invite Status
              </label>
              <select
                value={filterOptions.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                RSVP Status
              </label>
              <select
                value={filterOptions.rsvpStatus}
                onChange={(e) => handleFilterChange('rsvpStatus', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="all">All RSVP Statuses</option>
                <option value="not_responded">Not Responded</option>
                <option value="attending">Attending</option>
                <option value="pending">Pending</option>
                <option value="maybe">Maybe</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invite Type
              </label>
              <select
                value={filterOptions.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="all">All Types</option>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <div className="flex items-center">
              <h2 className="text-lg font-semibold mr-2">Invites</h2>
              <span className="bg-gray-200 text-gray-700 text-xs font-medium px-2 py-1 rounded-full">
                {filteredInvites.length}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
                title="Refresh"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>
          
          {filteredInvites.length > 0 ? (
            <>
              <div className="p-4 border-b">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={() => setSelectAll(!selectAll)}
                      className="mr-2 h-4 w-4"
                    />
                    <span className="text-sm font-medium">
                      {selectedInvites.length} selected
                    </span>
                  </div>
                  
                  <div className="flex flex-col md:flex-row md:items-center gap-2">
                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="p-2 border rounded-md"
                      disabled={templates.length === 0}
                    >
                      {templates.length === 0 ? (
                        <option value="">No templates available</option>
                      ) : (
                        <>
                          <option value="">Select a template</option>
                          {templates.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    
                    <button
                      onClick={handleSendReminders}
                      disabled={selectedInvites.length === 0 || !selectedTemplate || sendingReminders}
                      className="flex items-center justify-center px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingReminders ? (
                        <>
                          <RefreshCw size={16} className="mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send size={16} className="mr-2" />
                          Send Reminders
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <span className="sr-only">Select</span>
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Code
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        RSVP
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sent At
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredInvites.map((invite) => (
                      <tr key={invite.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedInvites.includes(invite.id)}
                            onChange={() => handleSelectInvite(invite.id)}
                            className="h-4 w-4"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{invite.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {invite.email && <div>{invite.email}</div>}
                            {invite.phone && <div>{invite.phone}</div>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {invite.code || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {invite.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            {invite.type === 'email' || invite.type === 'both' ? (
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                invite.emailStatus === 'sent' ? 'bg-green-100 text-green-800' :
                                invite.emailStatus === 'failed' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                Email: {invite.emailStatus}
                              </span>
                            ) : null}
                            
                            {invite.type === 'whatsapp' || invite.type === 'both' ? (
                              <span className={`mt-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                invite.whatsappStatus === 'sent' ? 'bg-green-100 text-green-800' :
                                invite.whatsappStatus === 'failed' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                WhatsApp: {invite.whatsappStatus}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            !invite.rsvpStatus || invite.rsvpStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            invite.rsvpStatus === 'attending' ? 'bg-green-100 text-green-800' :
                            invite.rsvpStatus === 'not_attending' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {!invite.rsvpStatus || invite.rsvpStatus === 'pending' ? 'Not Responded' : 
                             invite.rsvpStatus.charAt(0).toUpperCase() + invite.rsvpStatus.slice(1).replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(invite.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p>No invites found matching the current filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
