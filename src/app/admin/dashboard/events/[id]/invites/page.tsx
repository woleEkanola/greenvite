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
  const [emailSubject, setEmailSubject] = useState('')
  const [enableEmail, setEnableEmail] = useState(true)
  const [enableWhatsApp, setEnableWhatsApp] = useState(true)
  const [sending, setSending] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewType, setPreviewType] = useState<'email' | 'whatsapp'>('email')
  const [previewRecipient, setPreviewRecipient] = useState<Recipient | null>(null)
  const [showMessageSettings, setShowMessageSettings] = useState(false)
  const [emailImage, setEmailImage] = useState<File | null>(null)
  const [emailImagePreview, setEmailImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

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
          
          // Set default templates based on event title
          if (data.title === "Jesse George Church Dedication") {
            setEmailSubject('Invitation to Jesse George Church Dedication')
            setEmailTemplate(`
<p>Dear {{name}},</p>

<p>We are pleased to invite you to the Church Dedication of Jesse Oghenekome George.</p>

<p>Please use the link below to confirm your attendance:</p>

<p><a href="{{link}}#{{code}}">{{link}}#{{code}}</a></p>

<p>Your unique registration code is: <strong>{{code}}</strong></p>

<p>We look forward to celebrating this special occasion with you.</p>

<p>Warm regards,<br>
The George Family</p>

{{Image}}
            `.trim())
            
            setWhatsappTemplate(`
Hello {{name}},

You are cordially invited to the Church Dedication of Jesse Oghenekome George.

Please use this link to confirm your attendance:
{{link}}#{{code}}

Your unique registration code is: *{{code}}*

We look forward to celebrating this special occasion with you.

Warm regards,
The George Family
            `.trim())
          } else {
            // Default templates for other events
            setEmailSubject(`Invitation to ${data.title}`)
            setEmailTemplate(`
<p>Dear {{name}},</p>

<p>We are pleased to invite you to ${data.title}.</p>

<p>Please use the link below to confirm your attendance:</p>

<p><a href="{{link}}#{{code}}">{{link}}#{{code}}</a></p>

<p>Your unique registration code is: <strong>{{code}}</strong></p>

<p>We look forward to celebrating with you.</p>

<p>Warm regards,<br>
The Event Team</p>

{{Image}}
            `.trim())
            
            setWhatsappTemplate(`
Hello {{name}},

You are cordially invited to ${data.title}.

Please use this link to confirm your attendance:
{{link}}#{{code}}

Your unique registration code is: *{{code}}*

We look forward to celebrating with you.

Warm regards,
The Event Team
            `.trim())
          }
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

  // Handle email image upload
  const handleEmailImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

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
    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }
  }

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
      
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('eventId', params.id)
      formData.append('subject', emailSubject)
      formData.append('emailTemplate', emailTemplate)
      formData.append('whatsappTemplate', whatsappTemplate)
      formData.append('enableEmail', String(enableEmail))
      formData.append('enableWhatsApp', String(enableWhatsApp))
      formData.append('recipients', JSON.stringify(invitesToCreate))
      
      if (emailImage) {
        formData.append('emailImage', emailImage)
      }
      
      // Send the invites
      const response = await fetch('/api/admin/send-invites', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        Swal.fire({
          title: 'Success!',
          text: 'Invites have been sent successfully',
          icon: 'success',
          confirmButtonText: 'View Sent Invites',
          showCancelButton: true,
          cancelButtonText: 'Send More',
          confirmButtonColor: '#10b981'
        }).then((result) => {
          if (result.isConfirmed) {
            window.location.href = `/admin/dashboard/events/${params.id}/sent-invites`
          } else {
            // Reset form for sending more invites
            setRecipients([{ name: '', email: '', phone: '', type: 'both' }])
          }
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send invites')
      }
    } catch (error) {
      console.error('Error sending invites:', error)
      Swal.fire({
        title: 'Error',
        text: error instanceof Error ? error.message : 'Failed to send invites',
        icon: 'error',
        confirmButtonText: 'Try Again'
      })
    } finally {
      setSending(false)
    }
  }

  // Show preview of message
  const showMessagePreview = (type: 'email' | 'whatsapp') => {
    if (recipients.length === 0) {
      toast.error('Please add at least one recipient to preview')
      return
    }
    
    setPreviewType(type)
    setPreviewRecipient(recipients[0])
    setShowPreview(true)
  }

  // Generate preview content
  const getPreviewContent = () => {
    if (!previewRecipient) return ''
    
    const name = previewRecipient.name || 'Guest'
    const code = 'SAMPLE123'
    const link = event?.slug ? `https://greenvites.online/${event.slug}` : 'https://greenvites.online/event'
    
    if (previewType === 'email') {
      let content = emailTemplate
        .replace(/{{name}}/g, name)
        .replace(/{{code}}/g, code)
        .replace(/{{link}}/g, link)
      
      // If there's an image preview, replace the {{Image}} placeholder
      if (emailImagePreview) {
        content = content.replace('{{Image}}', `<img src="${emailImagePreview}" alt="Event Image" style="max-width: 100%; margin-top: 20px;" />`)
      } else {
        content = content.replace('{{Image}}', '')
      }
      
      return content
    } else {
      return whatsappTemplate
        .replace(/{{name}}/g, name)
        .replace(/{{code}}/g, code)
        .replace(/{{link}}/g, link)
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">{loading ? 'Loading...' : `Send Invites: ${event?.title}`}</h1>
        <div className="flex space-x-2">
          <a 
            href={`/admin/dashboard/events/${params.id}/sent-invites`}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            View Sent Invites
          </a>
        </div>
      </div>

      <div className="space-y-8">
        {/* Channel Selection */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-medium mb-4">Invitation Channels</h2>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={enableEmail}
                onChange={() => setEnableEmail(!enableEmail)}
                className="form-checkbox h-5 w-5 text-emerald-500 rounded"
              />
              <span>Email</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={enableWhatsApp}
                onChange={() => setEnableWhatsApp(!enableWhatsApp)}
                className="form-checkbox h-5 w-5 text-emerald-500 rounded"
              />
              <span>WhatsApp</span>
            </label>
            
            <button
              type="button"
              onClick={() => setShowMessageSettings(!showMessageSettings)}
              className="ml-auto px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md flex items-center"
            >
              {showMessageSettings ? 'Hide Message Settings' : 'Customize Message Settings'}
              <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showMessageSettings ? 'rotate-180' : ''}`} />
            </button>
          </div>
          
          {/* Message Templates */}
          {showMessageSettings && (
            <div className="mt-6 border-t pt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Email Template */}
                {enableEmail && (
                  <div className="space-y-4">
                    <h3 className="font-medium">Email Template</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="Email subject"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Message
                      </label>
                      <RichTextEditor
                        value={emailTemplate}
                        onChange={setEmailTemplate}
                      />
                      <div className="mt-2 text-xs text-gray-500">
                        Available variables: {'{{name}}, {{code}}, {{link}}, {{Image}}'}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Image (optional)
                      </label>
                      <div className="flex items-center space-x-4">
                        <input
                          type="file"
                          ref={imageInputRef}
                          accept="image/*"
                          onChange={handleEmailImageUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          Choose Image
                        </button>
                        {emailImagePreview && (
                          <button
                            type="button"
                            onClick={clearEmailImage}
                            className="px-4 py-2 border border-red-300 text-red-500 rounded-md hover:bg-red-50"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {emailImagePreview && (
                        <div className="mt-2">
                          <div className="relative w-full h-32 bg-gray-100 rounded-md overflow-hidden">
                            <Image
                              src={emailImagePreview}
                              alt="Email image preview"
                              fill
                              style={{ objectFit: 'contain' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => showMessagePreview('email')}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                      >
                        Preview Email
                      </button>
                    </div>
                  </div>
                )}
                
                {/* WhatsApp Template */}
                {enableWhatsApp && (
                  <div className="space-y-4">
                    <h3 className="font-medium">WhatsApp Template</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Message
                      </label>
                      <textarea
                        value={whatsappTemplate}
                        onChange={(e) => setWhatsappTemplate(e.target.value)}
                        rows={12}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                      />
                      <div className="mt-2 text-xs text-gray-500">
                        Available variables: {'{{name}}, {{code}}, {{link}}'}
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => showMessagePreview('whatsapp')}
                        className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                      >
                        Preview WhatsApp
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
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
      
      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {previewType === 'email' ? 'Email Preview' : 'WhatsApp Preview'}
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {previewType === 'email' && (
              <div className="border rounded-md p-4">
                <div className="mb-2 pb-2 border-b">
                  <div className="text-sm text-gray-500">Subject:</div>
                  <div className="font-medium">{emailSubject}</div>
                </div>
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: getPreviewContent() }}
                />
              </div>
            )}
            
            {previewType === 'whatsapp' && (
              <div className="bg-gray-100 rounded-md p-4">
                <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500 font-mono whitespace-pre-wrap">
                  {getPreviewContent()}
                </div>
              </div>
            )}
            
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
