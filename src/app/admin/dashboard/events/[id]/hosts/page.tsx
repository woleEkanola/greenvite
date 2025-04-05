'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircle, Edit, Trash2, Table, X, Search } from 'lucide-react'
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

export default function EventHostsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<any>(null)
  const [hosts, setHosts] = useState<Host[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  
  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentHost, setCurrentHost] = useState<Host | null>(null)
  const [hostName, setHostName] = useState('')
  const [hostEmail, setHostEmail] = useState('')
  const [hostPhone, setHostPhone] = useState('')
  const [hostRole, setHostRole] = useState('host')
  const [selectedTables, setSelectedTables] = useState<string[]>([])
  
  // Table assignment modal states
  const [isTableModalOpen, setIsTableModalOpen] = useState(false)
  const [currentHostForTables, setCurrentHostForTables] = useState<Host | null>(null)

  // Fetch event, hosts and tables
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
        setHosts(hostsData.hosts || [])
        
        // Fetch tables for this event
        const tablesResponse = await fetch(`/api/admin/events/${params.id}/tables`)
        if (!tablesResponse.ok) {
          throw new Error('Failed to fetch tables')
        }
        const tablesData = await tablesResponse.json()
        setTables(tablesData.tables || [])
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [params.id])

  // Filter hosts based on search term
  const filteredHosts = hosts.filter(host => {
    if (!searchTerm) return true
    
    const term = searchTerm.toLowerCase()
    return (
      host.name.toLowerCase().includes(term) ||
      host.email.toLowerCase().includes(term) ||
      (host.phone && host.phone.toLowerCase().includes(term))
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
        tableIds: selectedTables
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
        throw new Error(errorData.error || 'Failed to save host')
      }
      
      // Refresh hosts list
      const hostsResponse = await fetch(`/api/admin/events/${params.id}/hosts`)
      const hostsData = await hostsResponse.json()
      setHosts(hostsData.hosts || [])
      
      // Reset form and close modal
      resetForm()
      setIsModalOpen(false)
      
      toast.success(isEditMode ? 'Host updated successfully' : 'Host created successfully')
    } catch (error) {
      console.error('Error saving host:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save host')
    }
  }
  
  // Handle host deletion
  const handleDeleteHost = async (hostId: string) => {
    try {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: 'This will permanently delete this host and remove all table assignments.',
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
          throw new Error('Failed to delete host')
        }
        
        // Update hosts list
        setHosts(hosts.filter(host => host.id !== hostId))
        toast.success('Host deleted successfully')
      }
    } catch (error) {
      console.error('Error deleting host:', error)
      toast.error('Failed to delete host')
    }
  }
  
  // Handle table assignments
  const handleManageTables = (host: Host) => {
    setCurrentHostForTables(host)
    // Pre-select tables that are already assigned to this host
    setSelectedTables(host.tables.map(table => table.id))
    setIsTableModalOpen(true)
  }
  
  const handleSaveTableAssignments = async () => {
    try {
      if (!currentHostForTables) return
      
      const response = await fetch(`/api/admin/events/${params.id}/hosts/${currentHostForTables.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: currentHostForTables.name,
          email: currentHostForTables.email,
          phone: currentHostForTables.phone,
          role: currentHostForTables.role,
          tableIds: selectedTables
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update table assignments')
      }
      
      // Refresh hosts list
      const hostsResponse = await fetch(`/api/admin/events/${params.id}/hosts`)
      const hostsData = await hostsResponse.json()
      setHosts(hostsData.hosts || [])
      
      setIsTableModalOpen(false)
      toast.success('Table assignments updated successfully')
    } catch (error) {
      console.error('Error updating table assignments:', error)
      toast.error('Failed to update table assignments')
    }
  }
  
  // Reset form fields
  const resetForm = () => {
    setHostName('')
    setHostEmail('')
    setHostPhone('')
    setHostRole('host')
    setSelectedTables([])
    setCurrentHost(null)
    setIsEditMode(false)
  }
  
  // Open modal for editing a host
  const handleEditHost = (host: Host) => {
    setCurrentHost(host)
    setHostName(host.name)
    setHostEmail(host.email)
    setHostPhone(host.phone || '')
    setHostRole(host.role)
    setSelectedTables(host.tables.map(table => table.id))
    setIsEditMode(true)
    setIsModalOpen(true)
  }
  
  // Toggle table selection
  const toggleTableSelection = (tableId: string) => {
    if (selectedTables.includes(tableId)) {
      setSelectedTables(selectedTables.filter(id => id !== tableId))
    } else {
      setSelectedTables([...selectedTables, tableId])
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
    <div>
      <h1 className="text-2xl font-bold mb-2">Hosts</h1>
      <p className="text-gray-600 mb-8">
        Manage hosts for {event?.title || 'this event'}.
      </p>
      
      {/* Search and Add Host */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-64">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search hosts..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        
        <button
          onClick={() => {
            resetForm()
            setIsModalOpen(true)
          }}
          className="bg-emerald-500 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-emerald-600 transition-colors"
        >
          <PlusCircle size={18} />
          <span>Add Host</span>
        </button>
      </div>
      
      {/* Hosts list */}
      {filteredHosts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500 py-8">
            {searchTerm 
              ? 'No hosts match your search criteria.' 
              : 'No hosts have been added yet. Click the "Add Host" button to add your first host.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tables
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHosts.map(host => (
                <tr key={host.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{host.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{host.email}</div>
                    {host.phone && (
                      <div className="text-sm text-gray-500">{host.phone}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                      {host.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {host.tables.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {host.tables.map(table => (
                          <span 
                            key={table.id} 
                            className="px-2 py-1 text-xs rounded" 
                            style={{ backgroundColor: `${table.color}20`, color: table.color, border: `1px solid ${table.color}` }}
                          >
                            {table.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500 italic">No tables assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button 
                        onClick={() => handleEditHost(host)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit host"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleManageTables(host)}
                        className="text-purple-600 hover:text-purple-900"
                        title="Manage tables"
                      >
                        <Table size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteHost(host.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete host"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Host form modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {isEditMode ? 'Edit Host' : 'Add New Host'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleHostSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="hostName">
                  Name
                </label>
                <input
                  id="hostName"
                  type="text"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Full Name"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="hostEmail">
                  Email
                </label>
                <input
                  id="hostEmail"
                  type="email"
                  value={hostEmail}
                  onChange={(e) => setHostEmail(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="email@example.com"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="hostPhone">
                  Phone (Optional)
                </label>
                <input
                  id="hostPhone"
                  type="tel"
                  value={hostPhone}
                  onChange={(e) => setHostPhone(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="+1234567890"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="hostRole">
                  Role
                </label>
                <select
                  id="hostRole"
                  value={hostRole}
                  onChange={(e) => setHostRole(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="host">Host</option>
                  <option value="hostess">Hostess</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="assistant">Assistant</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Assign Tables (Optional)
                </label>
                {tables.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto border rounded p-2">
                    {tables.map(table => (
                      <div key={table.id} className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          id={`table-${table.id}`}
                          checked={selectedTables.includes(table.id)}
                          onChange={() => toggleTableSelection(table.id)}
                          className="mr-2"
                        />
                        <label 
                          htmlFor={`table-${table.id}`} 
                          className="text-sm flex items-center"
                        >
                          <span 
                            className="inline-block w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: table.color }}
                          ></span>
                          {table.name} (Capacity: {table.capacity})
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No tables available</p>
                )}
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 text-white px-4 py-2 rounded-md hover:bg-emerald-600 transition-colors"
                >
                  {isEditMode ? 'Update Host' : 'Create Host'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Table assignment modal */}
      {isTableModalOpen && currentHostForTables && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                Manage Tables for {currentHostForTables.name}
              </h2>
              <button 
                onClick={() => setIsTableModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            {tables.length > 0 ? (
              <div className="max-h-80 overflow-y-auto border rounded p-3 mb-4">
                {tables.map(table => (
                  <div key={table.id} className="flex items-center mb-3 p-2 hover:bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      id={`table-assign-${table.id}`}
                      checked={selectedTables.includes(table.id)}
                      onChange={() => toggleTableSelection(table.id)}
                      className="mr-3"
                    />
                    <label htmlFor={`table-assign-${table.id}`} className="flex-1">
                      <div className="font-medium flex items-center">
                        <span 
                          className="inline-block w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: table.color }}
                        ></span>
                        {table.name}
                      </div>
                      <div className="text-sm text-gray-600">Capacity: {table.capacity} seats</div>
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 mb-4">
                <p className="text-gray-500">No tables available for this event.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Add tables in the Tables section first.
                </p>
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsTableModalOpen(false)}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTableAssignments}
                className="bg-emerald-500 text-white px-4 py-2 rounded-md hover:bg-emerald-600 transition-colors"
              >
                Save Assignments
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
