'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Edit, Trash, Plus, Image, Check, X, RefreshCw, Save, Eye } from 'lucide-react'
import Swal from 'sweetalert2'
import { toast } from 'react-hot-toast'
import Modal from '@/app/components/Modal'
import RichTextEditor from '@/components/RichTextEditor'
import { MessageTemplate } from '@/types/message-template'

export default function MessageTemplatesPage() {
  const params = useParams()
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [templateFormMode, setTemplateFormMode] = useState<'create' | 'edit'>('create')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [previewImage, setPreviewImage] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [previewType, setPreviewType] = useState<'email' | 'content'>('email')
  const [previewTemplate, setPreviewTemplate] = useState<MessageTemplate | null>(null)
  const [templateForm, setTemplateForm] = useState({
    id: '',
    name: '',
    emailSubject: '',
    emailContent: '',
    whatsappContent: '',
    isDefault: false,
    imageUrl: ''
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/events/${params.id}/message-templates`)
      
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      } else {
        console.error('Failed to fetch templates')
        toast.error('Failed to load message templates')
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('An error occurred while loading templates')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTemplate = () => {
    setTemplateForm({
      id: '',
      name: '',
      emailSubject: '',
      emailContent: '',
      whatsappContent: '',
      isDefault: false,
      imageUrl: ''
    })
    setPreviewImage('')
    setTemplateFormMode('create')
    setShowModal(true)
  }

  const handleEditTemplate = (template: MessageTemplate) => {
    setTemplateForm({
      id: template.id,
      name: template.name,
      emailSubject: template.emailSubject || '',
      emailContent: template.emailContent || '',
      whatsappContent: template.whatsappContent || '',
      isDefault: template.isDefault,
      imageUrl: template.imageUrl || ''
    })
    setPreviewImage(template.imageUrl || '')
    setTemplateFormMode('edit')
    setShowModal(true)
  }

  const handleTemplateFormChange = (field: string, value: any) => {
    setTemplateForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
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
    
    // Create a preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string)
    }
    reader.readAsDataURL(file)
    
    // Upload the image
    setUploadingImage(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('eventId', params.id as string)
      
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        const data = await response.json()
        setTemplateForm(prev => ({
          ...prev,
          imageUrl: data.url
        }))
        toast.success('Image uploaded successfully')
      } else {
        toast.error('Failed to upload image')
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Error uploading image')
    } finally {
      setUploadingImage(false)
    }
  }

  const removeImage = () => {
    setPreviewImage('')
    setTemplateForm(prev => ({
      ...prev,
      imageUrl: ''
    }))
  }

  const handleSaveTemplate = async () => {
    if (!templateForm.name) {
      toast.error('Template name is required')
      return
    }
    
    setSavingTemplate(true)
    
    try {
      const method = templateFormMode === 'create' ? 'POST' : 'PUT'
      const url = templateFormMode === 'create' 
        ? `/api/admin/events/${params.id}/message-templates` 
        : `/api/admin/events/${params.id}/message-templates/${templateForm.id}`
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(templateForm)
      })
      
      if (response.ok) {
        toast.success(templateFormMode === 'create' ? 'Template created successfully' : 'Template updated successfully')
        setShowModal(false)
        fetchTemplates()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save template')
      }
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error('An error occurred while saving the template')
    } finally {
      setSavingTemplate(false)
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const result = await Swal.fire({
        title: 'Delete Template',
        text: 'Are you sure you want to delete this template?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
      })
      
      if (result.isConfirmed) {
        const response = await fetch(`/api/admin/events/${params.id}/message-templates/${templateId}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          toast.success('Template deleted successfully')
          fetchTemplates()
        } else {
          const error = await response.json()
          toast.error(error.error || 'Failed to delete template')
        }
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('An error occurred while deleting the template')
    }
  }

  const handleSetDefault = async (templateId: string) => {
    try {
      const template = templates.find(t => t.id === templateId)
      if (!template) return
      
      // If already default, do nothing
      if (template.isDefault) return
      
      const response = await fetch(`/api/admin/events/${params.id}/message-templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...template,
          isDefault: true
        })
      })
      
      if (response.ok) {
        toast.success('Default template updated')
        fetchTemplates()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update default template')
      }
    } catch (error) {
      console.error('Error setting default template:', error)
      toast.error('An error occurred while updating the default template')
    }
  }

  const handlePreviewTemplate = (template: MessageTemplate) => {
    setPreviewTemplate(template)
    setPreviewType('email')
    setShowPreview(true)
  }

  const getPreviewContent = () => {
    if (!previewTemplate) return ''
    
    // Replace placeholders with sample values
    const content = previewTemplate.emailContent
      .replace(/{{name}}/g, 'Sample Name')
      .replace(/{{code}}/g, 'SAMPLE123')
      .replace(/{{link}}/g, 'https://greenvites.online/event')
    
    return content
  }

  const togglePreviewType = () => {
    setPreviewType(previewType === 'email' ? 'content' : 'email')
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Message Templates</h1>
        <button
          onClick={handleCreateTemplate}
          className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </button>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-gray-500">No templates found. Create your first template to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-white shadow rounded-lg overflow-hidden">
              {template.imageUrl && (
                <div className="h-48 bg-gray-200 relative">
                  <img 
                    src={template.imageUrl} 
                    alt={template.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 h-full">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {template.name}
                    {template.isDefault && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Default
                      </span>
                    )}
                  </h3>
                </div>
                <div 
                  className="text-gray-600 mb-4 line-clamp-3 mt-2"
                  dangerouslySetInnerHTML={{ __html: template.emailContent }}
                />
                <div className="flex justify-between mt-4">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditTemplate(template)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                      title="Delete"
                    >
                      <Trash size={16} />
                    </button>
                    <button
                      onClick={() => handlePreviewTemplate(template)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                      title="Preview"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                  {!template.isDefault && (
                    <button
                      onClick={() => handleSetDefault(template.id)}
                      className="text-sm text-emerald-600 hover:text-emerald-800"
                    >
                      Set as default
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
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
                value={templateForm.emailSubject || ''}
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
                value={templateForm.emailContent || ''}
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
                value={templateForm.whatsappContent || ''}
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
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image (Optional)
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 cursor-pointer">
                  <Image size={16} className="mr-2" />
                  <span>{uploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </label>
                {previewImage && (
                  <button
                    type="button"
                    onClick={removeImage}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                )}
              </div>
              {previewImage && (
                <div className="mt-2 relative">
                  <img
                    src={previewImage}
                    alt="Preview"
                    className="h-40 object-cover rounded-md"
                  />
                </div>
              )}
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
              onClick={() => setShowModal(false)}
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
              {previewType === 'email' ? 'Email Preview' : 'Message Preview'}
            </h3>
            <button 
              onClick={togglePreviewType}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
            >
              Switch to {previewType === 'email' ? 'Message' : 'Email'} View
            </button>
          </div>
          
          {previewType === 'email' && (
            <div className="border rounded-md p-4">
              <div className="mb-2 pb-2 border-b">
                <div className="text-sm text-gray-500">Subject:</div>
                <div className="font-medium">{previewTemplate?.name || 'Template Preview'}</div>
              </div>
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: getPreviewContent() }}
              />
              {previewTemplate?.imageUrl && (
                <div className="mt-4 border-t pt-4">
                  <div className="text-sm text-gray-500 mb-2">Attached Image:</div>
                  <img 
                    src={previewTemplate.imageUrl} 
                    alt="Template image" 
                    className="max-h-60 rounded-md"
                  />
                </div>
              )}
            </div>
          )}
          
          {previewType === 'content' && (
            <div className="bg-gray-100 rounded-md p-4">
              <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500 font-mono whitespace-pre-wrap">
                {getPreviewContent()}
              </div>
              {previewTemplate?.imageUrl && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Image:</p>
                  <img 
                    src={previewTemplate.imageUrl} 
                    alt="Template image" 
                    className="max-h-60 rounded-md"
                  />
                </div>
              )}
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
