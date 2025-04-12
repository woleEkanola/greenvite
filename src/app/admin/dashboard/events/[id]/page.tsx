'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import Link from 'next/link'
import { 
  BarChart, 
  Users, 
  Mail, 
  MessageSquare, 
  Calendar, 
  MapPin, 
  Clock, 
  Edit, 
  Trash2, 
  QrCode,
  Table2,
  CheckSquare,
  Table
} from 'lucide-react'

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState({
    regCodes: 0,
    accessCodes: 0,
    invites: 0,
    rsvps: 0,
    tables: 0,
  })

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/admin/events/${params.id}`)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Failed to fetch event: ${response.status}`, errorText)
          throw new Error(`Failed to fetch event: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('Event data loaded:', data)
        setEvent(data)
        
        // Fetch event stats
        await fetchEventStats(params.id)
      } catch (error) {
        console.error('Error loading event:', error)
        setError('Failed to load event details')
      } finally {
        setLoading(false)
      }
    }

    fetchEvent()
  }, [params.id])

  const fetchEventStats = async (eventId: string) => {
    try {
      console.log(`Fetching stats for event ID: ${eventId}`)
      const statsResponse = await fetch(`/api/admin/events/${eventId}/stats`)
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        console.log('Stats data loaded:', statsData)
        setStats(statsData)
      } else {
        const errorText = await statsResponse.text()
        console.error(`Error fetching stats: ${statsResponse.status}`, errorText)
        setError('Failed to load event statistics')
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      setError('Failed to load event statistics')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <h2 className="text-red-800 text-lg font-medium">Error</h2>
        <p className="text-red-700 mt-1">{error || 'Event not found'}</p>
        <button
          onClick={() => router.push('/admin/dashboard/events')}
          className="mt-4 bg-white text-red-600 px-4 py-2 rounded-md border border-red-300 hover:bg-red-50"
        >
          Back to Events
        </button>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div>
      {/* Event Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{event.title}</h1>
            <p className="text-gray-600 mt-1">{event.description}</p>
          </div>
          <div className="mt-4 md:mt-0">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              event.status === 'published' 
                ? 'bg-green-100 text-green-800' 
                : event.status === 'draft'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center text-gray-700">
            <Calendar className="h-5 w-5 mr-2 text-emerald-500" />
            <span>{formatDate(event.startDate)}</span>
          </div>
          <div className="flex items-center text-gray-700">
            <Clock className="h-5 w-5 mr-2 text-emerald-500" />
            <span>{formatTime(event.startDate)} - {formatTime(event.endDate)}</span>
          </div>
          {event.location && (
            <div className="flex items-center text-gray-700">
              <MapPin className="h-5 w-5 mr-2 text-emerald-500" />
              <span>{event.location}</span>
            </div>
          )}
          <div className="flex items-center text-gray-700">
            <Users className="h-5 w-5 mr-2 text-emerald-500" />
            <span>{event.admins?.length || 0} Admins</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Invitations</h2>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Mail className="h-5 w-5 mr-2 text-emerald-500" />
                <span className="text-gray-600">Registration Codes</span>
              </div>
              <span className="font-semibold">{stats.regCodes}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Mail className="h-5 w-5 mr-2 text-emerald-500" />
                <span className="text-gray-600">Invites Sent</span>
              </div>
              <span className="font-semibold">{stats.invites}</span>
            </div>
          </div>
          <div className="mt-4">
            <Link 
              href={`/admin/dashboard/events/${params.id}/invites`}
              className="text-emerald-600 hover:text-emerald-800 text-sm font-medium"
            >
              Manage Invitations →
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Attendance</h2>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <CheckSquare className="h-5 w-5 mr-2 text-emerald-500" />
                <span className="text-gray-600">RSVPs</span>
              </div>
              <span className="font-semibold">{stats.rsvps}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <CheckSquare className="h-5 w-5 mr-2 text-emerald-500" />
                <span className="text-gray-600">Access Codes</span>
              </div>
              <span className="font-semibold">{stats.accessCodes}</span>
            </div>
          </div>
          <div className="mt-4">
            <Link 
              href={`/admin/dashboard/events/${params.id}/rsvps`}
              className="text-emerald-600 hover:text-emerald-800 text-sm font-medium"
            >
              Manage RSVPs →
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Venue</h2>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Table className="h-5 w-5 mr-2 text-emerald-500" />
                <span className="text-gray-600">Tables</span>
              </div>
              <span className="font-semibold">{stats.tables}</span>
            </div>
          </div>
          <div className="mt-4">
            <Link 
              href={`/admin/dashboard/events/${params.id}/tables`}
              className="text-emerald-600 hover:text-emerald-800 text-sm font-medium"
            >
              Manage Tables →
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href={`/admin/dashboard/events/${params.id}/qr-codes`} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 flex flex-col items-center justify-center text-center">
          <QrCode className="h-12 w-12 text-emerald-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">QR Codes</h3>
          <p className="text-gray-600">Generate and manage QR codes for your guests</p>
        </Link>

        <Link href={`/admin/dashboard/events/${params.id}/guests`} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 flex flex-col items-center justify-center text-center">
          <Users className="h-12 w-12 text-blue-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Admitted Guests</h3>
          <p className="text-gray-600">View all admitted guests and their details</p>
        </Link>
        
        <Link href={`/admin/dashboard/events/${params.id}/tables`} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 flex flex-col items-center justify-center text-center">
          <Table2 className="h-12 w-12 text-purple-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Tables</h3>
          <p className="text-gray-600">Create and manage seating arrangements</p>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href={`/admin/dashboard/events/${params.id}/invites`}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg p-4 flex flex-col items-center justify-center transition-colors"
          >
            <Mail className="h-8 w-8 mb-2" />
            <span>Send Invites</span>
          </Link>
          <Link
            href={`/admin/dashboard/events/${params.id}/reg-codes`}
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg p-4 flex flex-col items-center justify-center transition-colors"
          >
            <CheckSquare className="h-8 w-8 mb-2" />
            <span>Create Codes</span>
          </Link>
          <Link
            href={`/admin/dashboard/events/${params.id}/tables`}
            className="bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg p-4 flex flex-col items-center justify-center transition-colors"
          >
            <Table className="h-8 w-8 mb-2" />
            <span>Manage Tables</span>
          </Link>
          <Link
            href={`/admin/dashboard/events/${params.id}/edit`}
            className="bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg p-4 flex flex-col items-center justify-center transition-colors"
          >
            <Users className="h-8 w-8 mb-2" />
            <span>Edit Event</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
