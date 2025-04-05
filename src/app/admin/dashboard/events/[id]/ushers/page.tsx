'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircle, Edit, Trash2, UserPlus, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import Swal from 'sweetalert2'

interface Host {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  tables: Table[]
}

interface Table {
  id: string
  name: string
  capacity: number
  color: string
}

export default function EventUshersPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<any>(null)
  const [hosts, setHosts] = useState<Host[]>([])
  const [ushers, setUshers] = useState<Host[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  
  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentHost, setCurrentHost] = useState<Host | null>(null)
  const [hostName, setHostName] = useState('')
  const [hostEmail, setHostEmail] = useState('')
  const [hostPhone, setHostPhone] = useState('')
  const [hostRole, setHostRole] = useState('host')

  // Fetch event and hosts
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
        
        // Fetch hosts for this event
        const hostsResponse = await fetch(`/api/admin/events/${params.id}/hosts`)
        if (!hostsResponse.ok) {
          throw new Error('Failed to fetch hosts')
        }
        const hostsData = await hostsResponse.json()
        
        // Filter hosts to only include those with role 'host' or 'hostess'
        const allHosts = hostsData.hosts || []
        const filteredUshers = allHosts.filter((host: Host) => host.role === 'host' || host.role === 'hostess')
        
        setHosts(allHosts)
        setUshers(filteredUshers)
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [params.id])

  // Filter ushers based on search term
  const filteredUshers = ushers.filter(usher => {
    if (!searchTerm) return true
    
    const term = searchTerm.toLowerCase()
    return (
      usher.name.toLowerCase().includes(term) ||
      usher.email.toLowerCase().includes(term) ||
      (usher.phone && usher.phone.toLowerCase().includes(term))
    )
  })

  // Handle host form submission
  const handleHostSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const hostData = {
        name: hostName,
        email: hostEmail,
        phone: hostPhone || undefined,
        role: hostRole,
        tableIds: []
      }
      
      const url = `/api/admin/events/${params.id}/hosts${isEditMode && currentHost ? `/${currentHost.id}` : ''}`
      const method = isEditMode ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(hostData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save usher')
      }
      
      // Refresh hosts list
      const hostsResponse = await fetch(`/api/admin/events/${params.id}/hosts`)
      const hostsData = await hostsResponse.json()
      
      // Filter hosts to only include those with role 'host' or 'hostess'
      const allHosts = hostsData.hosts || []
      const filteredUshers = allHosts.filter((host: Host) => host.role === 'host' || host.role === 'hostess')
      
      setHosts(allHosts)
      setUshers(filteredUshers)
      
      // Reset form and close modal
      resetForm()
      setIsModalOpen(false)
      
      toast.success(isEditMode ? 'Usher updated successfully' : 'Usher created successfully')
    } catch (error) {
      console.error('Error saving usher:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save usher')
    }
  }
  
  // Handle host deletion
  const handleDeleteHost = async (hostId: string) => {
    try {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: 'This will permanently delete this usher.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
      })
      
      if (result.isConfirmed) {
        const response = await fetch(`/api/admin/events/${params.id}/hosts/${hostId}`, {
          method: 'DELETE'
        })
        
        if (!response.ok) {
          throw new Error('Failed to delete usher')
        }
        
        // Update hosts list
        setUshers(ushers.filter(usher => usher.id !== hostId))
        setHosts(hosts.filter(host => host.id !== hostId))
        toast.success('Usher deleted successfully')
      }
    } catch (error) {
      console.error('Error deleting usher:', error)
      toast.error('Failed to delete usher')
    }
  }
  
  // Handle edit host
  const handleEditHost = (host: Host) => {
    setCurrentHost(host)
    setHostName(host.name)
    setHostEmail(host.email)
    setHostPhone(host.phone || '')
    setHostRole(host.role)
    setIsEditMode(true)
    setIsModalOpen(true)
  }
  
  // Reset form
  const resetForm = () => {
    setCurrentHost(null)
    setHostName('')
    setHostEmail('')
    setHostPhone('')
    setHostRole('host')
    setIsEditMode(false)
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
        <h1 className="text-2xl font-bold">{event?.title} - Ushers Management</h1>
        <button
          onClick={() => {
            resetForm()
            setIsModalOpen(true)
          }}
          className="bg-emerald-600 text-white px-4 py-2 rounded-md flex items-center hover:bg-emerald-700 transition-colors"
        >
          <UserPlus className="mr-2 h-5 w-5" />
          Add Usher
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Ushers List</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search ushers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        
        {filteredUshers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? 'No ushers match your search.' : 'No ushers have been added yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUshers.map((usher) => (
                  <tr key={usher.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{usher.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{usher.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{usher.phone || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        usher.role === 'host' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {usher.role === 'host' ? 'Host' : 'Hostess'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditHost(usher)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteHost(usher.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Add/Edit Host Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">
              {isEditMode ? 'Edit Usher' : 'Add New Usher'}
            </h2>
            
            <form onSubmit={handleHostSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={hostEmail}
                    onChange={(e) => setHostEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone (optional)
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={hostPhone}
                    onChange={(e) => setHostPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    id="role"
                    value={hostRole}
                    onChange={(e) => setHostRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="host">Host</option>
                    <option value="hostess">Hostess</option>
                  </select>
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
                  {isEditMode ? 'Update' : 'Add'} Usher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
