'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import RsvpModal from './RsvpModal'
import Modal from '../../components/Modal'
import Swal from 'sweetalert2'

interface RsvpFormData {
  name: string
  email: string
  hasGuest: boolean
  hasDriver: boolean
  hasAide: boolean
}

export default function InteractiveEventPage() {
  const [isRsvpModalOpen, setIsRsvpModalOpen] = useState(false)
  const [showCodeModal, setShowCodeModal] = useState(false)
  const [rsvpCode, setRsvpCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    hasGuest: false,
    hasDriver: false,
    hasAide: false,
    reg_code: ''
  })

  useEffect(() => {
    const hash = window.location.hash.substring(1) // Remove the '#' character
    if (hash) {
      setFormData(prev => ({ ...prev, reg_code: hash }))
    } else {
      setShowCodeModal(true)
    }
  }, [])

  const handleRsvp = () => {
    if (formData.reg_code) {
      setIsRsvpModalOpen(true)
    } else {
      alert('Registration code is required to confirm attendance.')
    }
  }

  const handleRsvpSubmit = (data: RsvpFormData) => {
    const rsvpData = {
      ...data,
      code: formData.reg_code
    }
    console.log('RSVP Data:', rsvpData)
    setIsRsvpModalOpen(false)
  }

  const handleAddToCalendar = () => {
    const event = {
      title: 'Church Dedication - Jesse Oghenekome George',
      description: 'Church dedication service followed by reception at KFT Event Hall.',
      location: 'RCCG Church, Champion Cathedral Parish, #80 airport road Warri, Delta State, Nigeria',
      startTime: '2025-04-13T09:00:00',
      endTime: '2025-04-13T12:00:00',
    }

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

    const blob = new Blob([icsContent], { type: 'text/calendar' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'church-dedication.ics'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleViewMap = (location: 'church' | 'reception') => {
    const addresses = {
      church: 'RCCG+Church+Champion+Cathedral+Parish+80+airport+road+Warri+Delta+State+Nigeria',
      reception: 'KFT+Event+Hall+Warri+Delta+State+Nigeria'
    }
    window.open(`https://maps.google.com/?q=${addresses[location]}`, '_blank')
  }

  const handleCodeSubmit = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/rsvp/validate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: rsvpCode })
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

  return (
    <div className="min-h-screen bg-white">
      {/* Main Content */}
      <div className="relative min-h-screen">
        {/* Image Container - 70% on large screens, 100% on mobile */}
        <div className="relative w-full h-screen md:w-[70%] transition-all duration-300">
          <Image
            src="/invitation-bg.jpg"
            alt="Event background"
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 70vw"
          />
          {/* Mobile-only gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-white to-transparent md:hidden" />
        </div>

        {/* Info Container - 30% on large screens, overlaid on mobile */}
        <div className={`absolute bottom-0 md:right-0 w-full md:w-[30%] md:h-screen md:top-0 
                      bg-white/95 backdrop-blur-sm md:shadow-lg transition-all duration-300
                      h-[40%] md:h-screen overflow-hidden
                      hover:h-[85%] md:hover:h-screen`}>
          <div className="h-full overflow-y-auto px-6 md:px-8 py-6 md:py-10 scrollbar-thin scrollbar-thumb-gray-300">
            {/* Mobile Pull Indicator */}
            <div className="md:hidden w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6" />

            {/* Event Details */}
            <div className="mb-12">
              <h2 className="text-2xl text-gray-600 font-light tracking-wider uppercase mb-8 text-center">DETAILS</h2>
              
              <div className="space-y-12">
                <div>
                  <h3 className="text-xl text-gray-600 font-light tracking-wider uppercase mb-6 text-center">SUMMARY</h3>
                  <p className="text-gray-600 text-sm leading-relaxed text-center tracking-wide">
                    You are invited to the church dedication of
                    <span className="block font-medium mt-2 mb-2">Jesse Oghenekome George</span>
                    at RCCG Church, Champion Cathedral Parish.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl text-gray-600 font-light tracking-wider uppercase mb-6 text-center">LOCATIONS</h3>
                  <div className="text-center">
                    <h4 className="text-gray-700 font-light tracking-wider uppercase mb-4">Church Dedication</h4>
                    <p className="text-gray-700 tracking-wide">RCCG Church, Champions Cathedral </p>
                    <p className="text-gray-700 tracking-wide">#16-18 Airport Road, Effurun, Warri Delta</p>
                    <p className="text-gray-700 tracking-wide mb-4">Nigeria</p>
                    <p className="text-gray-600 text-sm tracking-wider">10:00 AM</p>
                    <p className="text-gray-600 text-sm tracking-wider mb-8">Saturday, April 13, 2025</p>

                    <h4 className="text-gray-700 font-light tracking-wider uppercase mt-8 mb-4">Reception</h4>
                    <p className="text-gray-700 tracking-wide mb-8">KFT Event Hall</p>

                    <div className="flex justify-center gap-8 mt-6">
                      <button 
                        onClick={() => handleViewMap('church')}
                        className="text-emerald-600 hover:text-emerald-700 text-sm transition-all duration-200 
                                 flex items-center gap-2 hover:underline"
                      >
                        <span>📍</span> View Church
                      </button>
                      <button 
                        onClick={() => handleViewMap('reception')}
                        className="text-emerald-600 hover:text-emerald-700 text-sm transition-all duration-200 
                                 flex items-center gap-2 hover:underline"
                      >
                        <span>📍</span> View Reception
                      </button>
                      <button 
                        onClick={handleAddToCalendar}
                        className="text-emerald-600 hover:text-emerald-700 text-sm transition-all duration-200 
                                 flex items-center gap-2 hover:underline"
                      >
                        <span>📅</span> Add to calendar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RSVP Section */}
            <div className="text-center mt-12">
              {formData.reg_code && (
                <div className="fixed bottom-8 left-0 w-full flex justify-center z-30">
                  <button 
                    className="bg-emerald-500 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-emerald-600 transition-colors shadow-lg"
                    onClick={handleRsvp}
                  >
                    Confirm Your Attendance
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/60 text-white py-2 px-4 text-sm backdrop-blur-sm z-50">
        <div className="flex items-center gap-2">
          <span>Powered by Greenvites</span>
        </div>
      </div>

      {/* RSVP Modal */}
      <RsvpModal 
        isOpen={isRsvpModalOpen}
        onClose={() => setIsRsvpModalOpen(false)}
        onSubmit={handleRsvpSubmit}
      />

      {/* RSVP Code Modal */}
      {showCodeModal && (
        <Modal isOpen={showCodeModal} onClose={() => setShowCodeModal(false)}>
          <h2 className="text-xl font-light mb-4">Enter RSVP Code</h2>
          <input 
            type="text" 
            value={rsvpCode} 
            onChange={(e) => setRsvpCode(e.target.value)} 
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Enter your RSVP code"
          />
          <button 
            className={`mt-4 bg-emerald-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-emerald-600 transition-colors ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleCodeSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Code'}
          </button>
        </Modal>
      )}
    </div>
  )
}
