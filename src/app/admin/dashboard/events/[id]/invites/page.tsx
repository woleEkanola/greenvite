'use client'

import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react'
import Swal from 'sweetalert2'
import * as XLSX from 'xlsx'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Edit, Trash, Plus, RefreshCw, Mail, ChevronDown, X, Upload, Phone, Save } from 'lucide-react'
import RichTextEditor from '@/components/RichTextEditor'
// Remove direct imports of server-only modules
// import { sendEmail } from '@/lib/email'
// import sendWhatsAppNotification from '@/lib/whatsapp'
import DataTable from '@/components/DataTable'
import { debounce } from 'lodash'
import { z } from 'zod'
import Modal from '@/app/components/Modal'
import { fetchAndCacheImage, getImageFromCache } from '@/lib/imageCache'

interface Recipient {
  name: string
  email: string
  phone: string
  type: 'email' | 'whatsapp' | 'both'
  code?: string
}

interface MessageTemplate {
  id: string
  name: string
  emailSubject: string
  emailContent: string
  whatsappContent: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
  eventId: string
  imageUrl?: string
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
  maxLength,
  placeholder,
  rows = 4
}: { 
  value: string, 
  onChange: (value: string) => void, 
  maxLength: number,
  placeholder?: string,
  rows?: number
}) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  }, [onChange]);
  
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={handleChange}
        className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
      />
      <div className="absolute bottom-2 right-2 text-xs text-gray-500">
        {value.length}/{maxLength}
      </div>
    </div>
  );
});

TextAreaWithCounter.displayName = 'TextAreaWithCounter';

