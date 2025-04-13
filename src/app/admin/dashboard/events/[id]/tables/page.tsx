'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircle, Edit, Trash2, Users, X, Table2, PieChart, UserCheck, UserX, LayoutGrid, List, Search, Loader2 } from 'lucide-react'
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
  const [vacancyFilter, setVacancyFilter] = useState('all') // 'all', 'vacant', 'full'
  const [hosts, setHosts] = useState<Host[]>([])
  const [tableStats, setTableStats] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  
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
      
      // Fetch table statistics
      await fetchTableStats()
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Fetch table statistics
  const fetchTableStats = async () => {
    try {
      setLoadingStats(true)
      const statsResponse = await fetch(`/api/admin/events/${params.id}/tables/stats`)
      if (!statsResponse.ok) {
        throw new Error('Failed to fetch table statistics')
      }
      const statsData = await statsResponse.json()
      setTableStats(statsData.stats)
    } catch (error) {
      console.error('Error fetching table statistics:', error)
      toast.error('Failed to load table statistics')
    } finally {
      setLoadingStats(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [params.id])

  useEffect(() => {
    if (!searchTerm.trim() && vacancyFilter === 'all') {
      setFilteredTables(tables);
      return;
    }
    
    // First filter by search term
    let filtered = tables;
    
    if (searchTerm.trim()) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      filtered = tables.filter(table => {
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
    }
    
    // Then filter by vacancy status
    if (vacancyFilter !== 'all') {
      filtered = filtered.filter(table => {
        const occupancy = table.occupancy || 0;
        if (vacancyFilter === 'vacant') {
          return occupancy < table.capacity; // Has at least one vacant seat
        } else if (vacancyFilter === 'full') {
          return occupancy >= table.capacity; // No vacant seats
        }
        return true;
      });
    }
    
    setFilteredTables(filtered);
  }, [tables, searchTerm, vacancyFilter]);

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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tables for {event?.title || 'Event'}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors flex items-center gap-1"
          >
            <PlusCircle size={16} />
            <span>Bulk Create</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-500 text-white px-4 py-2 rounded-md hover:bg-emerald-600 transition-colors flex items-center gap-1"
          >
            <PlusCircle size={16} />
            <span>Add Table</span>
          </button>
        </div>
      </div>
      
      {/* Table Statistics Dashboard */}
      {!loading && tableStats && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <PieChart className="h-5 w-5 text-blue-500" />
              Table Statistics
            </h2>
            <button 
              onClick={fetchTableStats} 
              className="text-sm text-blue-500 hover:text-blue-700"
              disabled={loadingStats}
            >
              {loadingStats ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tables breakdown */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Tables</h3>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Total Tables:</span>
                <span className="font-semibold">{tableStats.tables.total}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-green-500 h-2.5 rounded-full" style={{ 
                      width: `${tableStats.tables.total > 0 ? (tableStats.tables.full / tableStats.tables.total) * 100 : 0}%` 
                    }}></div>
                  </div>
                  <span className="ml-2 text-sm text-gray-600">{tableStats.tables.full} Full</span>
                </div>
                <div className="flex items-center">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-yellow-500 h-2.5 rounded-full" style={{ 
                      width: `${tableStats.tables.total > 0 ? (tableStats.tables.partiallyOccupied / tableStats.tables.total) * 100 : 0}%` 
                    }}></div>
                  </div>
                  <span className="ml-2 text-sm text-gray-600">{tableStats.tables.partiallyOccupied} Partial</span>
                </div>
                <div className="flex items-center">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-gray-400 h-2.5 rounded-full" style={{ 
                      width: `${tableStats.tables.total > 0 ? (tableStats.tables.empty / tableStats.tables.total) * 100 : 0}%` 
                    }}></div>
                  </div>
                  <span className="ml-2 text-sm text-gray-600">{tableStats.tables.empty} Empty</span>
                </div>
              </div>
            </div>
            
            {/* Seats breakdown */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Seats</h3>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Total Capacity:</span>
                <span className="font-semibold">{tableStats.seats.totalCapacity}</span>
              </div>
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200">
                      Occupied: {tableStats.seats.occupied}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                      Vacant: {tableStats.seats.vacant}
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-6 mb-4 text-xs flex rounded bg-gray-200">
                  <div style={{ width: `${tableStats.seats.occupancyRate}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500">
                    {Math.round(tableStats.seats.occupancyRate)}%
                  </div>
                </div>
              </div>
            </div>
            
            {/* Invitees breakdown */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Invitees</h3>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Total Invitees:</span>
                <span className="font-semibold">{tableStats.invitees.total}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-green-100 p-3 rounded-lg text-center">
                  <div className="flex items-center justify-center mb-1">
                    <UserCheck className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-sm font-medium text-green-600">Assigned</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">{tableStats.invitees.assigned}</p>
                </div>
                <div className="bg-amber-100 p-3 rounded-lg text-center">
                  <div className="flex items-center justify-center mb-1">
                    <UserX className="h-4 w-4 text-amber-600 mr-1" />
                    <span className="text-sm font-medium text-amber-600">Unassigned</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-700">{tableStats.invitees.unassigned}</p>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                <div className="flex justify-between mb-1">
                  <span>Admitted with table:</span>
                  <span className="font-medium">{tableStats.admission.admittedWithTable}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Admitted without table:</span>
                  <span className="font-medium">{tableStats.admission.admittedWithoutTable}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hall admitted:</span>
                  <span className="font-medium">{tableStats.admission.hallAdmittedWithTable + tableStats.admission.hallAdmittedWithoutTable}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Search and actions bar */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="w-full md:w-2/3 flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              placeholder="Search tables..."
            />
          </div>
          
          <select
            value={vacancyFilter}
            onChange={(e) => setVacancyFilter(e.target.value)}
            className="block w-32 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
          >
            <option value="all">All Tables</option>
            <option value="vacant">Has Vacancy</option>
            <option value="full">Full</option>
            <option value="empty">Empty</option>
          </select>
        </div>
        
        {/* View mode toggle */}
        <div className="flex items-center space-x-2 ml-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            title="Grid View"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-md ${viewMode === 'table' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            title="Table View"
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Tables display */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500" />
          <p className="mt-2 text-gray-500">Loading tables...</p>
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500">No tables found. Create your first table!</p>
        </div>
      ) : viewMode === 'grid' ? (
        // Grid view
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTables.map(table => (
            <div key={table.id} className="bg-white rounded-lg shadow-md overflow-hidden relative">
              <div className="p-4 border-b bg-emerald-600 text-white">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div 
                      className="h-4 w-4 rounded-full mr-2 border border-white" 
                      style={{ backgroundColor: table.color || '#000000' }}
                    ></div>
                    <h3 className="text-lg font-semibold">{table.name}</h3>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEditTable(table)}
                      className="p-1 rounded-full hover:bg-white/20 transition-colors"
                      title="Edit Table"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteTable(table.id)}
                      className="p-1 rounded-full hover:bg-white/20 transition-colors"
                      title="Delete Table"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Capacity:</span>
                  <span className="font-medium">{table.capacity}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Occupancy:</span>
                  <span className="font-medium">{table.occupancy || 0}</span>
                </div>
                <div className="flex justify-between mb-4">
                  <span className="text-gray-600">Vacancy:</span>
                  <span className={`font-medium ${table.vacancy === 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {table.vacancy || 0}
                  </span>
                </div>
                
                <div className="relative pt-1">
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                    <div 
                      style={{ 
                        width: `${table.capacity > 0 ? (table.occupancy / table.capacity) * 100 : 0}%`,
                        backgroundColor: table.vacancy === 0 ? '#ef4444' : table.occupancy === 0 ? '#9ca3af' : '#f59e0b'
                      }} 
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center rounded"
                    ></div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:space-x-2">
                  <button
                    onClick={() => handleManageHosts(table)}
                    className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                  >
                    <Users className="h-4 w-4 mr-1" />
                    Hosts ({table.hosts?.length || 0})
                  </button>
                  <button
                    onClick={() => handleViewTableOccupants(table)}
                    className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                  >
                    <Users className="h-4 w-4 mr-1" />
                    Occupants
                  </button>
                </div>
              </div>
              
              {/* Status badge */}
              <div className="absolute top-0 right-0 mt-2 mr-2">
                {table.vacancy === 0 ? (
                  <span className="px-2 inline-flex text-xs leading-4 font-semibold rounded-full bg-red-100 text-red-800">
                    Full
                  </span>
                ) : table.occupancy === 0 ? (
                  <span className="px-2 inline-flex text-xs leading-4 font-semibold rounded-full bg-gray-100 text-gray-800">
                    Empty
                  </span>
                ) : (
                  <span className="px-2 inline-flex text-xs leading-4 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    {table.vacancy} Free
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Table view
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Capacity
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Occupancy
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vacancy
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hosts
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTables.map(table => (
                  <tr key={table.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-4 w-4 rounded-full mr-2" style={{ backgroundColor: table.color || '#000000' }}></div>
                        <div className="text-sm font-medium text-gray-900">{table.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {table.capacity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {table.occupancy || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm ${table.vacancy === 0 ? 'text-red-500 font-medium' : 'text-green-500 font-medium'}`}>
                        {table.vacancy || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {table.vacancy === 0 ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Full
                        </span>
                      ) : table.occupancy === 0 ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          Empty
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Partial
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {table.hosts?.length || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewTableOccupants(table)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="View Occupants"
                        >
                          <Users size={16} />
                        </button>
                        <button
                          onClick={() => handleManageHosts(table)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Manage Hosts"
                        >
                          <Users size={16} />
                        </button>
                        <button
                          onClick={() => handleEditTable(table)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit Table"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteTable(table.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Table"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
