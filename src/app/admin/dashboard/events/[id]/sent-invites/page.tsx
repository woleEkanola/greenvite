'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Filter, RefreshCw, Send, Search, X } from 'lucide-react'
import Link from 'next/link'
import Swal from 'sweetalert2'
import Modal from '@/app/components/Modal'

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
    rsvpStatus: 'all', 
    type: 'all'
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [sendingReminders, setSendingReminders] = useState(false)
  const [selectAll, setSelectAll] = useState(false)
  const [settingDefaultTemplate, setSettingDefaultTemplate] = useState(false)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [recipientsToEdit, setRecipientsToEdit] = useState<any[]>([])

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
          
          // Check for default reminder template in localStorage
          const defaultReminderTemplateId = localStorage.getItem(`default_reminder_template_${params.id}`)
          
          if (defaultReminderTemplateId && templatesData.templates.some((t: MessageTemplate) => t.id === defaultReminderTemplateId)) {
            // If we have a stored default reminder template, use it
            setSelectedTemplate(defaultReminderTemplateId)
          } else if (templatesData.templates?.length > 0) {
            // Otherwise, use the default template or the first one
            const defaultTemplate = templatesData.templates?.find((t: MessageTemplate) => t.isDefault)
            if (defaultTemplate) {
              setSelectedTemplate(defaultTemplate.id)
            } else {
              setSelectedTemplate(templatesData.templates[0].id)
            }
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
    
    // Get the selected invites data
    const selectedInvitesData = filteredInvites.filter(invite => 
      selectedInvites.includes(invite.id)
    ).map(invite => ({
      id: invite.id,
      name: invite.name,
      email: invite.email,
      phone: invite.phone,
      type: invite.type,
      code: invite.code
    }))
    
    // Set the recipients to edit and show the modal
    setRecipientsToEdit(selectedInvitesData)
    setShowReminderModal(true)
  }
  
  const handleRecipientChange = (index: number, field: string, value: string) => {
    setRecipientsToEdit(prev => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        [field]: value
      }
      return updated
    })
  }
  
  const handleSendEditedReminders = async () => {
    // Confirm before sending
    const result = await Swal.fire({
      title: 'Send Reminders?',
      text: `Are you sure you want to send reminders to ${recipientsToEdit.length} recipient(s)?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, send reminders',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#3085d6', // Blue color for confirm button
      cancelButtonColor: '#d33' // Red color for cancel button
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
          recipients: recipientsToEdit.map(r => ({
            id: r.id,
            email: r.email,
            phone: r.phone,
            type: r.type
          })),
          templateId: selectedTemplate
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        Swal.fire({
          title: 'Reminders Sent!',
          html: `
            <p>Successfully sent ${data.sent} out of ${recipientsToEdit.length} reminders.</p>
            ${data.failed > 0 ? `<p>Failed to send ${data.failed} reminders.</p>` : ''}
            ${data.details ? `<p>Details: ${data.details}</p>` : ''}
          `,
          icon: 'success'
        })
        
        // Close the modal
        setShowReminderModal(false)
        
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

  const handleDeleteInvites = async () => {
    if (selectedInvites.length === 0) {
      Swal.fire({
        title: 'No Invites Selected',
        text: 'Please select at least one invite to delete.',
        icon: 'warning'
      })
      return
    }
    
    // Check if any of the selected invites have responded
    const respondedInvites = filteredInvites
      .filter(invite => selectedInvites.includes(invite.id))
      .filter(invite => invite.rsvpStatus && invite.rsvpStatus !== 'pending')
    
    if (respondedInvites.length > 0) {
      const result = await Swal.fire({
        title: 'Warning',
        html: `
          <p>${respondedInvites.length} of the selected invites have already responded.</p>
          <p>Deleting these invites will remove their responses. Are you sure you want to continue?</p>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete anyway',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#d33', 
        cancelButtonColor: '#3085d6' 
      })
      
      if (!result.isConfirmed) return
    } else {
      // Confirm deletion for non-responded invites
      const result = await Swal.fire({
        title: 'Delete Invites?',
        text: `Are you sure you want to delete ${selectedInvites.length} invite(s)? This will free up their codes for reuse.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete invites',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#d33', 
        cancelButtonColor: '#3085d6' 
      })
      
      if (!result.isConfirmed) return
    }
    
    try {
      // Show loading state
      Swal.fire({
        title: 'Deleting...',
        text: 'Please wait while we delete the selected invites.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading()
        }
      })
      
      // Send request to delete invites
      const response = await fetch(`/api/admin/events/${params.id}/invites/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inviteIds: selectedInvites
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        Swal.fire({
          title: 'Invites Deleted',
          text: `Successfully deleted ${data.deleted} invites. Their codes are now available for reuse.`,
          icon: 'success'
        })
        
        // Refresh the invites list
        handleRefresh()
        
        // Clear selection
        setSelectedInvites([])
        setSelectAll(false)
      } else {
        throw new Error(data.error || 'Failed to delete invites')
      }
    } catch (error) {
      console.error('Error deleting invites:', error)
      Swal.fire({
        title: 'Error',
        text: error instanceof Error ? error.message : 'Failed to delete invites',
        icon: 'error'
      })
    }
  }

  const handleSetDefaultTemplate = async () => {
    if (!selectedTemplate) {
      Swal.fire({
        title: 'No Template Selected',
        text: 'Please select a template to set as default for reminders.',
        icon: 'warning'
      })
      return
    }

    try {
      setSettingDefaultTemplate(true)
      
      // Save the default reminder template ID to localStorage for this event
      localStorage.setItem(`default_reminder_template_${params.id}`, selectedTemplate)
      
      // Find the template name for the success message
      const templateName = templates.find(t => t.id === selectedTemplate)?.name || 'Selected template'
      
      Swal.fire({
        title: 'Default Reminder Template Set',
        text: `${templateName} has been set as your default template for reminders.`,
        icon: 'success'
      })
    } catch (error) {
      console.error('Error setting default reminder template:', error)
      Swal.fire({
        title: 'Error',
        text: error instanceof Error ? error.message : 'Failed to set default reminder template',
        icon: 'error'
      })
    } finally {
      setSettingDefaultTemplate(false)
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
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </button>
            
            {selectedInvites.length > 0 && (
              <>
                <button
                  onClick={handleSendReminders}
                  disabled={sendingReminders}
                  className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {sendingReminders ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1" />
                      Send Reminders
                    </>
                  )}
                </button>
                
                <button
                  onClick={handleDeleteInvites}
                  className="flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                  Delete Selected
                </button>
              </>
            )}
          </div>
        </div>
        
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, email, phone, code..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
          
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-2">
            <div className="w-full">
              <select
                value={filterOptions.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="sent">Sent</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            
            <div className="w-full">
              <select
                value={filterOptions.rsvpStatus}
                onChange={(e) => handleFilterChange('rsvpStatus', e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All RSVP Statuses</option>
                <option value="not_responded">Not Responded</option>
                <option value="attending">Attending</option>
                <option value="not_attending">Not Attending</option>
                <option value="maybe">Maybe</option>
              </select>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-2">
            <div className="w-full">
              <select
                value={filterOptions.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="both">Both</option>
              </select>
            </div>
            
            <div className="w-full">
              <div className="flex items-center gap-2">
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Template for Reminders</option>
                  {templates.map((template) => {
                    const isDefaultReminder = localStorage.getItem(`default_reminder_template_${params.id}`) === template.id;
                    return (
                      <option key={template.id} value={template.id}>
                        {template.name} {isDefaultReminder ? '(Default for Reminders)' : ''}
                      </option>
                    );
                  })}
                </select>
                
                <button
                  onClick={handleSetDefaultTemplate}
                  disabled={settingDefaultTemplate || !selectedTemplate}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 whitespace-nowrap"
                  title="Set as default template for reminders"
                >
                  {settingDefaultTemplate ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                    </svg>
                  )}
                </button>
              </div>
              {localStorage.getItem(`default_reminder_template_${params.id}`) && (
                <p className="text-xs text-gray-500 mt-1">
                  Default reminder template: {templates.find(t => t.id === localStorage.getItem(`default_reminder_template_${params.id}`))?.name}
                </p>
              )}
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
      
      {/* Reminder Modal */}
      <Modal 
        isOpen={showReminderModal} 
        onClose={() => setShowReminderModal(false)}
        size="xlarge"
      >
        <div className="w-full overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Edit Recipients Before Sending</h3>
            <button 
              onClick={() => setShowReminderModal(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-gray-500">
              Review and edit recipient details before sending reminders. You can update email addresses, phone numbers, and message types.
            </p>
          </div>
          
          <div className="border rounded-md overflow-hidden mb-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recipientsToEdit.map((recipient, index) => (
                  <tr key={recipient.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{recipient.name}</div>
                      <div className="text-xs text-gray-500">Code: {recipient.code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="email"
                        value={recipient.email || ''}
                        onChange={(e) => handleRecipientChange(index, 'email', e.target.value)}
                        className="w-full px-2 py-1 text-sm border rounded-md"
                        placeholder="Email address"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={recipient.phone || ''}
                        onChange={(e) => handleRecipientChange(index, 'phone', e.target.value)}
                        className="w-full px-2 py-1 text-sm border rounded-md"
                        placeholder="Phone number"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={recipient.type}
                        onChange={(e) => handleRecipientChange(index, 'type', e.target.value)}
                        className="w-full px-2 py-1 text-sm border rounded-md"
                      >
                        <option value="email">Email</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="both">Both</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowReminderModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendEditedReminders}
              disabled={sendingReminders}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            >
              {sendingReminders ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 inline animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reminders'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