// Process template function to replace placeholders
const processTemplate = (template: string, name: string, code: string, link: string, isHtml = true) => {
  let processed = template
    .replace(/{{name}}/g, name)
    .replace(/{{code}}/g, code)
    .replace(/{{link}}/g, link);
  
  // For WhatsApp, convert *text* to bold formatting
  if (!isHtml) {
    return processed;
  }
  
  return processed;
};

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
  const [emailImageFile, setEmailImageFile] = useState<File | null>(null)
  const [emailImagePreview, setEmailImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  
  // Template management states
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [templateFormMode, setTemplateFormMode] = useState<'create' | 'edit'>('create')
  const [templateForm, setTemplateForm] = useState({
    id: '',
    name: '',
    emailSubject: '',
    emailContent: '',
    whatsappContent: '',
    isDefault: false,
    imageUrl: ''
  })
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)

  // Add a new state for WhatsApp image toggle
  const [includeImageInWhatsapp, setIncludeImageInWhatsapp] = useState(false)

  // State for event image
  const [eventImage, setEventImage] = useState<Buffer | null>(null);
  const [eventImageUrl, setEventImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

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
          
          // If event has an image, preload it
          if (data.imageUrl) {
            setEventImageUrl(data.imageUrl);
            preloadEventImage(data.imageUrl);
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

  // Preload event image
  const preloadEventImage = async (imageUrl: string) => {
    try {
      setImageLoading(true);
      // Check if image is already in cache
      let cachedImage = getImageFromCache(imageUrl);
      
      if (!cachedImage) {
        console.log('Event image not in cache, fetching...');
        toast.loading('Preloading event image...', { id: 'image-loading' });
        cachedImage = await fetchAndCacheImage(imageUrl);
        toast.success('Event image preloaded successfully', { id: 'image-loading' });
      } else {
        console.log('Event image found in cache');
      }
      
      setEventImage(cachedImage);
    } catch (error) {
      console.error('Error preloading event image:', error);
      toast.error('Failed to preload event image');
    } finally {
      setImageLoading(false);
    }
  };

  // Fetch templates from the database
  const fetchTemplates = async () => {
    setLoadingTemplates(true)
    
    try {
      console.log('Fetching templates from new endpoint...')
      let response = await fetch(`/api/admin/events/${params.id}/message-templates`)
      console.log('New endpoint response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('New endpoint data:', data)
        
        // Set templates even if the array is empty
        setTemplates(data.templates || [])
        
        if (data.templates && data.templates.length > 0) {
          console.log('Found templates in new endpoint:', data.templates.length)
          
          // Find the default template or use the first one
          const defaultTemplate = data.templates.find((t: MessageTemplate) => t.isDefault) || data.templates[0]
          setSelectedTemplate(defaultTemplate)
          setEmailSubject(defaultTemplate.emailSubject)
          setEmailTemplate(defaultTemplate.emailContent)
          setWhatsappTemplate(defaultTemplate.whatsappContent)
          
          // Load the image if it exists in the template
          if (defaultTemplate.imageUrl) {
            setEmailImagePreview(defaultTemplate.imageUrl)
          }
          
          return
        } else {
          console.log('No templates found in new endpoint response, creating default template')
          createDefaultTemplate()
          return
        }
      } else {
        console.error('New endpoint response not OK:', response.status, response.statusText)
        try {
          const errorData = await response.json()
          console.error('Error details:', errorData)
        } catch (e) {
          console.error('Could not parse error response')
        }
      }
      
      // If the new endpoint fails, try the old endpoint
      console.log('Fetching templates from old endpoint...')
      response = await fetch(`/api/admin/events/${params.id}/templates`)
      console.log('Old endpoint response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Old endpoint data:', data)
        
        if (Array.isArray(data) && data.length > 0) {
          console.log('Found templates in old endpoint:', data.length)
          // Convert old templates to new format
          const convertedTemplates = data.map((template: any) => ({
            ...template,
            imageUrl: null // Add the new field
          }))
          
          setTemplates(convertedTemplates)
          
          // Find the default template or use the first one
          const defaultTemplate = convertedTemplates.find((t: MessageTemplate) => t.isDefault) || convertedTemplates[0]
          setSelectedTemplate(defaultTemplate)
          setEmailSubject(defaultTemplate.emailSubject)
          setEmailTemplate(defaultTemplate.emailContent)
          setWhatsappTemplate(defaultTemplate.whatsappContent)
          
          // Migrate the old templates to the new endpoint
          try {
            await Promise.all(convertedTemplates.map(async (template: MessageTemplate) => {
              await fetch(`/api/admin/events/${params.id}/message-templates`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  name: template.name,
                  emailSubject: template.emailSubject,
                  emailContent: template.emailContent,
                  whatsappContent: template.whatsappContent,
                  isDefault: template.isDefault,
                  imageUrl: null
                })
              })
            }))
            
            console.log('Successfully migrated templates to new endpoint')
          } catch (migrationError) {
            console.error('Error migrating templates:', migrationError)
          }
          
          return
        }
      }
      
      // If both endpoints fail or return no templates, create local templates
      console.log('Creating local templates...')
      createLocalTemplates()
    } catch (error) {
      console.error('Error fetching templates:', error)
      // Use in-memory templates as fallback
      console.log('Using in-memory templates as fallback due to error')
      createLocalTemplates()
    } finally {
      setLoadingTemplates(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  // Create local in-memory templates as fallback when database templates are not available
  const createLocalTemplates = () => {
    if (!event) return
    
    // Create default templates for all events
    const defaultEmailSubject = `Invitation to ${event.title}`
    const defaultEmailContent = `
<p>Dear {{name}},</p>

<p>We are pleased to invite you to ${event.title}.</p>

<p>Please use the link below to confirm your attendance:</p>

<p><a href="{{link}}#{{code}}">{{link}}#{{code}}</a></p>

<p>Your unique registration code is: <strong>{{code}}</strong></p>

<p>We look forward to celebrating with you.</p>

<p>Warm regards,<br>
The Event Team</p>

{{image}}
    `.trim()
    
    const defaultWhatsappContent = `
Hello {{name}},

You are cordially invited to ${event.title}.

Please use this link to confirm your attendance:
{{link}}#{{code}}

Your unique registration code is: *{{code}}*

We look forward to celebrating with you.

Warm regards,
The Event Team
    `.trim()
    
    // Create local template objects
    const defaultTemplate: MessageTemplate = {
      id: 'local-default',
      name: 'Default Template',
      emailSubject: defaultEmailSubject,
      emailContent: defaultEmailContent,
      whatsappContent: defaultWhatsappContent,
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      eventId: params.id
    }
    
    // Set the templates state with the local templates
    setTemplates([defaultTemplate])
    setSelectedTemplate(defaultTemplate)
    setEmailSubject(defaultTemplate.emailSubject)
    setEmailTemplate(defaultTemplate.emailContent)
    setWhatsappTemplate(defaultTemplate.whatsappContent)
  }

  // Create a default template if none exist
  const createDefaultTemplate = async () => {
    if (!event) return
    
    try {
      const defaultEmailSubject = `Invitation to ${event.title}`
      const defaultEmailContent = `
<p>Dear {{name}},</p>

<p>We are pleased to invite you to ${event.title}.</p>

<p>Please use the link below to confirm your attendance:</p>

<p><a href="{{link}}#{{code}}">{{link}}#{{code}}</a></p>

<p>Your unique registration code is: <strong>{{code}}</strong></p>

<p>We look forward to celebrating with you.</p>

<p>Warm regards,<br>
The Event Team</p>

{{image}}
      `.trim()
      
      const defaultWhatsappContent = `
Hello {{name}},

You are cordially invited to ${event.title}.

Please use this link to confirm your attendance:
{{link}}#{{code}}

Your unique registration code is: *{{code}}*

We look forward to celebrating with you.

Warm regards,
The Event Team
      `.trim()
      
      const response = await fetch(`/api/admin/events/${params.id}/message-templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Default Template',
          emailSubject: defaultEmailSubject,
          emailContent: defaultEmailContent,
          whatsappContent: defaultWhatsappContent,
          isDefault: true
        }),
      })
      
      if (response.ok) {
        const newTemplate = await response.json()
        setTemplates([newTemplate])
        setSelectedTemplate(newTemplate)
        setEmailSubject(newTemplate.emailSubject)
        setEmailTemplate(newTemplate.emailContent)
        setWhatsappTemplate(newTemplate.whatsappContent)
      } else {
        console.error('Failed to create default template')
        
        // Fall back to local templates
        createLocalTemplates()
      }
    } catch (error) {
      console.error('Error creating default template:', error)
      // Fall back to local templates
      createLocalTemplates()
    }
  }

  // Handle template selection
  const handleSelectTemplate = (template: MessageTemplate) => {
    setSelectedTemplate(template)
    setEmailSubject(template.emailSubject)
    setEmailTemplate(template.emailContent)
    setWhatsappTemplate(template.whatsappContent)
    
    // Load the image if it exists in the template
    if (template.imageUrl) {
      setEmailImagePreview(template.imageUrl)
      setEmailImageFile(null) // Reset the file since we're loading from URL
    } else {
      setEmailImagePreview(null)
      setEmailImageFile(null)
    }
  }

  // Open template modal for creating a new template
  const handleCreateTemplate = () => {
    // Check if we're using local templates (database model not available)
    if (templates.some(t => t.id.startsWith('local-'))) {
      toast.success('Template management requires database updates. Using local templates for now.')
      return
    }
    
    setTemplateForm({
      id: '',
      name: '',
      emailSubject: emailSubject,
      emailContent: emailTemplate,
      whatsappContent: whatsappTemplate,
      isDefault: false,
      imageUrl: ''
    })
    setTemplateFormMode('create')
    setShowTemplateModal(true)
  }

  // Open template modal for editing an existing template
  const handleEditTemplate = (template: MessageTemplate) => {
    // Check if we're using local templates (database model not available)
    if (template.id.startsWith('local-')) {
      toast.success('Template management requires database updates. Using local templates for now.')
      return
    }
    
    setTemplateForm({
      id: template.id,
      name: template.name,
      emailSubject: template.emailSubject,
      emailContent: template.emailContent,
      whatsappContent: template.whatsappContent,
      isDefault: template.isDefault,
      imageUrl: template.imageUrl || ''
    })
    setTemplateFormMode('edit')
    setShowTemplateModal(true)
  }

  // Handle template form input changes
  const handleTemplateFormChange = (field: string, value: string | boolean) => {
    setTemplateForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Save template (create or update)
  const handleSaveTemplate = async () => {
    if (!templateForm.name || !templateForm.emailSubject || !templateForm.emailContent || !templateForm.whatsappContent) {
      toast.error('Please fill in all required fields')
      return
    }
    
    setSavingTemplate(true)
    
    try {
      // Upload the image first if there's a new one
      let imageUrl = emailImagePreview || null
      
      if (emailImageFile) {
        const formData = new FormData()
        formData.append('file', emailImageFile)
        formData.append('eventId', params.id)
        
        const imageResponse = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData
        })
        
        if (imageResponse.ok) {
          const imageData = await imageResponse.json()
          imageUrl = imageData.url
        } else {
          throw new Error('Failed to upload image')
        }
      }
      
      // Determine if we're creating or updating a template
      const method = templateFormMode === 'create' ? 'POST' : 'PUT'
      const endpoint = templateFormMode === 'create' 
        ? `/api/admin/events/${params.id}/message-templates` 
        : `/api/admin/events/${params.id}/message-templates/${templateForm.id}`
      
      // Now save the template with the image URL
      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: templateForm.name,
          emailSubject: templateForm.emailSubject,
          emailContent: templateForm.emailContent,
          whatsappContent: templateForm.whatsappContent,
          isDefault: templateForm.isDefault,
          imageUrl: imageUrl
        })
      })
      
      if (response.ok) {
        toast.success(templateFormMode === 'create' ? 'Template created successfully' : 'Template updated successfully')
        
        // Update the templates list
        fetchTemplates()
        setShowTemplateModal(false)
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to save template')
      }
    } catch (error: any) {
      console.error('Error saving template:', error)
      toast.error('Error saving template: ' + (error.message || 'Unknown error'))
    } finally {
      setSavingTemplate(false)
    }
  }

  // Delete a template
  const handleDeleteTemplate = async (template: MessageTemplate) => {
    // Check if we're using local templates (database model not available)
    if (template.id.startsWith('local-')) {
      toast.success('Template management requires database updates. Using local templates for now.')
      return
    }
    
    // Confirm deletion
    const result = await Swal.fire({
      title: 'Delete Template',
      text: `Are you sure you want to delete the template "${template.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    })
    
    if (!result.isConfirmed) return
    
    try {
      const response = await fetch(`/api/admin/events/${params.id}/message-templates/${template.id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        // Remove from templates list
        setTemplates(prev => prev.filter(t => t.id !== template.id))
        
        // If this was the selected template, select another one
        if (selectedTemplate && selectedTemplate.id === template.id) {
          const newSelectedTemplate = templates.find(t => t.id !== template.id)
          if (newSelectedTemplate) {
            setSelectedTemplate(newSelectedTemplate)
            setEmailSubject(newSelectedTemplate.emailSubject)
            setEmailTemplate(newSelectedTemplate.emailContent)
            setWhatsappTemplate(newSelectedTemplate.whatsappContent)
          }
        }
        
        toast.success('Template deleted successfully')
      } else {
        const error = await response.json()
        
        if (error.error && error.error.includes('Message templates are not available')) {
          // If the error is because the database model doesn't exist, fall back to local templates
          toast.success('Template management requires database updates. Using local templates for now.')
          createLocalTemplates()
        } else {
          toast.error(error.error || 'Failed to delete template')
        }
      }
    } catch (error: any) {
      console.error('Error deleting template:', error)
      toast.error('An error occurred while deleting the template')
    }
  }

  // Update the handleImageUpload function to work with Vercel Blob Storage
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    
    if (file) {
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB')
        return
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error('File must be an image')
        return
      }
      
      // Create a preview URL
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setEmailImagePreview(result)
      }
      reader.readAsDataURL(file)
      
      // Store the file for later upload
      setEmailImageFile(file)
      
      // If auto-save is enabled, upload the image immediately
      if (selectedTemplate && selectedTemplate.id !== 'local-default') {
        handleSaveTemplate()
      }
    }
  }

  // Clear email image
  const clearEmailImage = () => {
    setEmailImageFile(null)
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
    // Validate recipients
    const errors = validateRecipients()
    if (errors.length > 0) {
      Swal.fire({
        title: 'Validation Errors',
        html: errors.join('<br>'),
        icon: 'error'
      })
      return
    }

    // Confirm before sending
    const result = await Swal.fire({
      title: 'Send Invites?',
      text: `You are about to send ${recipients.length} invites. This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, send invites'
    })

    if (result.isConfirmed) {
      setSending(true)
      
      try {
        // Create a batch for these invites
        const batchResponse = await fetch(`/api/admin/events/${params.id}/batches`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: `Batch ${new Date().toISOString().split('T')[0]}`
          })
        })
        
        if (!batchResponse.ok) {
          throw new Error('Failed to create batch for invites')
        }
        
        const batch = await batchResponse.json()
        
        // Prepare the event link
        const baseUrl = window.location.origin
        const eventLink = `${baseUrl}/rsvp/${event?.slug || params.id}`
        
        // Use the new send-batch endpoint to send all invites at once
        const sendResponse = await fetch(`/api/admin/events/${params.id}/invites/send-batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            recipients,
            emailSubject,
            emailContent: emailTemplate,
            whatsappContent: whatsappTemplate,
            includeImageInWhatsApp: includeImageInWhatsapp,
            batchId: batch.id,
            eventLink
          })
        })
        
        if (!sendResponse.ok) {
          const errorData = await sendResponse.json()
          throw new Error(errorData.message || 'Failed to send invites')
        }
        
        const sendResult = await sendResponse.json()
        
        // Show the results
        const successMessage = `Successfully sent ${sendResult.successCount} out of ${sendResult.totalProcessed} invites.`
        
        if (sendResult.failureCount > 0) {
          Swal.fire({
            title: 'Invites Sent with Issues',
            html: `${successMessage}<br/>${sendResult.failureCount} invites failed to send. Check the logs for details.`,
            icon: 'warning'
          })
        } else {
          Swal.fire({
            title: 'Invites Sent Successfully',
            text: successMessage,
            icon: 'success'
          })
        }
        
        // Clear the recipients list
        setRecipients([])
      } catch (error) {
        console.error('Error sending invites:', error)
        Swal.fire({
          title: 'Error',
          text: `Failed to send invites: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
          icon: 'error'
        })
      } finally {
        setSending(false)
      }
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
      
      // If there's an image preview, replace the {{image}} placeholder
      if (emailImagePreview) {
        content = content.replace('{{image}}', `<img src="${emailImagePreview}" alt="Event Image" style="max-width: 100%; margin-top: 20px;" />`)
      } else {
        content = content.replace('{{image}}', '')
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
            <div className="mt-6 space-y-6 border-t pt-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Message Templates</h3>
                <button
                  type="button"
                  onClick={handleCreateTemplate}
                  className="px-3 py-1.5 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New Template
                </button>
              </div>
              
              {loadingTemplates ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-md p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Available Templates:</h4>
                  
                  {templates.length > 0 ? (
                    <div className="space-y-3">
                      {templates.map(template => (
                        <div 
                          key={template.id} 
                          className={`p-3 border rounded-md flex items-center justify-between ${
                            selectedTemplate?.id === template.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center">
                            <input
                              type="radio"
                              id={`template-${template.id}`}
                              name="selectedTemplate"
                              checked={selectedTemplate?.id === template.id}
                              onChange={() => handleSelectTemplate(template)}
                              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                            />
                            <label htmlFor={`template-${template.id}`} className="ml-2 block">
                              <span className="text-sm font-medium">{template.name}</span>
                              {template.isDefault && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  Default
                                </span>
                              )}
                            </label>
                          </div>
                          
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => handleEditTemplate(template)}
                              className="p-1.5 text-gray-500 hover:text-emerald-600 transition-colors"
                              title="Edit template"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => handleDeleteTemplate(template)}
                              className="p-1.5 text-gray-500 hover:text-red-600 transition-colors"
                              title="Delete template"
                              disabled={templates.length <= 1}
                            >
                              <Trash className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">No templates available</p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-md font-medium mb-3">Email Message</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject Line
                    </label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full p-2 border rounded focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="Enter email subject"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Content
                    </label>
                    <RichTextEditor
                      value={emailTemplate}
                      onChange={setEmailTemplate}
                      placeholder="Enter email content"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use <code>{'{{name}}'}</code>, <code>{'{{code}}'}</code>, and <code>{'{{link}}'}</code> as placeholders. Use <code>{'{{image}}'}</code> to place the image.
                    </p>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Image (Optional)
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="file"
                        ref={imageInputRef}
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                      >
                        Choose Image
                      </button>
                      {emailImagePreview && (
                        <button
                          type="button"
                          onClick={clearEmailImage}
                          className="px-3 py-1.5 bg-red-100 text-red-800 rounded-md hover:bg-red-200"
                        >
                          Remove Image
                        </button>
                      )}
                    </div>
                    {emailImagePreview && (
                      <div className="mt-3 relative w-full h-40 border rounded-md overflow-hidden">
                        <Image
                          src={emailImagePreview}
                          alt="Email image preview"
                          fill
                          style={{ objectFit: 'contain' }}
                        />
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum size: 5MB. The image will replace the <code>{'{{image}}'}</code> placeholder in your email.
                    </p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => showMessagePreview('email')}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    Preview Email
                  </button>
                </div>
                
                <div>
                  <h3 className="text-md font-medium mb-3">WhatsApp Message</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      WhatsApp Content
                    </label>
                    <TextAreaWithCounter
                      value={whatsappTemplate}
                      onChange={setWhatsappTemplate}
                      maxLength={1000}
                      placeholder="Enter WhatsApp message"
                      rows={12}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use <code>{'{{name}}'}</code>, <code>{'{{code}}'}</code>, and <code>{'{{link}}'}</code> as placeholders.
                      Use * for bold text, e.g., *bold*.
                    </p>
                  </div>
                  
                  <div className="mt-4 flex items-center">
                    <input
                      type="checkbox"
                      id="includeImageInWhatsapp"
                      checked={includeImageInWhatsapp}
                      onChange={(e) => setIncludeImageInWhatsapp(e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="includeImageInWhatsapp" className="ml-2 text-sm text-gray-700">
                      Include image in WhatsApp message (if available)
                    </label>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => showMessagePreview('whatsapp')}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                  >
                    Preview WhatsApp
                  </button>
                </div>
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
      
      {/* Event Image */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Event Image</h2>
          
          <div className="mt-2 md:mt-0">
            {eventImageUrl && (
              <div className="flex items-center">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${eventImage ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {eventImage ? 'Image Preloaded' : 'Image Available'}
                </span>
                
                {!eventImage && !imageLoading && (
                  <button
                    onClick={() => preloadEventImage(eventImageUrl)}
                    className="ml-2 inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                  >
                    Preload Now
                  </button>
                )}
                
                {imageLoading && (
                  <span className="ml-2 inline-flex items-center text-xs text-gray-500">
                    <RefreshCw className="animate-spin h-3 w-3 mr-1" />
                    Loading...
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        
        {eventImageUrl ? (
          <div className="relative h-48 w-full md:w-1/2 mx-auto border rounded-lg overflow-hidden">
            <Image 
              src={eventImageUrl} 
              alt="Event Image" 
              fill 
              style={{ objectFit: 'contain' }} 
            />
          </div>
        ) : (
          <div className="text-center p-8 border border-dashed rounded-lg">
            <p className="text-gray-500">No event image available. Upload an image in the event settings.</p>
          </div>
        )}
        
        {eventImage && (
          <div className="mt-2 text-center text-sm text-gray-500">
            Image size: {(eventImage.length / 1024).toFixed(2)} KB
          </div>
        )}
      </div>
      
      {/* Template Modal */}
      <Modal isOpen={showTemplateModal} onClose={() => setShowTemplateModal(false)}>
        <div className="w-full max-w-3xl max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {templateFormMode === 'create' ? 'Create New Template' : 'Edit Template'}
            </h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Name *
              </label>
              <input
                type="text"
                value={templateForm.name}
                onChange={(e) => handleTemplateFormChange('name', e.target.value)}
                className="w-full p-2 border rounded focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Enter template name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Subject *
              </label>
              <input
                type="text"
                value={templateForm.emailSubject}
                onChange={(e) => handleTemplateFormChange('emailSubject', e.target.value)}
                className="w-full p-2 border rounded focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Enter email subject"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Content *
              </label>
              <RichTextEditor
                value={templateForm.emailContent}
                onChange={(value) => handleTemplateFormChange('emailContent', value)}
                placeholder="Enter email content"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use <code>{'{{name}}'}</code>, <code>{'{{code}}'}</code>, and <code>{'{{link}}'}</code> as placeholders. Use <code>{'{{image}}'}</code> to place the image.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp Content *
              </label>
              <textarea
                value={templateForm.whatsappContent}
                onChange={(e) => handleTemplateFormChange('whatsappContent', e.target.value)}
                className="w-full p-2 border rounded focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Enter WhatsApp message"
                rows={8}
              />
              <p className="text-xs text-gray-500 mt-1">
                Use <code>{'{{name}}'}</code>, <code>{'{{code}}'}</code>, and <code>{'{{link}}'}</code> as placeholders.
                Use * for bold text, e.g., *bold*.
              </p>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isDefault"
                checked={templateForm.isDefault}
                onChange={(e) => handleTemplateFormChange('isDefault', e.target.checked)}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
              />
              <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-700">
                Set as default template
              </label>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowTemplateModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveTemplate}
              disabled={savingTemplate}
              className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 disabled:opacity-50"
            >
              {savingTemplate ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Template
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)}>
        <div className="w-full max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">
              {previewType === 'email' ? 'Email Preview' : 'WhatsApp Preview'}
            </h3>
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
      </Modal>
    </div>
  )
}
