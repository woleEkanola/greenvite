'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Swal from 'sweetalert2'
import { MessageTemplate } from '@/types/message-template'
import { Trash2, Edit, Plus, Check, X, Image } from 'lucide-react'

export default function MessageTemplatesPage() {
  const params = useParams()
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    isDefault: false,
    imageUrl: ''
  })
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/events/${params.id}/message-templates`)
      if (!response.ok) {
        throw new Error('Failed to fetch templates')
      }
      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
      Swal.fire({
        title: 'Error',
        text: 'Failed to load templates. Please try again.',
        icon: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: checked }))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview the image
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload the image
    try {
      setUploadingImage(true)
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to upload image')
      }

      const data = await response.json()
      setFormData(prev => ({ ...prev, imageUrl: data.url }))
    } catch (error) {
      console.error('Error uploading image:', error)
      Swal.fire({
        title: 'Error',
        text: 'Failed to upload image. Please try again.',
        icon: 'error'
      })
    } finally {
      setUploadingImage(false)
    }
  }

  const removeImage = () => {
    setPreviewImage(null)
    setFormData(prev => ({ ...prev, imageUrl: '' }))
  }

  const openCreateModal = () => {
    setEditingTemplate(null)
    setFormData({
      name: '',
      content: '',
      isDefault: false,
      imageUrl: ''
    })
    setPreviewImage(null)
    setShowModal(true)
  }

  const openEditModal = (template: MessageTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      content: template.content,
      isDefault: template.isDefault,
      imageUrl: template.imageUrl || ''
    })
    setPreviewImage(template.imageUrl || null)
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingTemplate
        ? `/api/admin/events/${params.id}/message-templates/${editingTemplate.id}`
        : `/api/admin/events/${params.id}/message-templates`
      
      const method = editingTemplate ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) {
        throw new Error(`Failed to ${editingTemplate ? 'update' : 'create'} template`)
      }
      
      await fetchTemplates()
      setShowModal(false)
      
      Swal.fire({
        title: 'Success',
        text: `Template ${editingTemplate ? 'updated' : 'created'} successfully!`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      })
    } catch (error) {
      console.error('Error saving template:', error)
      Swal.fire({
        title: 'Error',
        text: `Failed to ${editingTemplate ? 'update' : 'create'} template. Please try again.`,
        icon: 'error'
      })
    }
  }

  const handleDelete = async (templateId: string) => {
    try {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: 'This template will be permanently deleted.',
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
        
        if (!response.ok) {
          throw new Error('Failed to delete template')
        }
        
        await fetchTemplates()
        
        Swal.fire({
          title: 'Deleted!',
          text: 'Template has been deleted.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        })
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      Swal.fire({
        title: 'Error',
        text: 'Failed to delete template. Please try again.',
        icon: 'error'
      })
    }
  }

  const setAsDefault = async (templateId: string) => {
    try {
      const response = await fetch(`/api/admin/events/${params.id}/message-templates/${templateId}/set-default`, {
        method: 'PUT'
      })
      
      if (!response.ok) {
        throw new Error('Failed to set template as default')
      }
      
      await fetchTemplates()
      
      Swal.fire({
        title: 'Success',
        text: 'Default template updated!',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      })
    } catch (error) {
      console.error('Error setting default template:', error)
      Swal.fire({
        title: 'Error',
        text: 'Failed to set default template. Please try again.',
        icon: 'error'
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Message Templates</h1>
        <button
          onClick={openCreateModal}
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
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                  {template.isDefault && (
                    <span className="px-2 py-1 text-xs bg-emerald-100 text-emerald-800 rounded-full">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mb-4 line-clamp-3">{template.content}</p>
                <div className="flex justify-between mt-4">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openEditModal(template)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {!template.isDefault && (
                    <button
                      onClick={() => setAsDefault(template.id)}
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
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 border rounded-md"
                  placeholder="Enter template name"
                />
              </div>
              
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                  Message Content
                </label>
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  required
                  rows={6}
                  className="w-full p-2 border rounded-md"
                  placeholder="Enter message content"
                />
                <p className="mt-1 text-sm text-gray-500">
                  You can use {'{name}'} as a placeholder for the recipient's name.
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
                  name="isDefault"
                  checked={formData.isDefault}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-emerald-600 rounded"
                />
                <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700">
                  Set as default template
                </label>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 flex items-center"
                  disabled={uploadingImage}
                >
                  <Check className="h-4 w-4 mr-2" />
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
