'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircle, Edit, Trash2, Users, X, Table2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Swal from 'sweetalert2'
import BulkTableCreator from '@/components/admin/BulkTableCreator'

interface Table {
  id: string
  name: string
  capacity: number
  color: string
  hosts: Host[]
  occupancy?: number
  vacancy?: number
  guests?: Guest[]
}

interface Guest {
  id: string
  name: string
  type: string
  code: string
  isAdmitted: boolean
  rsvpName: string
  rsvpEmail: string
  rsvpPhone: string
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
  const [filteredTables, setFilteredTables] = useState<Table[]>([])
  const [searchTerm, setSearchTerm] = useState('')
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

  // Bulk creation modal state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)

  // Table occupants modal state
  const [isTableOccupantsModalOpen, setIsTableOccupantsModalOpen] = useState(false)
  const [currentTableForOccupants, setCurrentTableForOccupants] = useState<Table | null>(null)

  // State for tracking selected guests in the occupants modal
  const [selectedGuests, setSelectedGuests] = useState<string[]>([]);
  const [unassigningGuests, setUnassigningGuests] = useState(false);

  // Fetch event, tables and hosts
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
      const fetchedTables = tablesData.tables || [];
      setTables(fetchedTables)
      setFilteredTables(fetchedTables) // Initialize filtered tables with all tables
      
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

