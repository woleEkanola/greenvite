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

  const handleRemoveClick = useCallback(() => {
    onRemove(index);
  }, [index, onRemove]);

  return (
    <div className="p-4 border rounded-lg relative mb-4">
      {index > 0 && (
        <button
          type="button"
          onClick={handleRemoveClick}
          className="absolute top-2 right-2 text-red-500 hover:text-red-700"
        >
          ×
        </button>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Name
          </label>
          <input
            type="text"
            value={recipient.name}
            onChange={handleNameChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            value={recipient.email}
            onChange={handleEmailChange}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 ${!enableEmail && 'opacity-50'}`}
            required={recipient.type === 'email' || (recipient.type === 'both' && enableEmail)}
            disabled={!enableEmail}
          />
        </div>
        
        <div>
          <div className="text-xs text-gray-500 mb-1">
            Phone (format: +234XXXXXXXXXX)
          </div>
          <input
            type="tel"
            value={recipient.phone}
            onChange={handlePhoneChange}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 ${!enableWhatsApp && 'opacity-50'}`}
            required={recipient.type === 'whatsapp' || (recipient.type === 'both' && enableWhatsApp)}
            disabled={!enableWhatsApp}
            placeholder="+234XXXXXXXXXX"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Send via
          </label>
          <select
            value={recipient.type}
            onChange={handleTypeChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {enableWhatsApp && <option value="whatsapp">WhatsApp</option>}
            {enableEmail && <option value="email">Email</option>}
            {enableEmail && enableWhatsApp && <option value="both">Both</option>}
          </select>
        </div>
      </div>
    </div>
  );
});

// Make sure DisplayName is set for debugging
RecipientItem.displayName = 'RecipientItem';

// Memoized EmailMessageEditor component
const EmailMessageEditor = memo(({ 
  value, 
  onChange, 
  disabled 
}: { 
  value: string, 
  onChange: (value: string) => void, 
  disabled?: boolean 
}) => {
  return (
    <RichTextEditor
      value={value}
      onChange={onChange}
      disabled={disabled}
      simpleMode={true} // Use simple mode for better performance
    />
  );
});

EmailMessageEditor.displayName = 'EmailMessageEditor';

// Memoized WhatsAppMessageEditor component
const WhatsAppMessageEditor = memo(({ 
  value, 
  onChange, 
  disabled 
}: { 
  value: string, 
  onChange: (value: string) => void, 
  disabled?: boolean 
}) => {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={8}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
      disabled={disabled}
    />
  );
});

WhatsAppMessageEditor.displayName = 'WhatsAppMessageEditor';

