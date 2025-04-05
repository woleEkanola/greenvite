'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircle, Edit, Trash2, Gift, Search, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import Swal from 'sweetalert2'
import Image from 'next/image'

interface Souvenir {
  id: string
  name: string
  description?: string
  image?: string
  quantity: number
  assignments: SouvenirAssignment[]
}

interface SouvenirAssignment {
  id: string
  host?: {
    id: string
    name: string
  }
  table?: {
    id: string
    name: string
  }
  accessCode?: {
    id: string
    code: string
  }
}

export default function EventSouvenirsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<any>(null)
  const [souvenirs, setSouvenirs] = useState<Souvenir[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  
  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentSouvenir, setCurrentSouvenir] = useState<Souvenir | null>(null)
  const [souvenirName, setSouvenirName] = useState('')
  const [souvenirDescription, setSouvenirDescription] = useState('')
  const [souvenirImage, setSouvenirImage] = useState('')
  const [souvenirQuantity, setSouvenirQuantity] = useState(0)

  // Fetch event and souvenirs
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
        
        // Fetch souvenirs for this event
        const souvenirsResponse = await fetch(`/api/admin/events/${params.id}/souvenirs`)
        if (!souvenirsResponse.ok) {
          throw new Error('Failed to fetch souvenirs')
        }
        const souvenirsData = await souvenirsResponse.json()
        setSouvenirs(souvenirsData.souvenirs || [])
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [params.id])

  // Filter souvenirs based on search term
  const filteredSouvenirs = souvenirs.filter(souvenir => {
    if (!searchTerm) return true
    
    const term = searchTerm.toLowerCase()
    return (
      souvenir.name.toLowerCase().includes(term) ||
      (souvenir.description && souvenir.description.toLowerCase().includes(term))
    )
  })

  // Handle souvenir form submission
  const handleSouvenirSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const souvenirData = {
        name: souvenirName,
        description: souvenirDescription || undefined,
        image: souvenirImage || undefined,
        quantity: souvenirQuantity
      }
      
      if (isEditMode && currentSouvenir) {
        // Update existing souvenir
        const response = await fetch(`/api/admin/events/${params.id}/souvenirs`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...souvenirData,
            souvenirId: currentSouvenir.id
          })
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update souvenir')
        }
        
        // Update souvenir in state
        setSouvenirs(souvenirs.map(s => 
          s.id === currentSouvenir.id 
            ? { ...s, ...souvenirData, id: currentSouvenir.id } 
            : s
        ))
        
        toast.success('Souvenir updated successfully')
      } else {
        // Create new souvenir
        const response = await fetch(`/api/admin/events/${params.id}/souvenirs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(souvenirData)
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create souvenir')
        }
        
        const data = await response.json()
        
        // Add new souvenir to state
        setSouvenirs([...souvenirs, data.souvenir])
        
        toast.success('Souvenir created successfully')
      }
      
      // Reset form and close modal
      resetForm()
      setIsModalOpen(false)
    } catch (error) {
      console.error('Error saving souvenir:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save souvenir')
    }
  }
  
  // Handle souvenir deletion
  const handleDeleteSouvenir = async (souvenirId: string) => {
    try {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: 'This will permanently delete this souvenir.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
      })
      
      if (result.isConfirmed) {
        const response = await fetch(`/api/admin/events/${params.id}/souvenirs`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ souvenirId })
        })
        
        if (!response.ok) {
          throw new Error('Failed to delete souvenir')
        }
        
        // Update souvenirs list
        setSouvenirs(souvenirs.filter(s => s.id !== souvenirId))
        toast.success('Souvenir deleted successfully')
      }
    } catch (error) {
      console.error('Error deleting souvenir:', error)
      toast.error('Failed to delete souvenir')
    }
  }
  
  // Handle edit souvenir
  const handleEditSouvenir = (souvenir: Souvenir) => {
    setCurrentSouvenir(souvenir)
    setSouvenirName(souvenir.name)
    setSouvenirDescription(souvenir.description || '')
    setSouvenirImage(souvenir.image || '')
    setSouvenirQuantity(souvenir.quantity)
    setIsEditMode(true)
    setIsModalOpen(true)
  }
  
  // Reset form
  const resetForm = () => {
    setCurrentSouvenir(null)
    setSouvenirName('')
    setSouvenirDescription('')
    setSouvenirImage('')
    setSouvenirQuantity(0)
    setIsEditMode(false)
  }

  // Handle image upload (mock implementation)
  const handleImageUpload = () => {
    // In a real implementation, this would open a file picker and upload to a storage service
    const mockImageUrl = 'https://via.placeholder.com/150'
    setSouvenirImage(mockImageUrl)
    toast.success('Image uploaded successfully')
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{event?.title} - Souvenirs Management</h1>
        <button
          onClick={() => {
            resetForm()
            setIsModalOpen(true)
          }}
          className="bg-emerald-600 text-white px-4 py-2 rounded-md flex items-center hover:bg-emerald-700 transition-colors"
        >
          <Gift className="mr-2 h-5 w-5" />
          Add Souvenir
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Souvenirs List</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search souvenirs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        
        {filteredSouvenirs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? 'No souvenirs match your search.' : 'No souvenirs have been added yet.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {filteredSouvenirs.map((souvenir) => (
              <div key={souvenir.id} className="border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                {souvenir.image && (
                  <div className="relative h-48 w-full">
                    <img
                      src={souvenir.image}
                      alt={souvenir.name}
                      className="object-cover w-full h-full"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-1">{souvenir.name}</h3>
                  {souvenir.description && (
                    <p className="text-gray-600 text-sm mb-2">{souvenir.description}</p>
                  )}
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-sm font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      Quantity: {souvenir.quantity}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditSouvenir(souvenir)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSouvenir(souvenir.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Add/Edit Souvenir Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">
              {isEditMode ? 'Edit Souvenir' : 'Add New Souvenir'}
            </h2>
            
            <form onSubmit={handleSouvenirSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={souvenirName}
                    onChange={(e) => setSouvenirName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    id="description"
                    value={souvenirDescription}
                    onChange={(e) => setSouvenirDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
                    Image URL (optional)
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      id="image"
                      value={souvenirImage}
                      onChange={(e) => setSouvenirImage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleImageUpload}
                      className="bg-gray-200 px-3 py-2 rounded-r-md hover:bg-gray-300"
                    >
                      <Upload size={18} />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    id="quantity"
                    value={souvenirQuantity}
                    onChange={(e) => setSouvenirQuantity(parseInt(e.target.value) || 0)}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    resetForm()
                    setIsModalOpen(false)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                >
                  {isEditMode ? 'Update' : 'Add'} Souvenir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
