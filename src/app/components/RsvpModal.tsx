'use client'

import { useState } from 'react'
import Swal from 'sweetalert2'

interface RsvpModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  regCode: string
  primaryColor?: string
}

interface RsvpFormData {
  name: string
  email: string
  phone?: string
  hasGuest: boolean
  hasDriver: boolean
  hasAide: boolean
}

export default function RsvpModal({ isOpen, onClose, eventId, regCode, primaryColor = '#10b981' }: RsvpModalProps) {
  if (!isOpen) return null

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<RsvpFormData>({
    name: '',
    email: '',
    phone: '',
    hasGuest: false,
    hasDriver: false,
    hasAide: false
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      // Submit RSVP data to the server
      const response = await fetch('/api/rsvp/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          eventId,
          regCode
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to submit RSVP')
      }
      
      // Show success message
      Swal.fire({
        title: 'Success!',
        text: 'Your RSVP has been submitted successfully.',
        icon: 'success',
        confirmButtonColor: primaryColor
      })
      
      // Close the modal
      onClose()
    } catch (error) {
      console.error('Error submitting RSVP:', error)
      Swal.fire({
        title: 'Error',
        text: 'Failed to submit RSVP. Please try again.',
        icon: 'error',
        confirmButtonColor: primaryColor
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-lg flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-sm w-full md:rounded-2xl max-w-md transform transition-all duration-300 
                    shadow-[0_8px_16px_-6px_rgba(0,0,0,0.1),0_4px_8px_-4px_rgba(0,0,0,0.05)]">
        <div className="p-6 pb-8 md:p-8 space-y-8">
          <div className="flex justify-between items-center border-b border-gray-100/80 pb-4">
            <div>
              <h2 className="text-2xl font-light tracking-widest text-gray-700 uppercase">RSVP</h2>
              <p className="text-sm text-gray-500/80 font-light tracking-wide mt-1">
                Please confirm your attendance details
              </p>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors text-2xl font-light leading-none 
                       w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50/80"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm text-gray-600 mb-2 tracking-widest uppercase font-light">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-white/70 border border-gray-200/80 rounded-xl px-4 py-3.5 
                         focus:outline-none focus:ring-2 focus:border-opacity-50 
                         transition-all duration-300 font-light tracking-wide placeholder:text-gray-400/80
                         hover:border-gray-300/80"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm text-gray-600 mb-2 tracking-widest uppercase font-light">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-white/70 border border-gray-200/80 rounded-xl px-4 py-3.5 
                         focus:outline-none focus:ring-2 focus:border-opacity-50
                         transition-all duration-300 font-light tracking-wide placeholder:text-gray-400/80
                         hover:border-gray-300/80"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm text-gray-600 mb-2 tracking-widest uppercase font-light">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full bg-white/70 border border-gray-200/80 rounded-xl px-4 py-3.5 
                         focus:outline-none focus:ring-2 focus:border-opacity-50
                         transition-all duration-300 font-light tracking-wide placeholder:text-gray-400/80
                         hover:border-gray-300/80"
                placeholder="Your phone number"
              />
            </div>

            <div className="space-y-6 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="hasGuest" className="text-sm text-gray-600 tracking-wide">
                    Coming with a Guest?
                  </label>
                  <p className="text-xs text-gray-500/80 font-light tracking-wide mt-0.5">
                    Maximum one guest allowed
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="hasGuest" 
                    id="hasGuest" 
                    checked={formData.hasGuest} 
                    onChange={handleChange} 
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none
                               rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full 
                               peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] 
                               after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 
                               after:transition-all transition-colors duration-300 peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="hasDriver" className="text-sm text-gray-600 tracking-wide">
                    Coming with a Driver?
                  </label>
                  <p className="text-xs text-gray-500/80 font-light tracking-wide mt-0.5">
                    For transportation assistance
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="hasDriver" 
                    id="hasDriver" 
                    checked={formData.hasDriver} 
                    onChange={handleChange} 
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none
                               rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full 
                               peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] 
                               after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 
                               after:transition-all transition-colors duration-300 peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="hasAide" className="text-sm text-gray-600 tracking-wide">
                    Coming with an Aide?
                  </label>
                  <p className="text-xs text-gray-500/80 font-light tracking-wide mt-0.5">
                    For personal assistance
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="hasAide" 
                    id="hasAide" 
                    checked={formData.hasAide} 
                    onChange={handleChange} 
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none
                               rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full 
                               peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] 
                               after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 
                               after:transition-all transition-colors duration-300 peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>

            <div className="flex gap-4 pt-8">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-50/80 text-gray-700 px-6 py-3.5 rounded-full hover:bg-gray-100/80 
                         transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
                         font-light tracking-widest uppercase text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 text-white px-6 py-3.5 rounded-full
                         transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
                         shadow-[0_4px_12px_-2px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.3)]
                         font-light tracking-widest uppercase text-sm"
                style={{ backgroundColor: primaryColor }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Confirm'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}