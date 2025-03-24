'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircle, Edit, Trash2, Utensils, Search, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import Swal from 'sweetalert2'

interface MenuItem {
  id: string
  name: string
  description?: string
  type: string 
  dietaryInfo: string[]
  image?: string
}

export default function EventMenuPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<any>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  
  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentMenuItem, setCurrentMenuItem] = useState<MenuItem | null>(null)
  const [menuItemName, setMenuItemName] = useState('')
  const [menuItemDescription, setMenuItemDescription] = useState('')
  const [menuItemType, setMenuItemType] = useState<string>('main')
  const [menuItemDietaryInfo, setMenuItemDietaryInfo] = useState<string[]>([])
  const [menuItemImage, setMenuItemImage] = useState('')

  // Dietary options
  const dietaryOptions = [
    { id: 'vegetarian', label: 'Vegetarian' },
    { id: 'vegan', label: 'Vegan' },
    { id: 'gluten-free', label: 'Gluten Free' },
    { id: 'dairy-free', label: 'Dairy Free' },
    { id: 'nut-free', label: 'Nut Free' },
    { id: 'halal', label: 'Halal' },
    { id: 'kosher', label: 'Kosher' }
  ]

  // Fetch event and menu items
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
        
        // Fetch menu items for this event
        const menuResponse = await fetch(`/api/admin/events/${params.id}/menu`)
        if (!menuResponse.ok) {
          throw new Error('Failed to fetch menu items')
        }
        const menuData = await menuResponse.json()
        setMenuItems(menuData.menuItems || [])
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [params.id])

  // Filter menu items based on search term
  const filteredMenuItems = menuItems.filter(item => {
    if (!searchTerm) return true
    
    const term = searchTerm.toLowerCase()
    return (
      item.name.toLowerCase().includes(term) ||
      (item.description && item.description.toLowerCase().includes(term)) ||
      item.type.toLowerCase().includes(term)
    )
  })

  // Group menu items by type
  const groupedMenuItems = {
    appetizer: filteredMenuItems.filter(item => item.type === 'appetizer'),
    main: filteredMenuItems.filter(item => item.type === 'main'),
    dessert: filteredMenuItems.filter(item => item.type === 'dessert'),
    drink: filteredMenuItems.filter(item => item.type === 'drink'),
    other: filteredMenuItems.filter(item => item.type === 'other')
  }

  // Handle menu item form submission
  const handleMenuItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const menuItemData = {
        name: menuItemName,
        description: menuItemDescription || undefined,
        type: menuItemType,
        dietaryInfo: menuItemDietaryInfo,
        image: menuItemImage || undefined
      }
      
      if (isEditMode && currentMenuItem) {
        // Update existing menu item
        const response = await fetch(`/api/admin/events/${params.id}/menu`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...menuItemData,
            id: currentMenuItem.id
          })
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update menu item')
        }
        
        const data = await response.json()
        
        // Update menu item in state
        setMenuItems(menuItems.map(item => 
          item.id === currentMenuItem.id ? data.menuItem : item
        ))
        
        toast.success('Menu item updated successfully')
      } else {
        // Create new menu item
        const response = await fetch(`/api/admin/events/${params.id}/menu`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(menuItemData)
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create menu item')
        }
        
        const data = await response.json()
        
        // Add new menu item to state
        setMenuItems([...menuItems, data.menuItem])
        
        toast.success('Menu item created successfully')
      }
      
      // Reset form and close modal
      resetForm()
      setIsModalOpen(false)
    } catch (error) {
      console.error('Error saving menu item:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save menu item')
    }
  }
  
  // Handle menu item deletion
  const handleDeleteMenuItem = async (menuItemId: string) => {
    try {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: 'This will permanently delete this menu item.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
      })
      
      if (result.isConfirmed) {
        const response = await fetch(`/api/admin/events/${params.id}/menu`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ menuItemId })
        })
        
        if (!response.ok) {
          throw new Error('Failed to delete menu item')
        }
        
        // Update menu items list
        setMenuItems(menuItems.filter(item => item.id !== menuItemId))
        toast.success('Menu item deleted successfully')
      }
    } catch (error) {
      console.error('Error deleting menu item:', error)
      toast.error('Failed to delete menu item')
    }
  }
  
  // Handle edit menu item
  const handleEditMenuItem = (menuItem: MenuItem) => {
    setCurrentMenuItem(menuItem)
    setMenuItemName(menuItem.name)
    setMenuItemDescription(menuItem.description || '')
    setMenuItemType(menuItem.type)
    setMenuItemDietaryInfo(menuItem.dietaryInfo || [])
    setMenuItemImage(menuItem.image || '')
    setIsEditMode(true)
    setIsModalOpen(true)
  }
  
  // Reset form
  const resetForm = () => {
    setCurrentMenuItem(null)
    setMenuItemName('')
    setMenuItemDescription('')
    setMenuItemType('main')
    setMenuItemDietaryInfo([])
    setMenuItemImage('')
    setIsEditMode(false)
  }

  // Handle dietary info checkbox change
  const handleDietaryInfoChange = (option: string) => {
    if (menuItemDietaryInfo.includes(option)) {
      setMenuItemDietaryInfo(menuItemDietaryInfo.filter(item => item !== option))
    } else {
      setMenuItemDietaryInfo([...menuItemDietaryInfo, option])
    }
  }

  // Handle image upload (mock implementation)
  const handleImageUpload = () => {
    // In a real implementation, this would open a file picker and upload to a storage service
    const mockImageUrl = 'https://via.placeholder.com/150'
    setMenuItemImage(mockImageUrl)
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
        <h1 className="text-2xl font-bold">{event?.title} - Menu Management</h1>
        <button
          onClick={() => {
            resetForm()
            setIsModalOpen(true)
          }}
          className="bg-emerald-600 text-white px-4 py-2 rounded-md flex items-center hover:bg-emerald-700 transition-colors"
        >
          <Utensils className="mr-2 h-5 w-5" />
          Add Menu Item
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Menu Items</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        
        {filteredMenuItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? 'No menu items match your search.' : 'No menu items have been added yet.'}
          </div>
        ) : (
          <div className="p-4">
            {/* Appetizers */}
            {groupedMenuItems.appetizer.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-3 text-emerald-700 border-b pb-2">Appetizers</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedMenuItems.appetizer.map(renderMenuItem)}
                </div>
              </div>
            )}
            
            {/* Main Courses */}
            {groupedMenuItems.main.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-3 text-emerald-700 border-b pb-2">Main Courses</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedMenuItems.main.map(renderMenuItem)}
                </div>
              </div>
            )}
            
            {/* Desserts */}
            {groupedMenuItems.dessert.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-3 text-emerald-700 border-b pb-2">Desserts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedMenuItems.dessert.map(renderMenuItem)}
                </div>
              </div>
            )}
            
            {/* Drinks */}
            {groupedMenuItems.drink.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-3 text-emerald-700 border-b pb-2">Drinks</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedMenuItems.drink.map(renderMenuItem)}
                </div>
              </div>
            )}
            
            {/* Other */}
            {groupedMenuItems.other.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-3 text-emerald-700 border-b pb-2">Other Items</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedMenuItems.other.map(renderMenuItem)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Add/Edit Menu Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              {isEditMode ? 'Edit Menu Item' : 'Add New Menu Item'}
            </h2>
            
            <form onSubmit={handleMenuItemSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={menuItemName}
                    onChange={(e) => setMenuItemName(e.target.value)}
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
                    value={menuItemDescription}
                    onChange={(e) => setMenuItemDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    id="type"
                    value={menuItemType}
                    onChange={(e) => setMenuItemType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  >
                    <option value="appetizer">Appetizer</option>
                    <option value="main">Main Course</option>
                    <option value="dessert">Dessert</option>
                    <option value="drink">Drink</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dietary Information (optional)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {dietaryOptions.map(option => (
                      <div key={option.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`dietary-${option.id}`}
                          checked={menuItemDietaryInfo.includes(option.id)}
                          onChange={() => handleDietaryInfoChange(option.id)}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`dietary-${option.id}`} className="ml-2 text-sm text-gray-700">
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
                    Image URL (optional)
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      id="image"
                      value={menuItemImage}
                      onChange={(e) => setMenuItemImage(e.target.value)}
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
                  {isEditMode ? 'Update' : 'Add'} Menu Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
  
  // Helper function to render a menu item card
  function renderMenuItem(menuItem: MenuItem) {
    return (
      <div key={menuItem.id} className="border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
        {menuItem.image && (
          <div className="relative h-48 w-full">
            <img
              src={menuItem.image}
              alt={menuItem.name}
              className="object-cover w-full h-full"
            />
          </div>
        )}
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-1">{menuItem.name}</h3>
          {menuItem.description && (
            <p className="text-gray-600 text-sm mb-2">{menuItem.description}</p>
          )}
          
          {menuItem.dietaryInfo && menuItem.dietaryInfo.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {menuItem.dietaryInfo.map(info => (
                <span key={info} className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                  {info}
                </span>
              ))}
            </div>
          )}
          
          <div className="flex justify-end space-x-2 mt-2">
            <button
              onClick={() => handleEditMenuItem(menuItem)}
              className="text-indigo-600 hover:text-indigo-900"
            >
              <Edit className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleDeleteMenuItem(menuItem.id)}
              className="text-red-600 hover:text-red-900"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    )
  }
}
