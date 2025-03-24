'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function EventInvitesPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<any>(null)

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/admin/events/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setEvent(data)
        } else {
          console.error('Failed to fetch event')
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEvent()
  }, [params.id])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Send Invites</h1>
      <p className="text-gray-600 mb-8">
        Send invitations for {event?.title || 'this event'}.
      </p>
      
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-center text-gray-500 py-8">
          Invitation management will be implemented here.
        </p>
      </div>
    </div>
  )
}
