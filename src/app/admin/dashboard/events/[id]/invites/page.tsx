'use client'

import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react'
import Swal from 'sweetalert2'
import * as XLSX from 'xlsx'
import Image from 'next/image'
import { X, Check, Mail, Phone, RefreshCw, Search, ChevronDown } from 'lucide-react'
import { z } from 'zod'
import RichTextEditor from '@/components/RichTextEditor'
import DataTable from '@/components/DataTable'
import { debounce } from 'lodash'
import { toast } from 'react-hot-toast'

interface Recipient {
  name: string
  email: string
  phone: string
  type: 'email' | 'whatsapp' | 'both'
  code?: string
}

// Memoized RecipientItem component to prevent unnecessary re-renders
const RecipientItem = memo(({ 
  recipient, 
  index, 
  onRemove, 
  onChange,
  enableEmail,
  enableWhatsApp
}: { 
  recipient: Recipient, 
  index: number, 
  onRemove: (index: number) => void, 
  onChange: (index: number, field: keyof Recipient, value: string) => void,
  enableEmail: boolean,
  enableWhatsApp: boolean
}) => {
  // Local memoized handlers to prevent new function creation on each render
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(index, 'name', e.target.value);
  }, [index, onChange]);

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(index, 'email', e.target.value);
  }, [index, onChange]);

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(index, 'phone', e.target.value);
  }, [index, onChange]);

  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(index, 'type', e.target.value as Recipient['type']);
  }, [index, onChange]);

  return (
    <div className="flex items-center space-x-2 p-2 border rounded-md mb-2 bg-white">
      <div className="flex-grow grid grid-cols-12 gap-2">
        <div className="col-span-3">
          <input
            type="text"
            placeholder="Name"
            value={recipient.name}
            onChange={handleNameChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="col-span-3">
          <div className="relative">
            <Mail className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="email"
              placeholder="Email"
              value={recipient.email}
              onChange={handleEmailChange}
              disabled={!enableEmail}
              className={`w-full p-2 pl-8 border rounded ${!enableEmail ? 'bg-gray-100' : ''}`}
            />
          </div>
        </div>
        <div className="col-span-3">
          <div className="relative">
            <Phone className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="tel"
              placeholder="WhatsApp Number"
              value={recipient.phone}
              onChange={handlePhoneChange}
              disabled={!enableWhatsApp}
              className={`w-full p-2 pl-8 border rounded ${!enableWhatsApp ? 'bg-gray-100' : ''}`}
            />
          </div>
        </div>
        <div className="col-span-3">
          <select
            value={recipient.type}
            onChange={handleTypeChange}
            className="w-full p-2 border rounded"
            disabled={!(enableEmail && enableWhatsApp)}
          >
            {enableEmail && enableWhatsApp && <option value="both">Email & WhatsApp</option>}
            {enableEmail && <option value="email">Email Only</option>}
            {enableWhatsApp && <option value="whatsapp">WhatsApp Only</option>}
          </select>
        </div>
      </div>
      <button
        onClick={() => onRemove(index)}
        className="p-1 rounded-full hover:bg-red-100"
        aria-label="Remove recipient"
      >
        <X size={20} className="text-red-500" />
      </button>
    </div>
  );
});

RecipientItem.displayName = 'RecipientItem';

// Memoized TextAreaWithCounter component
const TextAreaWithCounter = memo(({ 
  value, 
  onChange, 
  maxLength 
}: { 
  value: string, 
  onChange: (value: string) => void, 
  maxLength: number 
}) => {
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-3 border rounded-md"
        rows={4}
        maxLength={maxLength}
      />
      <div className="absolute bottom-2 right-2 text-xs text-gray-500">
        {value.length}/{maxLength}
      </div>
    </div>
  );
});

TextAreaWithCounter.displayName = 'TextAreaWithCounter';

