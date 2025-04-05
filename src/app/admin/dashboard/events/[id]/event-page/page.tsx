'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  Save, 
  Eye, 
  Upload, 
  Trash2, 
  Globe, 
  Check, 
  X,
  Image as ImageIcon
} from 'lucide-react'
import Swal from 'sweetalert2'
import { SketchPicker } from 'react-color'
import { Tab } from '@headlessui/react'

interface EventPageSettings {
  pageTitle: string
  pageDescription: string
  headerImage: string
  logoImage: string
  primaryColor: string
  secondaryColor: string
  fontFamily: string
  showLocationMap: boolean
  showAddToCalendar: boolean
  customCss: string
  isPagePublished: boolean
}

export default function EventPageCustomizationPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [event, setEvent] = useState<any>(null)
  const [settings, setSettings] = useState<EventPageSettings>({
    pageTitle: '',
    pageDescription: '',
    headerImage: '',
    logoImage: '',
    primaryColor: '#10b981', // Default emerald-500
    secondaryColor: '#064e3b', // Default emerald-900
    fontFamily: 'Inter, sans-serif',
    showLocationMap: true,
    showAddToCalendar: true,
    customCss: '',
    isPagePublished: false
  })
  const [showPrimaryColorPicker, setShowPrimaryColorPicker] = useState(false)
  const [showSecondaryColorPicker, setShowSecondaryColorPicker] = useState(false)
  const [uploadingHeaderImage, setUploadingHeaderImage] = useState(false)
  const [uploadingLogoImage, setUploadingLogoImage] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')

  // Font options
  const fontOptions = [
    { value: 'Inter, sans-serif', label: 'Inter (Modern)' },
    { value: 'Georgia, serif', label: 'Georgia (Elegant)' },
    { value: 'Arial, sans-serif', label: 'Arial (Clean)' },
    { value: 'Courier New, monospace', label: 'Courier (Typewriter)' },
    { value: 'Playfair Display, serif', label: 'Playfair Display (Sophisticated)' },
    { value: 'Montserrat, sans-serif', label: 'Montserrat (Contemporary)' }
  ]

  useEffect(() => {
    fetchEventData()
  }, [])

  useEffect(() => {
    if (event?.slug) {
      setPreviewUrl(`/events/${event.slug}`)
    }
  }, [event])

  const fetchEventData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/events/${params.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch event data')
      }
      const data = await response.json()
      setEvent(data)
      
      // Initialize settings with event data
      setSettings({
        pageTitle: data.pageTitle || data.title || '',
        pageDescription: data.pageDescription || data.description || '',
        headerImage: data.headerImage || data.imageUrl || '',
        logoImage: data.logoImage || '',
        primaryColor: data.primaryColor || '#10b981',
        secondaryColor: data.secondaryColor || '#064e3b',
        fontFamily: data.fontFamily || 'Inter, sans-serif',
        showLocationMap: data.showLocationMap !== undefined ? data.showLocationMap : true,
        showAddToCalendar: data.showAddToCalendar !== undefined ? data.showAddToCalendar : true,
        customCss: data.customCss || '',
        isPagePublished: data.isPagePublished || false
      })
    } catch (error) {
      console.error('Error fetching event data:', error)
      Swal.fire({
        title: 'Error',
        text: 'Failed to load event data. Please try again.',
        icon: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setSettings(prev => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setSettings(prev => ({ ...prev, [name]: checked }))
  }

  const handlePrimaryColorChange = (color: any) => {
    setSettings(prev => ({ ...prev, primaryColor: color.hex }))
  }

  const handleSecondaryColorChange = (color: any) => {
    setSettings(prev => ({ ...prev, secondaryColor: color.hex }))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'headerImage' | 'logoImage') => {
    const file = e.target.files?.[0]
    if (!file) return

    const isHeader = type === 'headerImage'
    
    try {
      isHeader ? setUploadingHeaderImage(true) : setUploadingLogoImage(true)
      
      const formData = new FormData()
      formData.append('file', file)
      formData.append('eventId', params.id as string)

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Failed to upload ${isHeader ? 'header' : 'logo'} image`)
      }

      const data = await response.json()
      setSettings(prev => ({ ...prev, [type]: data.url }))
    } catch (error) {
      console.error(`Error uploading ${isHeader ? 'header' : 'logo'} image:`, error)
      Swal.fire({
        title: 'Error',
        text: `Failed to upload ${isHeader ? 'header' : 'logo'} image. Please try again.`,
        icon: 'error'
      })
    } finally {
      isHeader ? setUploadingHeaderImage(false) : setUploadingLogoImage(false)
    }
  }

  const removeImage = (type: 'headerImage' | 'logoImage') => {
    setSettings(prev => ({ ...prev, [type]: '' }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      // Ensure boolean values are properly typed
      const dataToSend = {
        ...settings,
        showLocationMap: Boolean(settings.showLocationMap),
        showAddToCalendar: Boolean(settings.showAddToCalendar),
        isPagePublished: Boolean(settings.isPagePublished)
      }
      
      const response = await fetch(`/api/admin/events/${params.id}/event-page`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Error response:', errorData)
        throw new Error(errorData.error || errorData.details || 'Failed to save event page settings')
      }
      
      await fetchEventData() // Refresh data
      
      Swal.fire({
        title: 'Success',
        text: 'Event page settings saved successfully!',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      })
    } catch (error) {
      console.error('Error saving event page settings:', error)
      Swal.fire({
        title: 'Error',
        text: error instanceof Error ? error.message : 'Failed to save event page settings. Please try again.',
        icon: 'error'
      })
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    try {
      setSaving(true)
      
      const newSettings = { ...settings, isPagePublished: !settings.isPagePublished }
      
      const response = await fetch(`/api/admin/events/${params.id}/event-page`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSettings)
      })
      
      if (!response.ok) {
        throw new Error(`Failed to ${settings.isPagePublished ? 'unpublish' : 'publish'} event page`)
      }
      
      setSettings(newSettings)
      
      Swal.fire({
        title: 'Success',
        text: `Event page ${settings.isPagePublished ? 'unpublished' : 'published'} successfully!`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      })
    } catch (error) {
      console.error(`Error ${settings.isPagePublished ? 'unpublishing' : 'publishing'} event page:`, error)
      Swal.fire({
        title: 'Error',
        text: `Failed to ${settings.isPagePublished ? 'unpublish' : 'publish'} event page. Please try again.`,
        icon: 'error'
      })
    } finally {
      setSaving(false)
    }
  }

  const handlePreview = () => {
    if (event?.slug) {
      window.open(`/events/${event.slug}`, '_blank')
    } else {
      Swal.fire({
        title: 'Error',
        text: 'This event does not have a slug/URL yet. Please save the event first.',
        icon: 'error'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Event Page Customization</h1>
        <div className="flex space-x-3">
          <button
            onClick={handlePreview}
            disabled={!event?.slug}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center disabled:opacity-50"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </button>
          <button
            onClick={handlePublish}
            className={`px-4 py-2 rounded-md flex items-center ${
              settings.isPagePublished 
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            <Globe className="h-4 w-4 mr-2" />
            {settings.isPagePublished ? 'Unpublish' : 'Publish'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 flex items-center disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
      
      {event?.slug && (
        <div className="bg-emerald-50 p-4 rounded-md flex items-center justify-between">
          <div>
            <p className="text-emerald-800 font-medium">Event Page URL</p>
            <p className="text-emerald-600">
              {`${window.location.origin}/events/${event.slug}`}
            </p>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/events/${event.slug}`)
              Swal.fire({
                title: 'Copied!',
                text: 'Event URL copied to clipboard',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
              })
            }}
            className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
          >
            Copy URL
          </button>
        </div>
      )}
      
      <Tab.Group>
        <Tab.List className="flex space-x-1 rounded-xl bg-emerald-50 p-1">
          <Tab
            className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5 
              ${
                selected
                  ? 'bg-white shadow text-emerald-700'
                  : 'text-gray-600 hover:bg-white/[0.12] hover:text-emerald-600'
              }`
            }
          >
            Basic Settings
          </Tab>
          <Tab
            className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5 
              ${
                selected
                  ? 'bg-white shadow text-emerald-700'
                  : 'text-gray-600 hover:bg-white/[0.12] hover:text-emerald-600'
              }`
            }
          >
            Appearance
          </Tab>
          <Tab
            className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5 
              ${
                selected
                  ? 'bg-white shadow text-emerald-700'
                  : 'text-gray-600 hover:bg-white/[0.12] hover:text-emerald-600'
              }`
            }
          >
            Advanced
          </Tab>
        </Tab.List>
        <Tab.Panels>
          {/* Basic Settings Panel */}
          <Tab.Panel className="rounded-xl bg-white p-6 shadow">
            <div className="space-y-6">
              <div>
                <label htmlFor="pageTitle" className="block text-sm font-medium text-gray-700 mb-1">
                  Page Title
                </label>
                <input
                  type="text"
                  id="pageTitle"
                  name="pageTitle"
                  value={settings.pageTitle}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                  placeholder="Enter page title"
                />
                <p className="mt-1 text-sm text-gray-500">
                  This will be displayed as the main title on your event page.
                </p>
              </div>
              
              <div>
                <label htmlFor="pageDescription" className="block text-sm font-medium text-gray-700 mb-1">
                  Page Description
                </label>
                <textarea
                  id="pageDescription"
                  name="pageDescription"
                  value={settings.pageDescription}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full p-2 border rounded-md"
                  placeholder="Enter page description"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Describe your event. This will be displayed prominently on the page.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Show Location Map
                  </label>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="showLocationMap"
                      name="showLocationMap"
                      checked={settings.showLocationMap}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4 text-emerald-600 rounded"
                    />
                    <label htmlFor="showLocationMap" className="ml-2 text-sm text-gray-700">
                      Display map links on the event page
                    </label>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Show Add to Calendar
                  </label>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="showAddToCalendar"
                      name="showAddToCalendar"
                      checked={settings.showAddToCalendar}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4 text-emerald-600 rounded"
                    />
                    <label htmlFor="showAddToCalendar" className="ml-2 text-sm text-gray-700">
                      Allow guests to add the event to their calendar
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </Tab.Panel>
          
          {/* Appearance Panel */}
          <Tab.Panel className="rounded-xl bg-white p-6 shadow">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Header Image
                  </label>
                  <div className="mt-1 flex items-center">
                    {settings.headerImage ? (
                      <div className="relative">
                        <img
                          src={settings.headerImage}
                          alt="Header"
                          className="h-40 w-full object-cover rounded-md"
                        />
                        <button
                          onClick={() => removeImage('headerImage')}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center w-full h-40 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 cursor-pointer border-2 border-dashed border-gray-300">
                        <div className="text-center">
                          <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <span className="mt-2 block text-sm font-medium text-gray-700">
                            {uploadingHeaderImage ? 'Uploading...' : 'Upload Header Image'}
                          </span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 'headerImage')}
                          className="hidden"
                          disabled={uploadingHeaderImage}
                        />
                      </label>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Recommended size: 1200 x 400 pixels
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Logo Image
                  </label>
                  <div className="mt-1 flex items-center">
                    {settings.logoImage ? (
                      <div className="relative">
                        <img
                          src={settings.logoImage}
                          alt="Logo"
                          className="h-40 w-full object-contain rounded-md bg-gray-50"
                        />
                        <button
                          onClick={() => removeImage('logoImage')}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center w-full h-40 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 cursor-pointer border-2 border-dashed border-gray-300">
                        <div className="text-center">
                          <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <span className="mt-2 block text-sm font-medium text-gray-700">
                            {uploadingLogoImage ? 'Uploading...' : 'Upload Logo Image'}
                          </span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 'logoImage')}
                          className="hidden"
                          disabled={uploadingLogoImage}
                        />
                      </label>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Recommended size: 200 x 200 pixels
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Color
                  </label>
                  <div className="relative">
                    <div 
                      className="w-full p-2 border rounded-md flex items-center cursor-pointer"
                      onClick={() => setShowPrimaryColorPicker(!showPrimaryColorPicker)}
                    >
                      <div 
                        className="w-6 h-6 rounded-full mr-2" 
                        style={{ backgroundColor: settings.primaryColor }}
                      />
                      <span>{settings.primaryColor}</span>
                    </div>
                    {showPrimaryColorPicker && (
                      <div className="absolute z-10 mt-2">
                        <div 
                          className="fixed inset-0" 
                          onClick={() => setShowPrimaryColorPicker(false)}
                        />
                        <SketchPicker 
                          color={settings.primaryColor}
                          onChange={handlePrimaryColorChange}
                        />
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Used for buttons and primary accents
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Secondary Color
                  </label>
                  <div className="relative">
                    <div 
                      className="w-full p-2 border rounded-md flex items-center cursor-pointer"
                      onClick={() => setShowSecondaryColorPicker(!showSecondaryColorPicker)}
                    >
                      <div 
                        className="w-6 h-6 rounded-full mr-2" 
                        style={{ backgroundColor: settings.secondaryColor }}
                      />
                      <span>{settings.secondaryColor}</span>
                    </div>
                    {showSecondaryColorPicker && (
                      <div className="absolute z-10 mt-2">
                        <div 
                          className="fixed inset-0" 
                          onClick={() => setShowSecondaryColorPicker(false)}
                        />
                        <SketchPicker 
                          color={settings.secondaryColor}
                          onChange={handleSecondaryColorChange}
                        />
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Used for highlights and secondary elements
                  </p>
                </div>
              </div>
              
              <div>
                <label htmlFor="fontFamily" className="block text-sm font-medium text-gray-700 mb-1">
                  Font Family
                </label>
                <select
                  id="fontFamily"
                  name="fontFamily"
                  value={settings.fontFamily}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                >
                  {fontOptions.map(font => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Select a font for your event page
                </p>
              </div>
            </div>
          </Tab.Panel>
          
          {/* Advanced Panel */}
          <Tab.Panel className="rounded-xl bg-white p-6 shadow">
            <div className="space-y-6">
              <div>
                <label htmlFor="customCss" className="block text-sm font-medium text-gray-700 mb-1">
                  Custom CSS
                </label>
                <textarea
                  id="customCss"
                  name="customCss"
                  value={settings.customCss}
                  onChange={handleInputChange}
                  rows={10}
                  className="w-full p-2 border rounded-md font-mono text-sm"
                  placeholder="/* Add your custom CSS here */"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Advanced: Add custom CSS to further customize your event page.
                </p>
              </div>
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
      
      {/* Preview Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Preview</h2>
        <p className="text-gray-600 mb-4">
          See how your event page will look with the current settings.
        </p>
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-100 p-2 flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-500 mx-1"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500 mx-1"></div>
              <div className="w-3 h-3 rounded-full bg-green-500 mx-1"></div>
            </div>
            <div className="text-xs text-gray-500 truncate max-w-md">
              {event?.slug ? `${window.location.origin}/events/${event.slug}` : 'Event Preview'}
            </div>
          </div>
          <div className="relative">
            {settings.headerImage ? (
              <img 
                src={settings.headerImage} 
                alt="Header" 
                className="w-full h-32 object-cover"
              />
            ) : (
              <div className="w-full h-32 bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400">Header Image</span>
              </div>
            )}
            
            {settings.logoImage && (
              <div className="absolute top-24 left-4 w-16 h-16 rounded-full overflow-hidden border-4 border-white bg-white">
                <img 
                  src={settings.logoImage} 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </div>
          
          <div className="p-4" style={{ fontFamily: settings.fontFamily }}>
            <div className={`mt-${settings.logoImage ? '6' : '2'}`}>
              <h1 className="text-xl font-bold" style={{ color: settings.primaryColor }}>
                {settings.pageTitle || 'Event Title'}
              </h1>
              <p className="text-sm text-gray-600 mt-2">
                {settings.pageDescription || 'Event description will appear here.'}
              </p>
            </div>
            
            <div className="mt-4 flex flex-wrap gap-2">
              {settings.showLocationMap && (
                <button 
                  className="text-xs px-3 py-1 rounded-full flex items-center gap-1"
                  style={{ 
                    backgroundColor: `${settings.primaryColor}20`, 
                    color: settings.primaryColor 
                  }}
                >
                  <span>📍</span> View Location
                </button>
              )}
              
              {settings.showAddToCalendar && (
                <button 
                  className="text-xs px-3 py-1 rounded-full flex items-center gap-1"
                  style={{ 
                    backgroundColor: `${settings.primaryColor}20`, 
                    color: settings.primaryColor 
                  }}
                >
                  <span>📅</span> Add to Calendar
                </button>
              )}
            </div>
            
            <div className="mt-6">
              <button 
                className="w-full py-2 rounded-full text-white text-sm font-medium"
                style={{ backgroundColor: settings.primaryColor }}
              >
                Confirm Attendance
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