  useEffect(() => {
    fetchData()
  }, [params.id])

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredTables(tables);
      return;
    }
    
    const lowerCaseSearch = searchTerm.toLowerCase();
    const filtered = tables.filter(table => {
      // Search by table name
      if (table.name.toLowerCase().includes(lowerCaseSearch)) {
        return true;
      }
      
      // Search by host name
      if (table.hosts.some(host => 
        host.name.toLowerCase().includes(lowerCaseSearch) || 
        host.email.toLowerCase().includes(lowerCaseSearch)
      )) {
        return true;
      }
      
      // Search by guest name or email if guests are loaded
      if (table.guests && table.guests.some(guest => 
        guest.name.toLowerCase().includes(lowerCaseSearch) ||
        guest.rsvpName.toLowerCase().includes(lowerCaseSearch) ||
        guest.rsvpEmail.toLowerCase().includes(lowerCaseSearch)
      )) {
        return true;
      }
      
      // Search by capacity or occupancy
      if (table.capacity.toString().includes(lowerCaseSearch) || 
          (table.occupancy && table.occupancy.toString().includes(lowerCaseSearch))) {
        return true;
      }
      
      return false;
    });
    
    setFilteredTables(filtered);
  }, [searchTerm, tables]);

  // Handle table form submission
  const handleTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const tableData = {
        name: tableName,
        capacity: parseInt(tableCapacity.toString()),
        color: tableColor,
        hostIds: selectedHosts,
        // Include the table ID in the request body for updates
        ...(isEditMode && currentTable ? { id: currentTable.id } : {})
      }
      
      console.log('Submitting table data:', tableData);
      
      // Use the same endpoint for both create and update operations
      const url = `/api/admin/events/${params.id}/tables`
      const method = isEditMode ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tableData)
      })
      
      // Get the response text first to check if it's valid JSON
      const responseText = await response.text();
      let responseData;
      
      try {
        // Try to parse as JSON
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', responseText.substring(0, 100) + '...');
        throw new Error('Server returned an invalid response. The server might be experiencing issues.');
      }
      
      if (!response.ok) {
        // Show a more specific error message if available
        const errorMessage = responseData.error || 'Failed to save table'
        console.error('Server error response:', responseData)
        throw new Error(errorMessage)
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
      
      // Show a more specific error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to save table'
      toast.error(errorMessage)
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

  // View table occupants
  const handleViewTableOccupants = (table: Table) => {
    setCurrentTableForOccupants(table)
    setIsTableOccupantsModalOpen(true)
  }

  // Toggle guest selection in the occupants modal
  const toggleGuestSelection = (guestId: string) => {
    setSelectedGuests(prev => 
      prev.includes(guestId)
        ? prev.filter(id => id !== guestId)
        : [...prev, guestId]
    );
  };

  // Unassign selected guests from table
  const unassignGuestsFromTable = async () => {
    if (selectedGuests.length === 0) {
      toast.error('Please select at least one guest to unassign');
      return;
    }

    try {
      setUnassigningGuests(true);
      
      const response = await fetch(`/api/admin/events/${params.id}/access-codes/assign-table`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codeIds: selectedGuests,
          tableId: null // Setting tableId to null unassigns the codes
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unassign guests');
      }
      
      toast.success(`${selectedGuests.length} guest(s) unassigned successfully`);
      
      // Refresh tables to update the data
      await fetchData();
      
      // Clear selection
      setSelectedGuests([]);
      
      // Close the modal if all guests were unassigned
      if (currentTableForOccupants && selectedGuests.length === currentTableForOccupants.guests?.length) {
        setIsTableOccupantsModalOpen(false);
      }
    } catch (error: any) {
      console.error('Error unassigning guests:', error);
      toast.error(error.message || 'Failed to unassign guests');
    } finally {
      setUnassigningGuests(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Tables</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="bg-emerald-500 text-white px-3 py-2 rounded-md hover:bg-emerald-600 transition-colors flex items-center"
          >
            <Table2 className="h-5 w-5 mr-1" />
            <span>Bulk Create</span>
          </button>
          <button
            onClick={() => {
              resetForm()
              setIsModalOpen(true)
              setIsEditMode(false)
            }}
            className="bg-emerald-500 text-white px-3 py-2 rounded-md hover:bg-emerald-600 transition-colors flex items-center"
          >
            <PlusCircle className="h-5 w-5 mr-1" />
            <span>Add Table</span>
          </button>
        </div>
      </div>
      
      {/* Search and actions bar */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="w-full md:w-1/3">
          <input
            type="text"
            placeholder="Search tables by name, host, guest..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => {
              setIsModalOpen(true)
              setIsEditMode(false)
              resetForm()
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors flex items-center"
          >
            <PlusCircle size={18} className="mr-2" />
            Add Table
          </button>
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors flex items-center"
          >
            <Table2 size={18} className="mr-2" />
            Bulk Create
          </button>
        </div>
      </div>
      
      {/* Search results summary */}
      {searchTerm && (
        <div className="mb-4 text-sm text-gray-600">
          Found {filteredTables.length} {filteredTables.length === 1 ? 'table' : 'tables'} matching "{searchTerm}"
          {filteredTables.length === 0 && (
            <button 
              onClick={() => setSearchTerm('')}
              className="ml-2 text-blue-500 hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      )}
      
      {/* Tables list */}
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Tables ({filteredTables.length})</h2>
      </div>
      
      {filteredTables.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500 py-8">
            No tables have been created yet. Click the "Add Table" button to create your first table.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTables.map(table => (
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
                    <button 
                      onClick={() => handleViewTableOccupants(table)}
                      className="text-gray-500 hover:text-green-500 transition-colors"
                      title="View occupants"
                    >
                      <Users size={18} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600">Capacity: {table.capacity} seats</p>
                <p className="text-sm text-gray-600">Occupancy: {table.occupancy || 0} / {table.capacity}</p>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
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

      {/* Table occupants modal */}
      {isTableOccupantsModalOpen && currentTableForOccupants && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                Occupants of {currentTableForOccupants.name}
              </h2>
              <button 
                onClick={() => {
                  setIsTableOccupantsModalOpen(false);
                  setSelectedGuests([]);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Occupancy: {currentTableForOccupants.occupancy || 0} / {currentTableForOccupants.capacity}
              </p>
            </div>
            
            {currentTableForOccupants.guests && currentTableForOccupants.guests.length > 0 ? (
              <div className="max-h-80 overflow-y-auto border rounded p-3 mb-4">
                {currentTableForOccupants.guests.map(guest => (
                  <div key={guest.id} className="flex items-center mb-3 p-2 hover:bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      id={`guest-${guest.id}`}
                      checked={selectedGuests.includes(guest.id)}
                      onChange={() => toggleGuestSelection(guest.id)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{guest.name}</div>
                      <div className="text-sm text-gray-600">{guest.rsvpEmail}</div>
                      <div className="text-xs text-gray-500 capitalize">{guest.type}</div>
                    </div>
                    <div className="text-sm text-gray-600">{guest.isAdmitted ? 'Admitted' : 'Not Admitted'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 mb-4">
                <p className="text-gray-500">No occupants for this table.</p>
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              {currentTableForOccupants.guests && currentTableForOccupants.guests.length > 0 && (
                <button
                  type="button"
                  onClick={unassignGuestsFromTable}
                  disabled={selectedGuests.length === 0 || unassigningGuests}
                  className="bg-amber-500 text-white px-4 py-2 rounded-md hover:bg-amber-600 transition-colors disabled:bg-amber-300"
                >
                  {unassigningGuests ? 'Unassigning...' : `Unassign Selected (${selectedGuests.length})`}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsTableOccupantsModalOpen(false);
                  setSelectedGuests([]);
                }}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk table creation modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <BulkTableCreator
            eventId={params.id}
            onTablesCreated={() => {
              // Refresh tables list
              fetchData()
            }}
            onClose={() => setIsBulkModalOpen(false)}
          />
        </div>
      )}
    </div>
  )
}
