'use client'

import { useState } from 'react'
import Image from 'next/image'

export default function EventPage() {
  const [showRsvpModal, setShowRsvpModal] = useState(false)
  const [showBanner, setShowBanner] = useState(true)

  const handleRsvp = () => {
    setShowRsvpModal(true)
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
      {/* Top Banner */}
      {showBanner && (
        <div className="bg-gray-800 text-white text-center py-3 px-4 relative">
          <p className="text-sm">Please Enjoy this Greenvelope Sample</p>
          <button 
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xl" 
            aria-label="Close"
            onClick={() => setShowBanner(false)}
          >
            &times;
          </button>
        </div>
      )}

      {/* RSVP Banner */}
      <div className="bg-white shadow-md py-4 px-4 text-center border-b">
        <p className="text-gray-700 inline-block mr-4">Please RSVP for this Event</p>
        <button 
          className="bg-emerald-500 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-emerald-600 transition-colors"
          onClick={handleRsvp}
        >
          RSVP NOW
        </button>
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
        <div className="space-y-10 pt-4">
          <section>
            <h2 className="text-gray-500 text-lg mb-6 tracking-wide">DETAILS</h2>
            <div className="space-y-8">
              <div>
                <h3 className="font-medium mb-3 text-gray-700">SUMMARY</h3>
                <p className="text-gray-600 leading-relaxed">
                  Join us for cocktails and conversations with drinks, good company, and live music.
                </p>
                <p className="text-gray-600 mt-3 leading-relaxed">
                  Live musical entertainment will be provided by La Toya and The Burnett Sisters. With hosted appetizers
                  and buffet there will be plenty of food, and with a full hosted bar you can have the whiles and purses at home.
                </p>
              </div>

              <div>
                <h3 className="font-medium mb-3 text-gray-700">LOCATION</h3>
                <div className="space-y-1">
                  <p className="font-medium text-gray-800">Cocktails + Conversation</p>
                  <p className="text-gray-700">The Alumnae Bar</p>
                  <p className="text-gray-700">224 W Ontario Street, Chicago</p>
                  <p className="text-gray-600 mt-2">5:00 PM - 8:00 PM, Tuesday, November 18, 2025</p>
                  <div className="flex gap-6 mt-3">
                    <button 
                      className="text-blue-600 hover:underline text-sm"
                      onClick={handleViewMap}
                    >
                      View Map
                    </button>
                    <button 
                      className="text-blue-600 hover:underline text-sm"
                      onClick={handleAddToCalendar}
                    >
                      Add to calendar
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <p className="font-medium mb-3 text-gray-700">Attend Virtually</p>
                <button 
                  className="w-full bg-gray-600 text-white py-3 px-4 rounded text-sm font-medium hover:bg-gray-700 transition-colors"
                  onClick={handleRsvp}
                >
                  SUBMIT YOUR RSVP
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/60 text-white py-2 px-4 text-sm backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span>Powered by</span>
          <Image
            src="/logo.svg"
            alt="Greenvelope"
            width={100}
            height={20}
            className="h-5 w-auto brightness-0 invert"
          />
        </div>
      </div>

      {/* RSVP Modal */}
      {showRsvpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-light mb-4">RSVP for Cocktails + Conversation</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Name</label>
                <input 
                  type="text" 
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email</label>
                <input 
                  type="email" 
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Number of Guests</label>
                <select className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option>1</option>
                  <option>2</option>
                  <option>3</option>
                  <option>4</option>
                </select>
              </div>
              <div className="flex gap-4 mt-6">
                <button 
                  type="button"
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
                  onClick={() => setShowRsvpModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-emerald-500 text-white px-4 py-2 rounded hover:bg-emerald-600 transition-colors"
                >
                  Submit RSVP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
