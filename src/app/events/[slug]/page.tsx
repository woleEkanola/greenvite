'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import RsvpModal from '@/app/components/RsvpModal'
import Modal from '@/app/components/Modal'
import Swal from 'sweetalert2'

interface RsvpFormData {
  name: string
  email: string
  hasGuest: boolean
  hasDriver: boolean
  hasAide: boolean
}

interface EventPageSettings {
  id: string
  title: string
  description: string
  imageUrl: string
  pageTitle: string
  pageDescription: string
  headerImage: string
  logoImage: string
  primaryColor: string
  secondaryColor: string
  fontFamily: string
  showLocationMap: boolean
  showAddToCalendar: boolean
  customCss: string
  isPagePublished: boolean
  location: string
  startDate: string
  endDate: string
}

export default function EventPage() {
  const params = useParams()
  const [isLoading, setIsLoading] = useState(true)
  const [event, setEvent] = useState<EventPageSettings | null>(null)
  const [isRsvpModalOpen, setIsRsvpModalOpen] = useState(false)
  const [showCodeModal, setShowCodeModal] = useState(false)
  const [rsvpCode, setRsvpCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    hasGuest: false,
    hasDriver: false,
    hasAide: false,
    reg_code: ''
  })

  useEffect(() => {
    fetchEventData()
    
    const hash = window.location.hash.substring(1) // Remove the '#' character
    if (hash) {
      setFormData(prev => ({ ...prev, reg_code: hash }))
    } else {
      setShowCodeModal(true)
    }
  }, [])

  const fetchEventData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/events/${params.slug}`)
      if (!response.ok) {
        throw new Error('Failed to fetch event data')
      }
      
      const data = await response.json()
      
      // Ensure we have valid data
      if (!data) throw new Error('No event data received')
      
      console.log('Event data received:', data)
      
      // Set the event data
      setEvent(data)
    } catch (error) {
      console.error('Error fetching event data:', error)
      Swal.fire({
        title: 'Error',
        text: 'Failed to load event data. Please try again.',
        icon: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRsvp = () => {
    if (formData.reg_code) {
      setIsRsvpModalOpen(true)
    } else {
      alert('Registration code is required to confirm attendance.')
    }
  }

  const handleRsvpSubmit = async (data: RsvpFormData) => {
    try {
      setIsSubmitting(true)
      const rsvpData = {
        ...data,
        code: formData.reg_code,
        eventId: event?.id
      }
      
      const response = await fetch('/api/rsvp/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rsvpData)
      })
      
      if (response.ok) {
        Swal.fire({
          title: 'Success!',
          text: 'Your RSVP has been submitted successfully.',
          icon: 'success'
        })
        setIsRsvpModalOpen(false)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit RSVP')
      }
    } catch (error) {
      console.error('Error submitting RSVP:', error)
      Swal.fire({
        title: 'Error',
        text: error instanceof Error ? error.message : 'Failed to submit RSVP. Please try again.',
        icon: 'error'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddToCalendar = () => {
    if (!event) return
    
    const eventDetails = {
      title: event.pageTitle || event.title,
      description: event.pageDescription || event.description || '',
      location: event.location || '',
      startTime: event.startDate,
      endTime: event.endDate,
    }

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${eventDetails.title}
DESCRIPTION:${eventDetails.description}
LOCATION:${eventDetails.location}
DTSTART:${new Date(eventDetails.startTime).toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTEND:${new Date(eventDetails.endTime).toISOString().replace(/[-:]/g, '').split('.')[0]}Z
END:VEVENT
END:VCALENDAR`

    const blob = new Blob([icsContent], { type: 'text/calendar' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'event.ics'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleViewMap = () => {
    if (!event?.location) return
    window.open(`https://maps.google.com/?q=${encodeURIComponent(event.location)}`, '_blank')
  }

  const handleCodeSubmit = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/rsvp/validate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: rsvpCode, eventId: event?.id })
      })

      if (response.ok) {
        window.location.hash = rsvpCode
        setFormData(prev => ({ ...prev, reg_code: rsvpCode }))
        setShowCodeModal(false)
        setIsRsvpModalOpen(true)
        Swal.fire('Success', 'Code accepted. You can now RSVP!', 'success')
      } else {
        const errorData = await response.json();
        Swal.fire('Error', errorData.error || 'Invalid code or the code has been used.', 'error')
      }
    } catch (error) {
      console.error('Error verifying code:', error)
      Swal.fire('Error', 'There was an error verifying the code. Please try again.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Add useEffect for periodic shaking animation
  useEffect(() => {
    if (!formData.reg_code) return; // Only animate if we have a registration code
    
    // Function to trigger the shake animation
    const triggerShake = () => {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 800); // Animation duration
    };
    
    // Initial shake after a delay
    const initialShakeTimeout = setTimeout(triggerShake, 5000);
    
    // Set up interval for repeated shaking
    const shakeInterval = setInterval(triggerShake, 30000); // Every 30 seconds
    
    return () => {
      clearTimeout(initialShakeTimeout);
      clearInterval(shakeInterval);
    };
  }, [formData.reg_code]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-red-500 mb-2">Event Not Found</h1>
        <p className="text-gray-600 mb-4">The event you're looking for doesn't exist or isn't published yet.</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition"
        >
          Try Again
        </button>
      </div>
    )
  }

  // Apply custom styles from event settings
  const customStyles = event ? `
    :root {
      --primary-color: ${event.primaryColor || '#10b981'};
      --secondary-color: ${event.secondaryColor || '#064e3b'};
      --font-family: ${event.fontFamily || 'Inter, sans-serif'};
    }
    
    body {
      font-family: var(--font-family);
    }
    
    .btn-primary {
      background-color: var(--primary-color);
      border-color: var(--primary-color);
    }
    
    .btn-primary:hover {
      background-color: var(--secondary-color);
      border-color: var(--secondary-color);
    }
    
    ${event.customCss || ''}
  ` : ''

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Custom styles */}
      <style jsx global>{customStyles}</style>
      
      {/* Header */}
      <header className="relative">
        {event.headerImage ? (
          <div className="relative h-64 md:h-96">
            <img
              src={event.headerImage}
              alt={event.pageTitle || event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 top-0 bg-black bg-opacity-40 flex items-center justify-center">
              <div className="text-center text-white p-4">
                {event.logoImage && (
                  <div className="flex justify-center mb-4">
                    <img
                      src={event.logoImage}
                      alt="Logo"
                      width={120}
                      height={120}
                      className="rounded-full bg-white p-2"
                    />
                  </div>
                )}
                <h1 className="text-3xl md:text-5xl font-bold mb-2">{event.pageTitle || event.title}</h1>
                {event.pageDescription && (
                  <p className="text-lg md:text-xl max-w-2xl mx-auto">{event.pageDescription}</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-700 py-16">
            <div className="container mx-auto text-center text-white p-4">
              {event.logoImage && (
                <div className="flex justify-center mb-4">
                  <img
                    src={event.logoImage}
                    alt="Logo"
                    width={120}
                    height={120}
                    className="rounded-full bg-white p-2"
                  />
                </div>
              )}
              <h1 className="text-3xl md:text-5xl font-bold mb-2">{event.pageTitle || event.title}</h1>
              {event.pageDescription && (
                <p className="text-lg md:text-xl max-w-2xl mx-auto">{event.pageDescription}</p>
              )}
            </div>
          </div>
        )}
      </header>
      
      {/* Main content */}
      <main className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
          {/* Event description section - only show if it's not JSON data and not null */}
          {event.description && typeof event.description === 'string' && 
           !event.description.trim().startsWith('{') && !event.description.trim().endsWith('}') && (
            <section className="mb-8">
              <div className="prose mx-auto">
                <p className="text-center text-gray-700">{event.description}</p>
              </div>
            </section>
          )}
          
          {/* Location section */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-center mb-4">Location</h2>
            <p className="text-center text-gray-700 mb-2">{event.location}</p>
            {event.showLocationMap && (
              <div className="mt-4 flex justify-center">
                <button 
                  className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full flex items-center hover:bg-emerald-200 transition"
                  onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(event.location)}`, '_blank')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  View Map
                </button>
              </div>
            )}
          </section>
          
          {/* Date & Time section */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-center mb-4">Date & Time</h2>
            <p className="text-center text-gray-700 mb-2">
              {new Date(event.startDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            <p className="text-center text-gray-700 mb-4">
              {new Date(event.startDate).toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit', 
                hour12: true 
              })} - {new Date(event.endDate).toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit', 
                hour12: true 
              })}
            </p>
            {event.showAddToCalendar && (
              <div className="flex justify-center">
                <button 
                  className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full flex items-center hover:bg-emerald-200 transition"
                  onClick={() => {
                    // Simple Google Calendar link
                    const startTime = new Date(event.startDate).toISOString().replace(/-|:|\.\d+/g, '');
                    const endTime = new Date(event.endDate).toISOString().replace(/-|:|\.\d+/g, '');
                    const eventTitle = encodeURIComponent(event.pageTitle || event.title);
                    const eventLocation = encodeURIComponent(event.location || '');
                    const eventDetails = encodeURIComponent(event.pageDescription || '');
                    
                    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${startTime}/${endTime}&details=${eventDetails}&location=${eventLocation}`, '_blank');
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  Add to Calendar
                </button>
              </div>
            )}
          </section>
          
          {/* RSVP button */}
          <div className="flex justify-center mt-8">
            <button
              ref={buttonRef}
              className={`px-6 py-3 bg-emerald-500 text-white rounded-full font-bold text-lg hover:bg-emerald-600 transition ${isShaking ? 'animate-shake' : ''}`}
              onClick={handleRsvp}
            >
              Confirm Your Attendance
            </button>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-100 py-4 mt-8">
        <div className="container mx-auto text-center text-gray-500 text-sm">
          Powered by Greenvites
        </div>
      </footer>
      
      {/* RSVP Modal */}
      <RsvpModal
        isOpen={isRsvpModalOpen}
        onClose={() => setIsRsvpModalOpen(false)}
        eventId={event.id}
        regCode={formData.reg_code}
      />
      
      {/* Registration Code Modal */}
      <Modal isOpen={showCodeModal} onClose={() => setShowCodeModal(false)}>
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4 text-center">Enter Your Registration Code</h2>
          <p className="text-gray-600 mb-4 text-center">
            Please enter the registration code provided in your invitation.
          </p>
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                value={rsvpCode}
                onChange={(e) => setRsvpCode(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Registration Code"
                required
              />
            </div>
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-emerald-500 text-white rounded font-medium hover:bg-emerald-600 transition flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin h-5 w-5 mr-2 border-t-2 border-b-2 border-white rounded-full"></span>
                    Submitting...
                  </>
                ) : (
                  'Submit'
                )}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  )
}
