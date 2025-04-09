'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Users, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import Swal from 'sweetalert2'

interface Attendee {
  id: string
  name: string
  email: string
  phone: string
  code: string
  rsvpStatus: string
  tableId: string | null
  tableName: string | null
  attended: boolean
  attendedAt: string | null
  createdAt: string
  updatedAt: string
}

interface Table {
  id: string
  name: string
  capacity: number
  guestCount: number
}

interface AssociatedAttendee {
  id: string
  name: string
  code: string
  rsvpStatus: string
  attended: boolean
}

export default function AttendeeDetailsPage({ params }: { params: { id: string, 'access-code': string } }) {
  const router = useRouter()
  const eventId = params.id
  const accessCode = params['access-code']
  
  const [loading, setLoading] = useState(true)
  const [attendee, setAttendee] = useState<Attendee | null>(null)
  const [event, setEvent] = useState<any>(null)
  const [associatedAttendees, setAssociatedAttendees] = useState<AssociatedAttendee[]>([])
  const [admitting, setAdmitting] = useState(false)
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch event details
        const eventResponse = await fetch(`/api/admin/events/${eventId}`)
        if (!eventResponse.ok) {
          throw new Error('Failed to fetch event details')
        }
        const eventData = await eventResponse.json()
        setEvent(eventData)
        
        // Use the code as-is without normalization
        const code = accessCode
        console.log(`Fetching attendee with access code: ${code}`)
        
        // Try to fetch by access code
        let attendeeResponse = await fetch(`/api/admin/events/${eventId}/attendees/by-access-code/${code}`)
        
        // If that fails, try the other endpoints as fallbacks
        if (!attendeeResponse.ok) {
          console.log('Access code lookup failed, trying invite code lookup')
          attendeeResponse = await fetch(`/api/admin/events/${eventId}/attendees/by-code/${code}`)
          
          if (!attendeeResponse.ok) {
            console.log('Invite code lookup failed, trying registration code lookup')
            attendeeResponse = await fetch(`/api/admin/events/${eventId}/attendees/by-registration-code/${code}`)
          }
        }
        
        if (!attendeeResponse.ok) {
          console.error('Error response from API:', await attendeeResponse.text())
          throw new Error('Attendee not found')
        }
        
        const attendeeData = await attendeeResponse.json()
        
        if (!attendeeData.success || !attendeeData.attendee) {
          console.error('Invalid data returned from API:', attendeeData)
          throw new Error('Invalid attendee data returned')
        }
        
        setAttendee(attendeeData.attendee)
        
        // Fetch associated attendees (same email or phone)
        if (attendeeData.attendee) {
          const associatedResponse = await fetch(
            `/api/admin/events/${eventId}/attendees/associated/${attendeeData.attendee.id}`
          )
          if (associatedResponse.ok) {
            const associatedData = await associatedResponse.json()
            setAssociatedAttendees(associatedData.attendees || [])
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        // Don't show an error alert, the UI will handle the null attendee state
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [eventId, accessCode])
  
  const handleAdmit = async () => {
    if (!attendee) return
    
    try {
      setAdmitting(true)
      
      const response = await fetch(`/api/admin/events/${eventId}/attendees/${attendee.id}/admit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to admit attendee')
      }
      
      const data = await response.json()
      
      // Update the attendee state with the new data
      setAttendee({
        ...attendee,
        attended: true,
        attendedAt: new Date().toISOString()
      })
      
      Swal.fire({
        title: 'Success',
        text: 'Attendee has been admitted',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      })
    } catch (error) {
      console.error('Error admitting attendee:', error)
      Swal.fire({
        title: 'Error',
        text: 'Failed to admit attendee',
        icon: 'error'
      })
    } finally {
      setAdmitting(false)
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2 text-lg">Loading attendee details...</span>
        </div>
      </div>
    )
  }
  
  if (!attendee) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mb-6">
          <Link href={`/admin/dashboard/events/${eventId}/guests`} className="flex items-center text-blue-600 hover:text-blue-800">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Guest List
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Attendee Not Found</h2>
          <p className="text-gray-600 mb-6">
            The access code "{accessCode}" is not valid or the attendee does not exist.
          </p>
          <Link 
            href={`/admin/dashboard/events/${eventId}/guests`}
            className="inline-block px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Return to Guest List
          </Link>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <Link href={`/admin/dashboard/events/${eventId}/guests`} className="flex items-center text-blue-600 hover:text-blue-800">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Guest List
        </Link>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Attendee Card */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">{attendee.name}</h2>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                attendee.attended ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {attendee.attended ? 'Admitted' : 'Not Admitted'}
              </div>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Code: <span className="font-mono font-medium">{attendee.code}</span>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                <div className="space-y-3">
                  {attendee.email && (
                    <div>
                      <div className="text-sm font-medium text-gray-500">Email</div>
                      <div className="text-gray-800">{attendee.email}</div>
                    </div>
                  )}
                  
                  {attendee.phone && (
                    <div>
                      <div className="text-sm font-medium text-gray-500">Phone</div>
                      <div className="text-gray-800">{attendee.phone}</div>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Event Information</h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-gray-500">RSVP Status</div>
                    <div className={`inline-block px-2 py-1 rounded-md text-sm font-medium ${
                      attendee.rsvpStatus === 'attending' ? 'bg-green-100 text-green-800' :
                      attendee.rsvpStatus === 'not_attending' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {attendee.rsvpStatus === 'attending' ? 'Attending' :
                       attendee.rsvpStatus === 'not_attending' ? 'Not Attending' :
                       'Pending'}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-gray-500">Table Assignment</div>
                    <div className="text-gray-800">
                      {attendee.tableName ? attendee.tableName : 'Not Assigned'}
                    </div>
                  </div>
                  
                  {attendee.attended && attendee.attendedAt && (
                    <div>
                      <div className="text-sm font-medium text-gray-500">Admitted At</div>
                      <div className="text-gray-800">
                        {new Date(attendee.attendedAt).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {!attendee.attended && (
              <div className="mt-8">
                <button
                  onClick={handleAdmit}
                  disabled={admitting}
                  className="w-full md:w-auto px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {admitting ? (
                    <>
                      <Loader2 className="inline-block h-4 w-4 mr-2 animate-spin" />
                      Admitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="inline-block h-4 w-4 mr-2" />
                      Admit Attendee
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Associated Attendees Card */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-semibold">Associated Attendees</h3>
            </div>
          </div>
          
          <div className="p-4">
            {associatedAttendees.length > 0 ? (
              <div className="space-y-4">
                {associatedAttendees.map(associate => (
                  <div key={associate.id} className="border rounded-md p-3 hover:bg-gray-50">
                    <Link href={`/admin/dashboard/events/${eventId}/${associate.code}`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{associate.name}</div>
                          <div className="text-sm text-gray-500">Code: {associate.code}</div>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          associate.attended ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {associate.attended ? 'Admitted' : 'Not Admitted'}
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <p>No associated attendees found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
