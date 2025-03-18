'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import { Download, FileText, Send } from 'lucide-react'
import RichTextEditor from '@/components/RichTextEditor'
import DataTable from '@/components/DataTable'

interface Rsvp {
  id: string
  name: string
  email: string
  hasGuest: boolean
  hasDriver: boolean
  hasAide: boolean
  createdAt: string
  registrationCode: {
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
  const [messageModalOpen, setMessageModalOpen] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [messageType, setMessageType] = useState<'email' | 'sms' | 'both'>('email')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [emailSubject, setEmailSubject] = useState('Important Message from Jesse Oghenekome George')
  const [includeRegistrationCode, setIncludeRegistrationCode] = useState(true)
  const [emailMessage, setEmailMessage] = useState(`
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
  <h2 style="color: #2c3e50; text-align: center;">Message from Jesse Oghenekome George</h2>
  <p style="text-align: center; font-size: 18px;">Hello {{name}},</p>
  
  <div style="margin: 30px 0; background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
    <p style="text-align: center;">Thank you for confirming your attendance to our church dedication.</p>
    <p style="text-align: center;">We look forward to seeing you!</p>
    ${includeRegistrationCode ? '<p style="text-align: center;">Your registration code is: <strong>{{code}}</strong></p>' : ''}
    ${includeRegistrationCode ? '<p style="text-align: center;">Please use this link to access the event details: <a href="{{link}}">{{link}}</a></p>' : ''}
  </div>
  
  <p style="text-align: center; margin-top: 30px; color: #7f8c8d; font-size: 14px;">Best regards,<br>Jesse Oghenekome George</p>
</div>
  `)
  const [smsMessage, setSmsMessage] = useState(`Hello {{name}}, thank you for confirming your attendance to our church dedication. We look forward to seeing you! Best regards, Jesse Oghenekome George`)
  const [emailImage, setEmailImage] = useState<File | null>(null)
  const [emailImagePreview, setEmailImagePreview] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  // Check authentication
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin')
    }
  }, [status, router])

  // Fetch RSVPs
  const fetchRsvps = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/admin/rsvps?page=${pagination.page}&limit=${pagination.limit}&search=${search}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch RSVPs')
      }
      const data = await response.json()
      setRsvps(data.rsvps)
      setPagination(data.pagination)
    } catch (err) {
      setError('Error fetching RSVPs')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      fetchRsvps()
    }
  }, [session, pagination.page, pagination.limit, search])

  // Handle page change
  const handlePageChange = async (page: number) => {
    setPagination((prev) => ({ ...prev, page }))
    await fetchRsvps()
  }

  // Handle search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setPagination((prev) => ({ ...prev, page: 1 }))
    await fetchRsvps()
  }

  // Handle RSVP selection
  const handleSelectRsvp = (id: string) => {
    setSelectedRsvps(prev => {
      if (prev.includes(id)) {
        return prev.filter(rsvpId => rsvpId !== id)
      } else {
        return [...prev, id]
      }
    })
  }

  // Handle select all
  const handleSelectAll = () => {
    if (selectedRsvps.length === rsvps.length) {
      setSelectedRsvps([])
    } else {
      setSelectedRsvps(rsvps.map(rsvp => rsvp.id))
    }
  }

  // Handle send message
  const handleSendMessage = async () => {
    if (messageType === 'email' && !emailSubject.trim()) {
      Swal.fire('Error', 'Email subject cannot be empty', 'error')
      return
    }

    if ((messageType === 'email' || messageType === 'both') && !emailMessage.trim()) {
      Swal.fire('Error', 'Email message cannot be empty', 'error')
      return
    }

    if ((messageType === 'sms' || messageType === 'both') && !smsMessage.trim()) {
      Swal.fire('Error', 'SMS message cannot be empty', 'error')
      return
    }

    if (selectedRsvps.length === 0) {
      Swal.fire('Error', 'Please select at least one recipient', 'error')
      return
    }

    setSendingMessage(true)
    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('rsvpIds', JSON.stringify(selectedRsvps))
      formData.append('messageType', messageType)
      formData.append('emailSubject', emailSubject)
      formData.append('emailMessage', emailMessage)
      formData.append('smsMessage', smsMessage)
      formData.append('includeRegistrationCode', includeRegistrationCode.toString())
      
      if (emailImage) {
        formData.append('emailImage', emailImage)
      }

      const response = await fetch('/api/admin/rsvps/send-message', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const result = await response.json()
      Swal.fire(
        'Success', 
        `Messages sent successfully!
         ${result.results.emailsSent > 0 ? `Emails sent: ${result.results.emailsSent}` : ''}
         ${result.results.smsSent > 0 ? `SMS sent: ${result.results.smsSent}` : ''}
         ${result.results.failed > 0 ? `Failed: ${result.results.failed}` : ''}`, 
        'success'
      )
      setMessageModalOpen(false)
      setMessageText('')
      setSelectedRsvps([])
    } catch (err) {
      Swal.fire('Error', 'Failed to send message', 'error')
      console.error(err)
    } finally {
      setSendingMessage(false)
    }
  }

  // Handle email image change
  const handleEmailImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setEmailImage(file)
    
    // Create preview URL
    const reader = new FileReader()
    reader.onloadend = () => {
      setEmailImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Clear email image
  const clearEmailImage = () => {
    setEmailImage(null)
    setEmailImagePreview(null)
    const fileInput = document.getElementById('emailImage') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  // Handle export
  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(true)
    try {
      // Create URL with search parameters
      const url = `/api/admin/rsvps/export?format=${format}&search=${search}`
      
      // Open the URL in a new tab
      window.open(url, '_blank')
    } catch (err) {
      Swal.fire('Error', `Failed to export RSVPs as ${format.toUpperCase()}`, 'error')
      console.error(err)
    } finally {
      setExporting(false)
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (status === 'loading' || loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-6">RSVP Management</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">RSVP Management</h1>
        <div className="flex gap-2">
          <div className="dropdown relative">
            <button
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
              onClick={() => {
                const dropdown = document.getElementById('exportDropdown')
                if (dropdown) {
                  dropdown.classList.toggle('hidden')
                }
              }}
              disabled={exporting}
            >
              <Download size={16} />
              Export
              {exporting && (
                <span className="ml-2 inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
              )}
            </button>
            <div id="exportDropdown" className="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
              <div className="py-1">
                <button
                  onClick={() => handleExport('csv')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <FileText size={16} />
                    Export as CSV
                  </div>
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <FileText size={16} />
                    Export as PDF
                  </div>
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={() => setMessageModalOpen(true)}
            disabled={selectedRsvps.length === 0}
            className={`px-4 py-2 rounded-md flex items-center gap-2 ${
              selectedRsvps.length === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Send size={16} />
            Send Message ({selectedRsvps.length})
          </button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="bg-white p-4 rounded-md shadow-sm mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Search
          </button>
        </form>
      </div>

      {/* RSVP Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <DataTable
          data={rsvps}
          columns={[
            {
              header: 'Select',
              accessor: (rsvp: Rsvp) => (
                <input
                  type="checkbox"
                  checked={selectedRsvps.includes(rsvp.id)}
                  onChange={() => handleSelectRsvp(rsvp.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              ),
              searchable: false
            },
            {
              header: 'Name',
              accessor: 'name' as keyof Rsvp,
              searchable: true
            },
            {
              header: 'Email',
              accessor: 'email' as keyof Rsvp,
              searchable: true
            },
            {
              header: 'Code',
              accessor: (rsvp: Rsvp) => rsvp.registrationCode.code,
              searchable: true
            },
            {
              header: 'Guests',
              accessor: (rsvp: Rsvp) => (
                <div className="flex gap-2">
                  {rsvp.hasGuest && (
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      Guest
                    </span>
                  )}
                  {rsvp.hasDriver && (
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
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
              searchable: false
            },
            {
              header: 'Date',
              accessor: (rsvp: Rsvp) => formatDate(rsvp.createdAt),
              searchable: false
            }
          ]}
          itemsPerPage={pagination.limit}
          searchPlaceholder="Search RSVPs by name, email, or code..."
          emptyMessage={error || "No RSVPs found"}
          customHeader={
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedRsvps.length === rsvps.length && rsvps.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                />
                <span className="text-sm text-gray-700">Select All</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">
                  {selectedRsvps.length} selected
                </span>
              </div>
            </div>
          }
          useServerPagination={true}
          serverPaginationInfo={{
            currentPage: pagination.page,
            totalPages: pagination.totalPages,
            totalItems: pagination.total,
            onPageChange: handlePageChange
          }}
        />
      )}
      {/* Send Message Modal */}
      {messageModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Send Message to Selected RSVPs</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="messageType"
                      value="email"
                      checked={messageType === 'email'}
                      onChange={() => setMessageType('email')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Email</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="messageType"
                      value="sms"
                      checked={messageType === 'sms'}
                      onChange={() => setMessageType('sms')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">SMS</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="messageType"
                      value="both"
                      checked={messageType === 'both'}
                      onChange={() => setMessageType('both')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Both</span>
                  </label>
                </div>
              </div>
              
              {/* Email options */}
              {(messageType === 'email' || messageType === 'both') && (
                <div className="mb-4 border p-4 rounded-md">
                  <h3 className="font-medium mb-2">Email Settings</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Subject
                    </label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter email subject"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Message
                    </label>
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        checked={includeRegistrationCode}
                        onChange={(e) => setIncludeRegistrationCode(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-xs text-gray-500">
                        Include registration code in message
                      </label>
                    </div>
                    <RichTextEditor
                      value={emailMessage}
                      onChange={setEmailMessage}
                      placeholder="Enter your email message. You can use {{name}}, {{code}}, and {{link}} as placeholders."
                      height={300}
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Image (Optional)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="emailImage"
                        type="file"
                        accept="image/*"
                        onChange={handleEmailImageChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById('emailImage')?.click()}
                        className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 text-sm"
                      >
                        Choose Image
                      </button>
                      {emailImagePreview && (
                        <button
                          type="button"
                          onClick={clearEmailImage}
                          className="px-3 py-1 bg-red-100 text-red-600 rounded-md hover:bg-red-200 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    {emailImagePreview && (
                      <div className="mt-2">
                        <img
                          src={emailImagePreview}
                          alt="Email attachment preview"
                          className="max-h-40 rounded-md border"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* SMS options */}
              {(messageType === 'sms' || messageType === 'both') && (
                <div className="mb-4 border p-4 rounded-md">
                  <h3 className="font-medium mb-2">SMS Settings</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SMS Message
                    </label>
                    <textarea
                      value={smsMessage}
                      onChange={(e) => setSmsMessage(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your SMS message. You can use {{name}} as a placeholder."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Keep your message concise. SMS messages are typically limited to 160 characters.
                      {includeRegistrationCode && " You can use {{code}} to include the registration code and {{link}} to include the event link with the code."}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setMessageModalOpen(false)}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={sendingMessage}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                  {sendingMessage ? 'Sending...' : 'Send Message'}
                  {sendingMessage && (
                    <span className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
