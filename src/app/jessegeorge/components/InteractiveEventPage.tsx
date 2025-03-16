'use client'

import { useState } from 'react'
import Image from 'next/image'
import RsvpModal from './RsvpModal'

interface RsvpFormData {
  name: string
  email: string
  hasGuest: boolean
  hasDriver: boolean
  hasAide: boolean
}

export default function InteractiveEventPage() {
  const [isRsvpModalOpen, setIsRsvpModalOpen] = useState(false)
  const [showBanner, setShowBanner] = useState(true)

  const handleRsvp = () => {
    setIsRsvpModalOpen(true)
  }

  const handleRsvpSubmit = (data: RsvpFormData) => {
    // Here you would typically send this data to your backend
    console.log('RSVP Data:', data)
    setIsRsvpModalOpen(false)
    // You could also show a success message
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

  return (
    <div className="min-h-screen bg-white">
      {/* Top Banner */}
      {showBanner && (
        <div className="fixed top-0 left-0 right-0 bg-emerald-500/90 backdrop-blur-sm text-white py-3 px-4 flex justify-between items-center z-50 shadow-md">
          <div className="flex items-center gap-3 mx-auto pr-8">
            <span className="text-lg">✝️</span>
            <p className="text-sm font-light tracking-wider">
              Join us in celebrating the dedication of Jesse Oghenekome George
            </p>
          </div>
          <button 
            onClick={() => setShowBanner(false)}
            className="text-white/80 hover:text-white transition-colors ml-4 text-xl"
            aria-label="Dismiss banner"
          >
            ×
          </button>
        </div>
      )}

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
                      hover:h-[85%] md:hover:h-screen ${showBanner ? 'mt-10' : ''}`}>
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
                    <p className="text-gray-700 tracking-wide">RCCG Church, Champion Cathedral Parish</p>
                    <p className="text-gray-700 tracking-wide">#80 airport road Warri, Delta State</p>
                    <p className="text-gray-700 tracking-wide mb-4">Nigeria</p>
                    <p className="text-gray-600 text-sm tracking-wider">9:00 AM</p>
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
            <div className="mb-8">
              <button 
                onClick={handleRsvp}
                className="w-full bg-emerald-500 text-white px-8 py-4 md:py-5 rounded-full text-sm font-light tracking-widest uppercase
                         hover:bg-emerald-600 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
                         shadow-[0_4px_12px_-2px_rgba(16,185,129,0.3)] hover:shadow-[0_8px_16px_-4px_rgba(16,185,129,0.4)]"
              >
                Confirm Your Attendance
              </button>
              <p className="text-center text-sm text-gray-500/70 mt-3 tracking-wider font-light">
                Please indicate if you&apos;re bringing a guest, driver, or aide
              </p>
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
    </div>
  )
}
