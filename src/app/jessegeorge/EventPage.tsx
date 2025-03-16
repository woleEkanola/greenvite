'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Toast from '../components/Toast'
import RsvpModal from '../components/RsvpModal'

export default function EventPage() {
  const [showRsvpModal, setShowRsvpModal] = useState(false)
  const [showBanner, setShowBanner] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    aide: false,
    driver: false,
    plus1: false,
    reg_code: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    const hash = window.location.hash.substring(1) // Remove the '#' character
    if (hash) {
      setFormData(prev => ({ ...prev, reg_code: hash }))
    }
  }, [])

  const handleRsvp = () => {
    if (formData.reg_code) {
      setShowRsvpModal(true)
    } else {
      alert('Registration code is required to confirm attendance.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const response = await fetch('https://eojz9fwevhvi4u1.m.pipedream.net', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        setShowRsvpModal(false)
        setFormData({ name: '', email: '', aide: false, driver: false, plus1: false, reg_code: '' }) // Reset form
        setToast({
          type: 'success',
          message: 'Thank you for your RSVP! We look forward to seeing you.'
        })
      } else {
        throw new Error('Failed to submit RSVP')
      }
    } catch (error) {
      console.error('Error submitting RSVP:', error)
      setToast({
        type: 'error',
        message: 'Sorry, there was a problem submitting your RSVP. Please try again.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAddToCalendar = () => {
    // Create calendar event data
    const event = {
      title: 'Cocktails + Conversation',
      description: 'Join us for cocktails and conversations with drinks, good company, and live music.',
      location: 'The Alumnae Bar, 224 W Ontario Street, Chicago',
      startTime: '2025-11-18T17:00:00',
      endTime: '2025-11-18T20:00:00',
    }

    // Create .ics file content
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${event.title}
DESCRIPTION:${event.description}
LOCATION:${event.location}
DTSTART:${event.startTime.replace(/[-:]/g, '')}
DTEND:${event.endTime.replace(/[-:]/g, '')}
END:VEVENT
END:VCALENDAR`

    // Create and download the .ics file
    const blob = new Blob([icsContent], { type: 'text/calendar' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'event.ics'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleViewMap = () => {
    window.open('https://maps.google.com/?q=224+W+Ontario+Street+Chicago', '_blank')
  }

  return (
    <div className="min-h-screen bg-white">

      {/* RSVP Banner */}
      <div className="bg-white shadow-md py-4 px-4 text-center border-b">
        <p className="text-gray-700 inline-block mr-4">Please RSVP for this Event</p>
        {formData.reg_code.length > 0 && (
          <button 
            className="bg-emerald-500 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-emerald-600 transition-colors"
            onClick={handleRsvp}
          >
          xxxx ({formData.reg_code})
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-12">
        {/* Left Column - Invitation */}
        <div className="relative aspect-[3/4] bg-gradient-to-br from-emerald-100 via-pink-100 to-gray-200 rounded-lg overflow-hidden shadow-xl">
          <Image
            src="/invitation-bg.jpg"
            alt="Abstract background"
            fill
            className="object-cover mix-blend-overlay opacity-80"
            priority
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white/95 backdrop-blur-sm p-10 shadow-lg max-w-sm w-full text-center rounded-lg">
              <p className="text-gray-600 mb-4 text-sm tracking-wide">please join us for</p>
              <h1 className="text-4xl mb-6 font-light tracking-widest uppercase">cocktails</h1>
              <p className="text-gray-600 mb-6 tracking-widest text-sm">+ CONVERSATION</p>
              <div className="text-4xl font-light mb-4 tracking-wider">11.18</div>
              <p className="text-gray-600 mb-6 text-sm">5:00-8:00pm</p>
              <div className="text-gray-800 mt-8 space-y-1">
                <p className="font-medium">The Alumnae Bar</p>
                <p className="text-sm tracking-wide">224 W ONTARIO STREET</p>
                <p className="text-sm">West Loop, Chicago</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-light tracking-widest text-gray-700 uppercase">Event Details</h2>
            <p className="mt-4 text-gray-600">Join us for an evening of cocktails and conversation at The Alumnae Bar. Enjoy drinks, good company, and live music in the heart of Chicago's West Loop.</p>
          </div>
          <div>
            <h3 className="text-xl font-light tracking-widest text-gray-700 uppercase">Location</h3>
            <p className="mt-2 text-gray-600">The Alumnae Bar, 224 W Ontario Street, Chicago</p>
            <button 
              className="mt-4 bg-emerald-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-emerald-600 transition-colors"
              onClick={handleViewMap}
            >
              View Map
            </button>
          </div>
          <div>
            <h3 className="text-xl font-light tracking-widest text-gray-700 uppercase">Add to Calendar</h3>
            <button 
              className="mt-2 bg-emerald-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-emerald-600 transition-colors"
              onClick={handleAddToCalendar}
            >
              Add to Calendar
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 bg-${toast.type === 'success' ? 'green' : 'red'}-500 text-white p-4 rounded shadow-lg`}>
          <p>{toast.message}</p>
          <button 
            className="absolute top-2 right-2 text-xl"
            aria-label="Close"
            onClick={() => setToast(null)}
          >
            &times;
          </button>
        </div>
      )}

      {/* RSVP Modal */}
      {showRsvpModal && (
        <RsvpModal
          isOpen={showRsvpModal}
          onClose={() => setShowRsvpModal(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}