export default function SendInvites() {
  const [recipients, setRecipients] = useState<Recipient[]>([{ name: '', email: '', phone: '', type: 'whatsapp' }])
  const [isSending, setIsSending] = useState(false)
  const [previewData, setPreviewData] = useState<Recipient[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [enableEmail, setEnableEmail] = useState(true)
  const [enableWhatsApp, setEnableWhatsApp] = useState(true)
  const [showMessageSettings, setShowMessageSettings] = useState(false)
  const [emailSubject, setEmailSubject] = useState('You are invited!')
  const [emailMessage, setEmailMessage] = useState('Confirm Your Attendance\n{{Image}}\nClick the "Confirm Your Attendance" button below to complete the form and secure your reservation. This will help us plan accordingly. Attendance is by invitation only, and submitting the completed form will grant you an access code for the event.\n{{link}}\nConfirm Your Attendance')
  const [whatsappMessage, setWhatsappMessage] = useState('Hello {{name}}, Click the link below to complete the form and secure your reservation. This will help us plan accordingly. Attendance is by invitation only, and submitting the completed form will grant you an access code for the event. {{link}}')
  const [eventLink, setEventLink] = useState('https://greenvites.online/jessegeorge')
  const [emailImage, setEmailImage] = useState<File | null>(null)
  const [emailImagePreview, setEmailImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Add recipient to the list
  const handleAddRecipient = () => {
    setRecipients([...recipients, { name: '', email: '', phone: '', type: 'whatsapp' }])
  }

  // Remove recipient from the list
  const handleRemoveRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index))
  }

  // Memoize the formatting function to avoid recreation on each render
  const formatPhoneNumber = useMemo(() => {
    return (phone: string) => {
      if (!phone) return '';
      
      // Keep only digits and + symbol
      let formatted = phone.replace(/[^\d+]/g, '');
      
      // If it doesn't start with +, check format
      if (!formatted.startsWith('+')) {
        // If it starts with 234, add +
        if (formatted.startsWith('234')) {
          formatted = '+' + formatted;
        } else if (formatted.startsWith('0')) {
          // If it starts with 0, replace with +234
          formatted = '+234' + formatted.substring(1);
        } else {
          // Otherwise, add +234 prefix
          formatted = '+234' + formatted;
        }
      }
      
      return formatted;
    };
  }, []);

  // Two-stage debounced recipient change handling
  // Stage 1: Raw input handler that updates UI immediately for better responsiveness
  const handleRecipientChange = useCallback((index: number, field: keyof Recipient, value: string) => {
    const updatedRecipients = [...recipients];
    
    // For UI responsiveness, update with raw value first
    updatedRecipients[index] = {
      ...updatedRecipients[index],
      [field]: value
    };
    
    setRecipients(updatedRecipients);
    
    // Then debounce the formatting and validation
    if (field === 'phone') {
      debouncedPhoneFormatting(index, value);
    }
  }, [recipients]);

  // Stage 2: Debounced formatter that runs after user stops typing
  const debouncedPhoneFormatting = useCallback(
    debounce((index: number, value: string) => {
      setRecipients(prevRecipients => {
        // Avoid unnecessary state updates if component unmounted or value already changed
        if (!prevRecipients[index] || prevRecipients[index].phone !== value) {
          return prevRecipients;
        }
        
        const updatedRecipients = [...prevRecipients];
        updatedRecipients[index] = {
          ...updatedRecipients[index],
          phone: formatPhoneNumber(value)
        };
        
        return updatedRecipients;
      });
    }, 500), // Longer delay for phone formatting as it's more expensive
    [formatPhoneNumber]
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws) as any[]

        const formattedData: Recipient[] = data.map(row => ({
          name: row.name || '',
          email: row.email || '',
          phone: row.phone || '',
          type: row.type || 'whatsapp'
        }))

        setPreviewData(formattedData)
        setShowPreview(true)
      } catch (error) {
        console.error('Error parsing file:', error)
        Swal.fire('Error', 'Failed to parse file. Please check the format.', 'error')
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleConfirmUpload = () => {
    setRecipients(previewData)
    setShowPreview(false)
    setPreviewData([])
  }

  const downloadTemplate = () => {
    const template = [
      { name: 'John Doe', email: 'john@example.com', phone: '+2348012345678', type: 'both' },
      { name: 'Jane Smith', email: 'jane@example.com', phone: '', type: 'email' },
      { name: 'Bob Johnson', email: '', phone: '+2348012345679', type: 'whatsapp' }
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, 'invite-template.xlsx')
  }

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

  const clearEmailImage = () => {
    setEmailImage(null)
    setEmailImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const prepareRecipientData = () => {
    return recipients.map(recipient => {
      // Determine the type based on available contact info and user preference
      let type: 'email' | 'whatsapp' | 'both' = 'email' // Default to email
      
      if (recipient.email && recipient.phone) {
        type = 'both'
      } else if (recipient.email) {
        type = 'email'
      } else if (recipient.phone) {
        type = 'whatsapp'
      }
      
      return {
        ...recipient,
        type
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSending(true)

    try {
      // Filter recipients based on global toggles
      let validRecipients = prepareRecipientData()
      
      if (!enableEmail && !enableWhatsApp) {
        throw new Error('Both email and WhatsApp are disabled. Please enable at least one channel.')
      }
      
      // Apply global toggles to recipient types
      validRecipients = validRecipients.map(r => {
        let type = r.type
        
        // If recipient is set to 'both', but one channel is disabled globally
        if (type === 'both') {
          if (!enableEmail) type = 'whatsapp'
          else if (!enableWhatsApp) type = 'email'
        }
        // If recipient's channel is disabled globally
        else if ((type === 'email' && !enableEmail) || (type === 'whatsapp' && !enableWhatsApp)) {
          // Try to use the other channel if available
          if (type === 'email' && enableWhatsApp && r.phone) type = 'whatsapp'
          else if (type === 'whatsapp' && enableEmail && r.email) type = 'email'
          // If no alternative channel is available, keep the original type
          // The recipient will be filtered out in the next step
        }
        
        return { ...r, type }
      })
      
      // Further filter recipients based on contact info
      validRecipients = validRecipients.filter(r => 
        (r.type === 'email' && r.email) || 
        (r.type === 'whatsapp' && r.phone) ||
        (r.type === 'both' && ((enableEmail && r.email) || (enableWhatsApp && r.phone)))
      )

      if (validRecipients.length === 0) {
        throw new Error('No valid recipients found after applying channel filters')
      }

      // Create FormData for file upload
      const formData = new FormData()
      formData.append('emailSubject', emailSubject)
      formData.append('emailMessage', emailMessage)
      formData.append('whatsappMessage', whatsappMessage)
      formData.append('eventLink', eventLink)
      formData.append('enableEmail', String(enableEmail))
      formData.append('enableWhatsApp', String(enableWhatsApp))
      
      if (emailImage) {
        formData.append('emailImage', emailImage)
      }
      
      formData.append('recipients', JSON.stringify(validRecipients))

      const response = await fetch('/api/admin/send-invites', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        try {
          const data = await response.json()
          Swal.fire({
            title: 'Success',
            text: 'Invites sent successfully!',
            icon: 'success',
            showCancelButton: true,
            confirmButtonColor: '#10B981',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'View Sent Invites',
            cancelButtonText: 'Send More',
          }).then((result) => {
            // Reset the form regardless
            setRecipients([{ name: '', email: '', phone: '', type: 'whatsapp' }])
            
            // If user clicked View Sent Invites, redirect to the sent-invites page
            if (result.isConfirmed) {
              window.location.href = '/admin/dashboard/sent-invites'
            }
          })
        } catch (jsonError) {
          console.error('Error parsing success response:', jsonError)
          // If we can't parse the JSON but the response was OK, still show success
          Swal.fire({
            title: 'Success',
            text: 'Invites sent successfully!',
            icon: 'success',
          })
          setRecipients([{ name: '', email: '', phone: '', type: 'whatsapp' }])
        }
      } else {
        let errorMessage = 'Failed to send invites. Please try again.'
        try {
          const error = await response.json()
          errorMessage = error.error || error.message || errorMessage
        } catch (jsonError) {
          console.error('Error parsing error response:', jsonError)
          // If we can't parse the JSON, use the status text
          errorMessage = `Error (${response.status}): ${response.statusText || errorMessage}`
        }
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error('Error sending invites:', error)
      Swal.fire('Error', error instanceof Error ? error.message : 'Failed to send invites. Please try again.', 'error')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-light text-gray-800">Send Invites</h1>
        <a 
          href="/admin/dashboard/sent-invites" 
          className="flex items-center px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors"
        >
          <Mail className="h-4 w-4 mr-2" />
          View Sent Invites
        </a>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type of Invites
              </label>
              <div className="flex gap-4">
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
              </div>
            </div>
            
            <div className="flex-1">
              <button
                type="button"
                onClick={() => setShowMessageSettings(!showMessageSettings)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md flex items-center"
              >
                {showMessageSettings ? 'Hide Message Settings' : 'Customize Message Settings'}
                <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showMessageSettings ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
          
          {/* Message Settings Section - Hidden by default */}
          {showMessageSettings && (
            <div className="mt-6 p-4 border border-gray-200 rounded-md bg-gray-50">
              <h3 className="text-lg font-medium mb-4">Message Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Email</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Email subject"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <EmailMessageEditor
                      value={emailMessage}
                      onChange={setEmailMessage}
                      disabled={false}
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
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleEmailImageChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
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
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium">WhatsApp</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <WhatsAppMessageEditor
                      value={whatsappMessage}
                      onChange={setWhatsappMessage}
                      disabled={false}
                    />
                    <div className="mt-2 text-xs text-gray-500">
                      Available variables: {'{{name}}, {{code}}, {{link}}'}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Link
                    </label>
                    <input
                      type="text"
                      value={eventLink}
                      onChange={(e) => setEventLink(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="https://yourevent.com"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-4 border rounded-lg">
            <h2 className="text-lg font-medium mb-4">Recipients</h2>
            
            <div className="flex gap-4 mb-6">
              <button
                type="button"
                onClick={downloadTemplate}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Download Template
              </button>
              <label className="px-4 py-2 text-sm bg-emerald-500 text-white rounded-md hover:bg-emerald-600 cursor-pointer">
                Upload File
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            
            {showPreview && (
              <div className="mt-6">
                <h2 className="text-lg font-medium mb-4">Preview ({previewData.length} recipients)</h2>
                <div className="max-h-60 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.map((recipient, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">{recipient.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{recipient.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{recipient.phone}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{recipient.type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={handleConfirmUpload}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600"
                  >
                    Confirm Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPreview(false)
                      setPreviewData([])
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {recipients.map((recipient, index) => (
              <RecipientItem 
                key={index} 
                recipient={recipient} 
                index={index} 
                onRemove={handleRemoveRecipient} 
                onChange={handleRecipientChange}
                enableEmail={enableEmail}
                enableWhatsApp={enableWhatsApp}
              />
            ))}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleAddRecipient}
                className="px-4 py-2 border border-emerald-500 text-emerald-500 rounded-md hover:bg-emerald-50 transition-colors"
              >
                Add Recipient
              </button>
              <button
                type="submit"
                disabled={isSending}
                className={`bg-emerald-500 text-white px-6 py-2 rounded-md hover:bg-emerald-600 transition-colors
                         ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSending ? 'Sending...' : 'Send Invites'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
