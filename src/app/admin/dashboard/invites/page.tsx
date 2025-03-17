'use client'

import { useState, useRef, useEffect } from 'react'
import Swal from 'sweetalert2'
import * as XLSX from 'xlsx'
import Image from 'next/image'
import { toast } from 'sonner'
import { AlertCircle, CheckCircle, Clock, RefreshCcw, Send, X } from 'lucide-react'
import Papa from 'papaparse'
import { z } from 'zod'

interface Recipient {
  name: string
  email?: string
  phone?: string
  type: 'email' | 'sms' | 'both'
  code?: string
}

export default function SendInvites() {
  const [recipients, setRecipients] = useState<Recipient[]>([{ name: '', email: '', phone: '', type: 'sms' }])
  const [isSending, setIsSending] = useState(false)
  const [previewData, setPreviewData] = useState<Recipient[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [enableEmail, setEnableEmail] = useState(true)
  const [enableSMS, setEnableSMS] = useState(true)
  const [emailMessage, setEmailMessage] = useState(`
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
  <h2 style="color: #2c3e50; text-align: center;">You are invited to the church dedication of</h2>
  <h1 style="color: #16a085; text-align: center; margin-bottom: 30px;">Jesse Oghenekome George</h1>
  <p style="text-align: center; font-size: 18px;">at RCCG Church, Champion Cathedral Parish.</p>
  
  <div style="margin: 30px 0; background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
    <h3 style="color: #2c3e50; text-align: center; margin-top: 0;">LOCATIONS</h3>
    <p style="text-align: center; font-weight: bold;">Church Dedication</p>
    <p style="text-align: center;">RCCG Church, Champions Cathedral</p>
    <p style="text-align: center;">#16-18 Airport Road, Effurun, Warri Delta</p>
    <p style="text-align: center;">Nigeria</p>
    <p style="text-align: center; font-size: 20px; margin: 20px 0;">10:00 AM</p>
    <p style="text-align: center; font-size: 18px;">Saturday, April 13, 2025</p>
  </div>
  
  <div style="margin: 30px 0; text-align: center;">
    <p>Your personal registration code is: <strong>{{code}}</strong></p>
    <a href="{{link}}" style="display: inline-block; background-color: #16a085; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">Confirm Your Attendance</a>
    <p style="margin-top: 15px; font-size: 14px; color: #7f8c8d;">Please click the button above to confirm your attendance or visit <a href="{{link}}" style="color: #16a085;">{{link}}</a></p>
  </div>
  
  <p style="text-align: center; margin-top: 30px; color: #7f8c8d; font-size: 14px;">We look forward to celebrating this special occasion with you.</p>
</div>
  `)
  const [smsMessage, setSMSMessage] = useState(`You're invited to Jesse Oghenekome George's Church Dedication at RCCG Church, Champions Cathedral, #16-18 Airport Road, Effurun, Warri Delta, Nigeria. 10:00 AM, Saturday, April 13, 2025. Your code: {{code}}. RSVP: {{link}}`)
  const [eventLink, setEventLink] = useState('https://greenvites.online/jessegeorge')
  const [emailSubject, setEmailSubject] = useState('Invitation to Jesse Oghenekome George\'s Church Dedication')
  const [emailImage, setEmailImage] = useState<File | null>(null)
  const [emailImagePreview, setEmailImagePreview] = useState<string | null>(null)
  const [sentInvites, setSentInvites] = useState<any[]>([])
  const [showSentInvites, setShowSentInvites] = useState(false)
  const [editingInvite, setEditingInvite] = useState<any>(null)
  const [editedPhone, setEditedPhone] = useState('')
  const [editedEmail, setEditedEmail] = useState('')
  const [resendChannel, setResendChannel] = useState<'sms' | 'email' | 'both'>('both')
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAddRecipient = () => {
    setRecipients([...recipients, { name: '', email: '', phone: '', type: 'sms' }])
  }

  const handleRemoveRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index))
  }

  // Format phone number to ensure it starts with +234
  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '';
    
    // Remove any non-digit characters except the leading '+'
    let formatted = phone.trim().replace(/(?!^\+)[^\d]/g, '');
    
    // If the number doesn't start with '+', add it
    if (!formatted.startsWith('+')) {
      // If it starts with '0', replace the leading '0' with +234
      if (formatted.startsWith('0')) {
        formatted = '+234' + formatted.substring(1);
      } else if (formatted.startsWith('234')) {
        // If it already starts with 234, add the +
        formatted = '+' + formatted;
      } else {
        // Otherwise, add +234 prefix
        formatted = '+234' + formatted;
      }
    }
    
    return formatted;
  };

  const handleRecipientChange = (index: number, field: keyof Recipient, value: string) => {
    const updatedRecipients = [...recipients];
    
    // Format phone number if that's the field being changed
    if (field === 'phone') {
      updatedRecipients[index] = {
        ...updatedRecipients[index],
        [field]: formatPhoneNumber(value)
      };
    } else {
      updatedRecipients[index] = {
        ...updatedRecipients[index],
        [field]: value
      };
    }
    
    setRecipients(updatedRecipients);
  }

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
          type: row.type || 'sms'
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
      { name: 'Bob Johnson', email: '', phone: '+2348012345679', type: 'sms' }
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
      let type: 'email' | 'sms' | 'both' = 'email' // Default to email
      
      if (recipient.email && recipient.phone) {
        type = 'both'
      } else if (recipient.email) {
        type = 'email'
      } else if (recipient.phone) {
        type = 'sms'
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
      
      if (!enableEmail && !enableSMS) {
        throw new Error('Both email and SMS are disabled. Please enable at least one channel.')
      }
      
      // Apply global toggles to recipient types
      validRecipients = validRecipients.map(r => {
        let type = r.type
        
        // If recipient is set to 'both', but one channel is disabled globally
        if (type === 'both') {
          if (!enableEmail) type = 'sms'
          else if (!enableSMS) type = 'email'
        }
        // If recipient's channel is disabled globally
        else if ((type === 'email' && !enableEmail) || (type === 'sms' && !enableSMS)) {
          // Try to use the other channel if available
          if (type === 'email' && enableSMS && r.phone) type = 'sms'
          else if (type === 'sms' && enableEmail && r.email) type = 'email'
          // If no alternative channel is available, keep the original type
          // The recipient will be filtered out in the next step
        }
        
        return { ...r, type }
      })
      
      // Further filter recipients based on contact info
      validRecipients = validRecipients.filter(r => 
        (r.type === 'email' && r.email) || 
        (r.type === 'sms' && r.phone) ||
        (r.type === 'both' && ((enableEmail && r.email) || (enableSMS && r.phone)))
      )

      if (validRecipients.length === 0) {
        throw new Error('No valid recipients found after applying channel filters')
      }

      // Create FormData for file upload
      const formData = new FormData()
      formData.append('emailSubject', emailSubject)
      formData.append('emailMessage', emailMessage)
      formData.append('smsMessage', smsMessage)
      formData.append('eventLink', eventLink)
      formData.append('enableEmail', String(enableEmail))
      formData.append('enableSMS', String(enableSMS))
      
      if (emailImage) {
        formData.append('emailImage', emailImage)
      }
      
      formData.append('recipients', JSON.stringify(validRecipients))

      const response = await fetch('/api/admin/send-invites', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setSentInvites(data.sentInvites)
        setShowSentInvites(true)
        Swal.fire('Success', 'Invites sent successfully!', 'success')
        setRecipients([{ name: '', email: '', phone: '', type: 'sms' }])
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Failed to send invites')
      }
    } catch (error) {
      console.error('Error sending invites:', error)
      Swal.fire('Error', error instanceof Error ? error.message : 'Failed to send invites. Please try again.', 'error')
    } finally {
      setIsSending(false)
    }
  }

  // Function to handle resending failed messages
  const handleResendInvite = async (invite: any) => {
    setEditingInvite(invite)
    setEditedPhone(invite.phone || '')
    setEditedEmail(invite.email || '')
    setResendChannel(invite.type === 'both' ? 'both' : (invite.type as 'sms' | 'email'))
    
    // Show the edit dialog
    Swal.fire({
      title: 'Edit and Resend Invite',
      html: `
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Recipient Name</label>
          <div class="text-lg font-semibold">${invite.name}</div>
        </div>
        ${invite.phone ? `
        <div class="mb-4">
          <label for="phone" class="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input id="phone" type="text" class="w-full p-2 border rounded" value="${invite.phone}">
        </div>
        ` : ''}
        ${invite.email ? `
        <div class="mb-4">
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <input id="email" type="email" class="w-full p-2 border rounded" value="${invite.email}">
        </div>
        ` : ''}
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Resend Via</label>
          <select id="channel" class="w-full p-2 border rounded">
            ${invite.type === 'both' ? '<option value="both">Both SMS & Email</option>' : ''}
            ${invite.phone ? '<option value="sms">SMS Only</option>' : ''}
            ${invite.email ? '<option value="email">Email Only</option>' : ''}
          </select>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Resend',
      preConfirm: () => {
        const phone = (document.getElementById('phone') as HTMLInputElement)?.value
        const email = (document.getElementById('email') as HTMLInputElement)?.value
        const channel = (document.getElementById('channel') as HTMLSelectElement)?.value as 'sms' | 'email' | 'both'
        
        return { phone, email, channel }
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        const { phone, email, channel } = result.value as { phone: string, email: string, channel: 'sms' | 'email' | 'both' }
        
        setIsLoading(true)
        try {
          // Prepare email image if available
          let emailImageBuffer = null
          if (emailImage) {
            const arrayBuffer = await emailImage.arrayBuffer()
            emailImageBuffer = Array.from(new Uint8Array(arrayBuffer))
          }
          
          const response = await fetch('/api/admin/invites/resend', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: invite.id,
              phone,
              email,
              channel,
              smsMessage,
              emailSubject,
              emailMessage,
              eventLink,
              emailImageBuffer
            }),
          })
          
          const data = await response.json()
          
          if (response.ok) {
            Swal.fire('Success', 'Invite resent successfully!', 'success')
            // Update the invite in the list
            setSentInvites(prevInvites => 
              prevInvites.map(i => i.id === invite.id ? data.invite : i)
            )
          } else {
            Swal.fire('Error', data.error || 'Failed to resend invite', 'error')
          }
        } catch (error) {
          console.error('Error resending invite:', error)
          Swal.fire('Error', 'Failed to resend invite', 'error')
        } finally {
          setIsLoading(false)
          setEditingInvite(null)
        }
      }
    })
  }

  // Function to fetch all invites
  const fetchSentInvites = async () => {
    try {
      const response = await fetch('/api/admin/invites')
      if (response.ok) {
        const data = await response.json()
        setSentInvites(data.invites)
        setShowSentInvites(true)
      } else {
        console.error('Failed to fetch invites')
      }
    } catch (error) {
      console.error('Error fetching invites:', error)
    }
  }

  // Fetch invites when the component mounts
  useEffect(() => {
    // Set default image preview when component mounts
    setEmailImagePreview('/jessegeorge.jpg');
    
    // Load sent invites
    fetchSentInvites();
  }, []);

  // Function to get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-blue-100 text-blue-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Function to get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return '✓'
      case 'delivered':
        return '✓✓'
      case 'failed':
        return '✗'
      case 'pending':
        return '⏱'
      default:
        return '?'
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-light text-gray-800 mb-8">Send Invites</h1>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6 space-y-4">
          <div className="flex gap-4">
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
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-4 border rounded-lg">
            <h2 className="text-lg font-medium mb-4">Message Settings</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-md font-medium">Email Settings</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={enableEmail}
                      onChange={() => setEnableEmail(!enableEmail)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-900">{enableEmail ? 'Enabled' : 'Disabled'}</span>
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    disabled={!enableEmail}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Image (Optional)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleEmailImageChange}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                      disabled={!enableEmail}
                    />
                    {emailImagePreview && (
                      <button
                        type="button"
                        onClick={clearEmailImage}
                        className="text-red-500 hover:text-red-700"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {emailImagePreview && (
                    <div className="mt-2 relative w-full h-40">
                      <Image 
                        src={emailImagePreview} 
                        alt="Email image preview" 
                        fill
                        style={{ objectFit: 'contain' }}
                      />
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Message
                  </label>
                  <div className="text-xs text-gray-500 mb-2">
                    Use {"{{name}}"}, {"{{code}}"}, and {"{{link}}"} as placeholders
                  </div>
                  <textarea
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                    disabled={!enableEmail}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-md font-medium">SMS Settings</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={enableSMS}
                      onChange={() => setEnableSMS(!enableSMS)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-900">{enableSMS ? 'Enabled' : 'Disabled'}</span>
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMS Message
                  </label>
                  <div className="text-xs text-gray-500 mb-2">
                    Use {"{{name}}"}, {"{{code}}"}, and {"{{link}}"} as placeholders
                  </div>
                  <textarea
                    value={smsMessage}
                    onChange={(e) => setSMSMessage(e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                    disabled={!enableSMS}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Link
                  </label>
                  <div className="text-xs text-gray-500 mb-2">
                    This link will replace the {"{{link}}"} placeholder in messages
                  </div>
                  <input
                    type="text"
                    value={eventLink}
                    onChange={(e) => setEventLink(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 border rounded-lg">
            <h2 className="text-lg font-medium mb-4">Recipients</h2>
            
            {recipients.map((recipient, index) => (
              <div key={index} className="p-4 border rounded-lg relative mb-4">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveRecipient(index)}
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
                      onChange={(e) => handleRecipientChange(index, 'name', e.target.value)}
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
                      onChange={(e) => handleRecipientChange(index, 'email', e.target.value)}
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
                      onChange={(e) => handleRecipientChange(index, 'phone', e.target.value)}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 ${!enableSMS && 'opacity-50'}`}
                      required={recipient.type === 'sms' || (recipient.type === 'both' && enableSMS)}
                      disabled={!enableSMS}
                      placeholder="+234XXXXXXXXXX"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Send via
                    </label>
                    <select
                      value={recipient.type}
                      onChange={(e) => handleRecipientChange(index, 'type', e.target.value as 'email' | 'sms' | 'both')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {enableSMS && <option value="sms">SMS</option>}
                      {enableEmail && <option value="email">Email</option>}
                      {enableEmail && enableSMS && <option value="both">Both</option>}
                    </select>
                  </div>
                </div>
              </div>
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

      {/* Sent Invites Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Sent Invites</h2>
          <button 
            onClick={fetchSentInvites}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md flex items-center"
          >
            <span className="mr-2">↻</span> Refresh
          </button>
        </div>
        
        {sentInvites.length > 0 ? (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recipient
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Info
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SMS Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sentInvites.map((invite: any) => (
                  <tr key={invite.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{invite.name}</div>
                      <div className="text-sm text-gray-500">Code: {invite.code || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {invite.phone && (
                        <div className="text-sm text-gray-500">
                          📱 {invite.phone}
                        </div>
                      )}
                      {invite.email && (
                        <div className="text-sm text-gray-500">
                          ✉️ {invite.email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {invite.smsStatus ? (
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(invite.smsStatus)}`}>
                          {getStatusIcon(invite.smsStatus)} {invite.smsStatus}
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                      {invite.smsProvider && (
                        <div className="text-xs text-gray-500 mt-1">
                          via {invite.smsProvider === 'africas_talking' ? 'Africa\'s Talking' : 'Termii'}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {invite.emailStatus ? (
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(invite.emailStatus)}`}>
                          {getStatusIcon(invite.emailStatus)} {invite.emailStatus}
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {(invite.smsStatus === 'failed' || invite.emailStatus === 'failed') && (
                        <button
                          onClick={() => handleResendInvite(invite)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Edit & Resend
                        </button>
                      )}
                      {invite.errorMessage && (
                        <button
                          onClick={() => Swal.fire('Error Details', invite.errorMessage, 'error')}
                          className="text-red-600 hover:text-red-900"
                        >
                          View Error
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <p className="text-gray-500">No invites sent yet or no data available.</p>
            <button 
              onClick={fetchSentInvites}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Check for Invites
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
