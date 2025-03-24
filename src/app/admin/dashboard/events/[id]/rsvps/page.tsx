'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { RefreshCw, Search, Check, X, Edit, Trash, UserCheck, UserX, Users } from 'lucide-react'
import Swal from 'sweetalert2'
import DataTable from '@/components/DataTable'

interface RSVP {
  id: string
  name: string
  email: string
  phone: string
  status: 'attending' | 'not_attending' | 'pending'
  guests: number
  dietaryRequirements: string
  createdAt: string
  updatedAt: string
}

interface RSVPStats {
  total: number
  attending: number
  notAttending: number
  pending: number
  totalGuests: number
}

export default function EventRsvpsPage({ params }: { params: { id: string } }) {
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [rsvps, setRsvps] = useState<RSVP[]>([])
  const [stats, setStats] = useState<RSVPStats>({
    total: 0,
    attending: 0,
    notAttending: 0,
    pending: 0,
    totalGuests: 0
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [editingRSVP, setEditingRSVP] = useState<RSVP | null>(null)

  // Fetch event data
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/admin/events/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setEvent(data)
        } else {
          console.error('Failed to fetch event')
          toast.error('Failed to fetch event details')
        }
      } catch (error) {
        console.error('Error:', error)
        toast.error('An error occurred while fetching event data')
      }
    }

    fetchEvent()
  }, [params.id])

  // Fetch RSVPs
  const fetchRSVPs = useCallback(async () => {
    try {
      setRefreshing(true)
      const response = await fetch(`/api/admin/events/${params.id}/rsvps`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch RSVPs')
      }
      
      const data = await response.json()
      setRsvps(data.rsvps)
      setStats(data.stats)
    } catch (error) {
      console.error('Error fetching RSVPs:', error)
      toast.error('Failed to load RSVPs')
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchRSVPs()
  }, [fetchRSVPs])

  // Filter RSVPs based on search term
  const filteredRSVPs = rsvps.filter(rsvp => 
    rsvp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rsvp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rsvp.phone.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Handle RSVP status update
  const handleUpdateStatus = async (id: string, status: 'attending' | 'not_attending' | 'pending') => {
    try {
      const response = await fetch(`/api/admin/events/${params.id}/rsvps`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rsvpId: id,
          status
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update RSVP status')
      }
      
      // Update local state
      setRsvps(prev => 
        prev.map(rsvp => 
          rsvp.id === id ? { ...rsvp, status } : rsvp
        )
      )
      
      // Recalculate stats
      const updatedRsvps = rsvps.map(rsvp => 
        rsvp.id === id ? { ...rsvp, status } : rsvp
      )
      
      const newStats = {
        total: updatedRsvps.length,
        attending: updatedRsvps.filter(r => r.status === 'attending').length,
        notAttending: updatedRsvps.filter(r => r.status === 'not_attending').length,
        pending: updatedRsvps.filter(r => r.status === 'pending').length,
        totalGuests: updatedRsvps.reduce((sum, r) => r.status === 'attending' ? sum + r.guests : sum, 0)
      }
      
      setStats(newStats)
      toast.success('RSVP status updated')
    } catch (error) {
      console.error('Error updating RSVP:', error)
      toast.error('Failed to update RSVP status')
    }
  }

  // Handle RSVP deletion
  const handleDeleteRSVP = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete RSVP?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    })
    
    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/admin/events/${params.id}/rsvps`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            rsvpId: id
          })
        })
        
        if (!response.ok) {
          throw new Error('Failed to delete RSVP')
        }
        
        // Update local state
        setRsvps(prev => prev.filter(rsvp => rsvp.id !== id))
        
        // Recalculate stats
        const updatedRsvps = rsvps.filter(rsvp => rsvp.id !== id)
        
        const newStats = {
          total: updatedRsvps.length,
          attending: updatedRsvps.filter(r => r.status === 'attending').length,
          notAttending: updatedRsvps.filter(r => r.status === 'not_attending').length,
          pending: updatedRsvps.filter(r => r.status === 'pending').length,
          totalGuests: updatedRsvps.reduce((sum, r) => r.status === 'attending' ? sum + r.guests : sum, 0)
        }
        
        setStats(newStats)
        toast.success('RSVP deleted successfully')
      } catch (error) {
        console.error('Error deleting RSVP:', error)
        toast.error('Failed to delete RSVP')
      }
    }
  }

  // Handle edit RSVP
  const handleEditRSVP = (rsvp: RSVP) => {
    setEditingRSVP(rsvp)
    Swal.fire({
      title: 'Edit RSVP',
      html: `
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input id="name" class="w-full p-2 border rounded" value="${rsvp.name}" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input id="email" class="w-full p-2 border rounded" value="${rsvp.email}" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input id="phone" class="w-full p-2 border rounded" value="${rsvp.phone}" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Number of Guests</label>
            <input id="guests" type="number" min="1" class="w-full p-2 border rounded" value="${rsvp.guests}" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Dietary Requirements</label>
            <textarea id="dietary" class="w-full p-2 border rounded" rows="3">${rsvp.dietaryRequirements || ''}</textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select id="status" class="w-full p-2 border rounded">
              <option value="attending" ${rsvp.status === 'attending' ? 'selected' : ''}>Attending</option>
              <option value="not_attending" ${rsvp.status === 'not_attending' ? 'selected' : ''}>Not Attending</option>
              <option value="pending" ${rsvp.status === 'pending' ? 'selected' : ''}>Pending</option>
            </select>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Save Changes',
      confirmButtonColor: '#10b981',
      preConfirm: () => {
        const name = (document.getElementById('name') as HTMLInputElement).value
        const email = (document.getElementById('email') as HTMLInputElement).value
        const phone = (document.getElementById('phone') as HTMLInputElement).value
        const guests = parseInt((document.getElementById('guests') as HTMLInputElement).value)
        const dietary = (document.getElementById('dietary') as HTMLTextAreaElement).value
        const status = (document.getElementById('status') as HTMLSelectElement).value as 'attending' | 'not_attending' | 'pending'
        
        if (!name) {
          Swal.showValidationMessage('Name is required')
          return false
        }
        
        if (isNaN(guests) || guests < 1) {
          Swal.showValidationMessage('Number of guests must be at least 1')
          return false
        }
        
        return { name, email, phone, guests, dietary, status }
      }
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        try {
          const updatedData = result.value
          
          const response = await fetch(`/api/admin/events/${params.id}/rsvps`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              rsvpId: rsvp.id,
              ...updatedData
            })
          })
          
          if (!response.ok) {
            throw new Error('Failed to update RSVP')
          }
          
          // Update local state
          setRsvps(prev => 
            prev.map(r => 
              r.id === rsvp.id ? { 
                ...r, 
                name: updatedData.name,
                email: updatedData.email,
                phone: updatedData.phone,
                guests: updatedData.guests,
                dietaryRequirements: updatedData.dietary,
                status: updatedData.status
              } : r
            )
          )
          
          // Recalculate stats
          const updatedRsvps = rsvps.map(r => 
            r.id === rsvp.id ? { 
              ...r, 
              name: updatedData.name,
              email: updatedData.email,
              phone: updatedData.phone,
              guests: updatedData.guests,
              dietaryRequirements: updatedData.dietary,
              status: updatedData.status
            } : r
          )
          
          const newStats = {
            total: updatedRsvps.length,
            attending: updatedRsvps.filter(r => r.status === 'attending').length,
            notAttending: updatedRsvps.filter(r => r.status === 'not_attending').length,
            pending: updatedRsvps.filter(r => r.status === 'pending').length,
            totalGuests: updatedRsvps.reduce((sum, r) => r.status === 'attending' ? sum + r.guests : sum, 0)
          }
          
          setStats(newStats)
          toast.success('RSVP updated successfully')
        } catch (error) {
          console.error('Error updating RSVP:', error)
          toast.error('Failed to update RSVP')
        } finally {
          setEditingRSVP(null)
        }
      }
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">{event?.title} - RSVP Management</h1>
        <p className="text-gray-600">
          Track and manage RSVPs for this event.
        </p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total RSVPs</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Attending</p>
              <p className="text-2xl font-bold">{stats.attending}</p>
            </div>
            <UserCheck className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Not Attending</p>
              <p className="text-2xl font-bold">{stats.notAttending}</p>
            </div>
            <UserX className="h-8 w-8 text-red-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold">{stats.pending}</p>
            </div>
            <Users className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Guests</p>
              <p className="text-2xl font-bold">{stats.totalGuests}</p>
            </div>
            <Users className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>
      
      {/* RSVP Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">RSVP List</h2>
          <div className="flex space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search RSVPs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              onClick={fetchRSVPs}
              disabled={refreshing}
              className="p-2 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none"
              aria-label="Refresh RSVPs"
            >
              <RefreshCw size={18} className={`${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
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
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Guests
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dietary Requirements
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRSVPs.length > 0 ? (
                filteredRSVPs.map((rsvp) => (
                  <tr key={rsvp.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{rsvp.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">{rsvp.email}</div>
                      <div className="text-sm text-gray-500">{rsvp.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${rsvp.status === 'attending' ? 'bg-green-100 text-green-800' : 
                          rsvp.status === 'not_attending' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'}`}>
                        {rsvp.status === 'attending' ? 'Attending' : 
                         rsvp.status === 'not_attending' ? 'Not Attending' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rsvp.guests}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {rsvp.dietaryRequirements || 'None'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleUpdateStatus(rsvp.id, 'attending')}
                          className={`p-1 rounded-full ${rsvp.status === 'attending' ? 'bg-green-100 text-green-600' : 'hover:bg-green-100 text-gray-400 hover:text-green-600'}`}
                          aria-label="Mark as attending"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(rsvp.id, 'not_attending')}
                          className={`p-1 rounded-full ${rsvp.status === 'not_attending' ? 'bg-red-100 text-red-600' : 'hover:bg-red-100 text-gray-400 hover:text-red-600'}`}
                          aria-label="Mark as not attending"
                        >
                          <X size={16} />
                        </button>
                        <button
                          onClick={() => handleEditRSVP(rsvp)}
                          className="p-1 rounded-full hover:bg-blue-100 text-gray-400 hover:text-blue-600"
                          aria-label="Edit RSVP"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteRSVP(rsvp.id)}
                          className="p-1 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-600"
                          aria-label="Delete RSVP"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    {searchTerm ? 'No RSVPs match your search criteria.' : 'No RSVPs found for this event.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
