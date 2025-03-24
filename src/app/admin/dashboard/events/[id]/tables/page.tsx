'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircle, Edit, Trash2, Users, X } from 'lucide-react'
import toast from 'react-hot-toast'
import Swal from 'sweetalert2'

interface Table {
  id: string
  name: string
  capacity: number
  color: string
  hosts: Host[]
}

interface Host {
  id: string
  name: string
  email: string
  phone?: string
  role: string
}

export default function EventTablesPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<any>(null)
  const [tables, setTables] = useState<Table[]>([])
  const [hosts, setHosts] = useState<Host[]>([])
  
  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentTable, setCurrentTable] = useState<Table | null>(null)
  const [tableName, setTableName] = useState('')
  const [tableCapacity, setTableCapacity] = useState(10)
  const [tableColor, setTableColor] = useState('#000000')
  const [selectedHosts, setSelectedHosts] = useState<string[]>([])
  
  // Host modal states
  const [isHostModalOpen, setIsHostModalOpen] = useState(false)
  const [currentTableForHosts, setCurrentTableForHosts] = useState<Table | null>(null)

  // Fetch event, tables and hosts
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
        
        // Fetch tables for this event
        const tablesResponse = await fetch(`/api/admin/events/${params.id}/tables`)
        if (!tablesResponse.ok) {
          throw new Error('Failed to fetch tables')
        }
        const tablesData = await tablesResponse.json()
        setTables(tablesData.tables || [])
        
        // Fetch hosts for this event
        const hostsResponse = await fetch(`/api/admin/events/${params.id}/hosts`)
        if (!hostsResponse.ok) {
          throw new Error('Failed to fetch hosts')
        }
        const hostsData = await hostsResponse.json()
        setHosts(hostsData.hosts || [])
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [params.id])

  // Handle table form submission
  const handleTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const tableData = {
        name: tableName,
        capacity: parseInt(tableCapacity.toString()),
        color: tableColor,
        hostIds: selectedHosts
      }
      
      const url = `/api/admin/events/${params.id}/tables${isEditMode && currentTable ? `/${currentTable.id}` : ''}`
      const method = isEditMode ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tableData)
      })
      
      if (!response.ok) {
        throw new Error('Failed to save table')
      }
      
      // Refresh tables list
      const tablesResponse = await fetch(`/api/admin/events/${params.id}/tables`)
      const tablesData = await tablesResponse.json()
      setTables(tablesData.tables || [])
      
      // Reset form and close modal
      resetForm()
      setIsModalOpen(false)
      
      toast.success(isEditMode ? 'Table updated successfully' : 'Table created successfully')
    } catch (error) {
      console.error('Error saving table:', error)
      toast.error('Failed to save table')
    }
  }
  
  // Handle table deletion
  const handleDeleteTable = async (tableId: string) => {
    try {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: 'This will permanently delete this table and remove all host assignments.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
      })
      
      if (result.isConfirmed) {
        const response = await fetch(`/api/admin/events/${params.id}/tables/${tableId}`, {
          method: 'DELETE'
        })
        
        if (!response.ok) {
          throw new Error('Failed to delete table')
        }
        
        // Update tables list
        setTables(tables.filter(table => table.id !== tableId))
        toast.success('Table deleted successfully')
      }
    } catch (error) {
      console.error('Error deleting table:', error)
      toast.error('Failed to delete table')
    }
  }
  
  // Handle host assignments
  const handleManageHosts = (table: Table) => {
    setCurrentTableForHosts(table)
    // Pre-select hosts that are already assigned to this table
    setSelectedHosts(table.hosts.map(host => host.id))
    setIsHostModalOpen(true)
  }
  
  const handleSaveHostAssignments = async () => {
    try {
      if (!currentTableForHosts) return
      
      const response = await fetch(`/api/admin/events/${params.id}/tables/${currentTableForHosts.id}/hosts`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ hostIds: selectedHosts })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update host assignments')
      }
      
      // Refresh tables list
      const tablesResponse = await fetch(`/api/admin/events/${params.id}/tables`)
      const tablesData = await tablesResponse.json()
      setTables(tablesData.tables || [])
      
      setIsHostModalOpen(false)
      toast.success('Host assignments updated successfully')
    } catch (error) {
      console.error('Error updating host assignments:', error)
      toast.error('Failed to update host assignments')
    }
  }
  
  // Reset form fields
  const resetForm = () => {
    setTableName('')
    setTableCapacity(10)
    setTableColor('#000000')
    setSelectedHosts([])
    setCurrentTable(null)
    setIsEditMode(false)
  }
  
  // Open modal for editing a table
  const handleEditTable = (table: Table) => {
    setCurrentTable(table)
    setTableName(table.name)
    setTableCapacity(table.capacity)
    setTableColor(table.color)
    setSelectedHosts(table.hosts.map(host => host.id))
    setIsEditMode(true)
    setIsModalOpen(true)
  }
  
  // Toggle host selection
  const toggleHostSelection = (hostId: string) => {
    if (selectedHosts.includes(hostId)) {
      setSelectedHosts(selectedHosts.filter(id => id !== hostId))
    } else {
      setSelectedHosts([...selectedHosts, hostId])
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
      <h1 className="text-2xl font-bold mb-2">Tables</h1>
      <p className="text-gray-600 mb-8">
        Manage tables for {event?.title || 'this event'}.
      </p>
      
      {/* Tables list */}
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Tables ({tables.length})</h2>
        <button
          onClick={() => {
            resetForm()
            setIsModalOpen(true)
          }}
          className="bg-emerald-500 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-emerald-600 transition-colors"
        >
          <PlusCircle size={18} />
          <span>Add Table</span>
        </button>
      </div>
      
      {tables.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500 py-8">
            No tables have been created yet. Click the "Add Table" button to create your first table.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map(table => (
            <div 
              key={table.id} 
              className="bg-white rounded-lg shadow overflow-hidden"
              style={{ borderTop: `4px solid ${table.color}` }}
            >
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold">{table.name}</h3>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleEditTable(table)}
                      className="text-gray-500 hover:text-blue-500 transition-colors"
                      title="Edit table"
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteTable(table.id)}
                      className="text-gray-500 hover:text-red-500 transition-colors"
                      title="Delete table"
                    >
                      <Trash2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleManageHosts(table)}
                      className="text-gray-500 hover:text-purple-500 transition-colors"
                      title="Manage hosts"
                    >
                      <Users size={18} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600">Capacity: {table.capacity} seats</p>
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-700 mb-1">Hosts:</p>
                  {table.hosts.length > 0 ? (
                    <ul className="text-sm text-gray-600">
                      {table.hosts.map(host => (
                        <li key={host.id} className="mb-1">
                          {host.name} ({host.role})
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No hosts assigned</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Table form modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {isEditMode ? 'Edit Table' : 'Add New Table'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleTableSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="tableName">
                  Table Name
                </label>
                <input
                  id="tableName"
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="e.g., Table 1"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="tableCapacity">
                  Capacity
                </label>
                <input
                  id="tableCapacity"
                  type="number"
                  min="1"
                  value={tableCapacity}
                  onChange={(e) => setTableCapacity(parseInt(e.target.value))}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="tableColor">
                  Color
                </label>
                <input
                  id="tableColor"
                  type="color"
                  value={tableColor}
                  onChange={(e) => setTableColor(e.target.value)}
                  className="shadow appearance-none border rounded w-full h-10 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Assign Hosts (Optional)
                </label>
                {hosts.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto border rounded p-2">
                    {hosts.map(host => (
                      <div key={host.id} className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          id={`host-${host.id}`}
                          checked={selectedHosts.includes(host.id)}
                          onChange={() => toggleHostSelection(host.id)}
                          className="mr-2"
                        />
                        <label htmlFor={`host-${host.id}`} className="text-sm">
                          {host.name} ({host.role})
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No hosts available</p>
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
                  {isEditMode ? 'Update Table' : 'Create Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Host assignment modal */}
      {isHostModalOpen && currentTableForHosts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                Manage Hosts for {currentTableForHosts.name}
              </h2>
              <button 
                onClick={() => setIsHostModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            {hosts.length > 0 ? (
              <div className="max-h-80 overflow-y-auto border rounded p-3 mb-4">
                {hosts.map(host => (
                  <div key={host.id} className="flex items-center mb-3 p-2 hover:bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      id={`host-assign-${host.id}`}
                      checked={selectedHosts.includes(host.id)}
                      onChange={() => toggleHostSelection(host.id)}
                      className="mr-3"
                    />
                    <label htmlFor={`host-assign-${host.id}`} className="flex-1">
                      <div className="font-medium">{host.name}</div>
                      <div className="text-sm text-gray-600">{host.email}</div>
                      <div className="text-xs text-gray-500 capitalize">{host.role}</div>
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 mb-4">
                <p className="text-gray-500">No hosts available for this event.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Add hosts in the Hosts section first.
                </p>
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsHostModalOpen(false)}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveHostAssignments}
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