export default function EventInvitesPage({ params }: { params: { id: string } }) {
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [emailTemplate, setEmailTemplate] = useState('')
  const [whatsappTemplate, setWhatsappTemplate] = useState('')
  const [enableEmail, setEnableEmail] = useState(true)
  const [enableWhatsApp, setEnableWhatsApp] = useState(true)
  const [sending, setSending] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewType, setPreviewType] = useState<'email' | 'whatsapp'>('email')
  const [previewRecipient, setPreviewRecipient] = useState<Recipient | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Validation schema for recipients
  const recipientSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    phone: z.string().min(10, 'Invalid phone number').optional().or(z.literal('')),
    type: z.enum(['email', 'whatsapp', 'both'])
  })

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true)
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
      } finally {
        setLoading(false)
      }
    }

    fetchEvent()
  }, [params.id])

  // Add a new empty recipient
  const addRecipient = useCallback(() => {
    setRecipients(prev => [...prev, { name: '', email: '', phone: '', type: 'both' }])
  }, [])

  // Remove a recipient by index
  const removeRecipient = useCallback((index: number) => {
    setRecipients(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Update a recipient field
  const updateRecipient = useCallback((index: number, field: keyof Recipient, value: string) => {
    setRecipients(prev => 
      prev.map((recipient, i) => 
        i === index ? { ...recipient, [field]: value } : recipient
      )
    )
  }, [])

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        
        const newRecipients = jsonData.map((row: any) => ({
          name: row.name || row.Name || '',
          email: row.email || row.Email || '',
          phone: row.phone || row.Phone || row.WhatsApp || '',
          type: 'both' as const
        }))
        
        setRecipients(prev => [...prev, ...newRecipients])
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        
        toast.success(`Imported ${newRecipients.length} recipients`)
      } catch (error) {
        console.error('Error parsing Excel file:', error)
        toast.error('Failed to parse Excel file. Please check the format.')
      }
    }
    reader.readAsArrayBuffer(file)
  }, [])

  // Validate all recipients
  const validateRecipients = useCallback(() => {
    const errors: string[] = []
    
    recipients.forEach((recipient, index) => {
      try {
        // Validate based on selected type
        if (recipient.type === 'email' || recipient.type === 'both') {
          if (!recipient.email) {
            errors.push(`Recipient #${index + 1} (${recipient.name || 'Unnamed'}): Email is required`)
          }
        }
        
        if (recipient.type === 'whatsapp' || recipient.type === 'both') {
          if (!recipient.phone) {
            errors.push(`Recipient #${index + 1} (${recipient.name || 'Unnamed'}): Phone number is required`)
          }
        }
        
        if (!recipient.name) {
          errors.push(`Recipient #${index + 1}: Name is required`)
        }
        
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach(err => {
            errors.push(`Recipient #${index + 1}: ${err.message}`)
          })
        }
      }
    })
    
    return errors
  }, [recipients])

  // Handle send invites
  const handleSendInvites = async () => {
    // Validate templates based on enabled channels
    if (enableEmail && !emailTemplate.trim()) {
      toast.error('Email template is required when Email is enabled')
      return
    }
    
    if (enableWhatsApp && !whatsappTemplate.trim()) {
      toast.error('WhatsApp template is required when WhatsApp is enabled')
      return
    }
    
    // Validate recipients
    if (recipients.length === 0) {
      toast.error('Please add at least one recipient')
      return
    }
    
    const validationErrors = validateRecipients()
    if (validationErrors.length > 0) {
      Swal.fire({
        title: 'Validation Errors',
        html: `<ul class="text-left">${validationErrors.map(err => `<li>${err}</li>`).join('')}</ul>`,
        icon: 'error',
        confirmButtonText: 'Fix Issues'
      })
      return
    }
    
    // Confirm before sending
    const result = await Swal.fire({
      title: 'Send Invites?',
      html: `You are about to send invites to <b>${recipients.length}</b> recipients. This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, send invites',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#10b981'
    })
    
    if (!result.isConfirmed) return
    
    try {
      setSending(true)
      
      // Prepare the data for API
      const invitesToCreate = recipients.map(recipient => ({
        name: recipient.name,
        email: recipient.email,
        phone: recipient.phone,
        type: recipient.type
      }))
      
      // First, create the invites
      const createResponse = await fetch(`/api/admin/events/${params.id}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ invites: invitesToCreate })
      })
      
      if (!createResponse.ok) {
        throw new Error('Failed to create invites')
      }
      
      const createData = await createResponse.json()
      
      // Then, send the invites
      const sendResponse = await fetch(`/api/admin/events/${params.id}/sent-invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inviteIds: createData.invites.map((invite: any) => invite.id),
          emailTemplate: enableEmail ? emailTemplate : null,
          whatsappTemplate: enableWhatsApp ? whatsappTemplate : null
        })
      })
      
      if (!sendResponse.ok) {
        throw new Error('Failed to send invites')
      }
      
      const sendData = await sendResponse.json()
      
      toast.success(`Successfully sent ${sendData.count} invites`)
      
      // Reset form
      setRecipients([])
      setEmailTemplate('')
      setWhatsappTemplate('')
      
    } catch (error) {
      console.error('Error sending invites:', error)
      toast.error('Failed to send invites. Please try again.')
    } finally {
      setSending(false)
    }
  }

  // Show preview dialog
  const showPreviewDialog = (type: 'email' | 'whatsapp') => {
    if (recipients.length === 0) {
      toast.error('Please add at least one recipient to preview')
      return
    }
    
    setPreviewType(type)
    setPreviewRecipient(recipients[0])
    setShowPreview(true)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">{event?.title} - Send Invites</h1>
        <p className="text-gray-600">
          Create and send invitations for this event.
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Invitation Channels</h2>
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={enableEmail}
                onChange={(e) => setEnableEmail(e.target.checked)}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
              />
              <span>Email</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={enableWhatsApp}
                onChange={(e) => setEnableWhatsApp(e.target.checked)}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
              />
              <span>WhatsApp</span>
            </label>
          </div>
        </div>
        
        {enableEmail && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">Email Template</h2>
              <button
                onClick={() => showPreviewDialog('email')}
                className="text-sm text-blue-600 hover:text-blue-800"
                disabled={!emailTemplate.trim() || recipients.length === 0}
              >
                Preview
              </button>
            </div>
            <RichTextEditor
              value={emailTemplate}
              onChange={setEmailTemplate}
              placeholder="Enter your email template here..."
            />
            <div className="mt-2 text-sm text-gray-500">
              You can use placeholders like <code className="bg-gray-100 px-1 rounded">{'{{name}}'}</code> for recipient's name.
            </div>
          </div>
        )}
        
        {enableWhatsApp && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">WhatsApp Template</h2>
              <button
                onClick={() => showPreviewDialog('whatsapp')}
                className="text-sm text-blue-600 hover:text-blue-800"
                disabled={!whatsappTemplate.trim() || recipients.length === 0}
              >
                Preview
              </button>
            </div>
            <TextAreaWithCounter
              value={whatsappTemplate}
              onChange={setWhatsappTemplate}
              maxLength={1000}
            />
            <div className="mt-2 text-sm text-gray-500">
              Keep your WhatsApp message concise. You can use placeholders like <code className="bg-gray-100 px-1 rounded">{'{{name}}'}</code>.
            </div>
          </div>
        )}
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Recipients ({recipients.length})</h2>
            <div className="flex space-x-2">
              <button
                onClick={addRecipient}
                className="px-3 py-1 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 text-sm"
              >
                Add Recipient
              </button>
              <div className="relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                >
                  Import Excel/CSV
                </button>
              </div>
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto border rounded-md bg-gray-50 p-2">
            {recipients.length > 0 ? (
              recipients.map((recipient, index) => (
                <RecipientItem
                  key={index}
                  recipient={recipient}
                  index={index}
                  onRemove={removeRecipient}
                  onChange={updateRecipient}
                  enableEmail={enableEmail}
                  enableWhatsApp={enableWhatsApp}
                />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No recipients added yet. Add recipients manually or import from Excel/CSV.
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={handleSendInvites}
            disabled={sending || recipients.length === 0 || (!enableEmail && !enableWhatsApp)}
            className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {sending ? (
              <>
                <RefreshCw className="animate-spin mr-2" size={18} />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2" size={18} />
                Send Invites
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Preview Dialog */}
      {showPreview && previewRecipient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">
                {previewType === 'email' ? 'Email Preview' : 'WhatsApp Preview'}
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="text-sm text-gray-500 mb-1">Recipient:</div>
              <div className="font-medium">{previewRecipient.name}</div>
              {previewType === 'email' && (
                <div className="text-gray-600">{previewRecipient.email}</div>
              )}
              {previewType === 'whatsapp' && (
                <div className="text-gray-600">{previewRecipient.phone}</div>
              )}
            </div>
            
            <div className="border rounded-md p-4 bg-gray-50">
              {previewType === 'email' ? (
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: emailTemplate.replace(/{{name}}/g, previewRecipient.name) 
                  }} 
                />
              ) : (
                <div className="whitespace-pre-wrap">
                  {whatsappTemplate.replace(/{{name}}/g, previewRecipient.name)}
                </div>
              )}
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
