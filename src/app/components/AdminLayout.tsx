'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  
  // Extract event ID from URL if we're on an event-specific page
  const eventIdMatch = pathname.match(/\/events\/([^\/]+)/)
  const eventId = eventIdMatch ? eventIdMatch[1] : null
  
  // Determine which tab is active
  const isActive = (path: string) => {
    return pathname.includes(path)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Main content */}
      <div className="w-full">
        {/* Event-specific navigation if we're on an event page */}
        {eventId && (
          <div className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex overflow-x-auto">
                <nav className="-mb-px flex space-x-8">
                  <Link
                    href={`/admin/dashboard/events/${eventId}`}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                      pathname === `/admin/dashboard/events/${eventId}`
                        ? 'border-emerald-500 text-emerald-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Overview
                  </Link>
                  <Link
                    href={`/admin/dashboard/events/${eventId}/invites`}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                      isActive('/invites')
                        ? 'border-emerald-500 text-emerald-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Invites
                  </Link>
                  <Link
                    href={`/admin/dashboard/events/${eventId}/tables`}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                      isActive('/tables')
                        ? 'border-emerald-500 text-emerald-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Tables
                  </Link>
                  <Link
                    href={`/admin/dashboard/events/${eventId}/message-templates`}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                      isActive('/message-templates')
                        ? 'border-emerald-500 text-emerald-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Message Templates
                  </Link>
                  <Link
                    href={`/admin/dashboard/events/${eventId}/event-page`}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                      isActive('/event-page')
                        ? 'border-emerald-500 text-emerald-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Event Page
                  </Link>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Page content */}
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
