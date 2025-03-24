'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, LogOut, Menu } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'

export default function EventDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [eventTitle, setEventTitle] = useState('')

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  // Fetch event details
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/admin/events/${params.id}`)
        if (response.ok) {
          const event = await response.json()
          setEventTitle(event.title || 'Event Dashboard')
        }
      } catch (error) {
        console.error('Error fetching event:', error)
      }
    }

    fetchEvent()
  }, [params.id])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      // Call the logout API endpoint
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // Sign out on the client side
      await signOut({ redirect: false });
      
      // Redirect to login page
      router.push('/admin');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full bg-white shadow-lg transition-all duration-300 z-20
                      ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-4 border-b">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            {isSidebarOpen ? '←' : '→'}
          </button>
        </div>
        <nav className="p-4">
          <div className="mb-6">
            <Link
              href="/admin/dashboard/events"
              className="flex items-center text-emerald-600 hover:text-emerald-800 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span>Back to Events</span>
            </Link>
            <h2 className="text-lg font-semibold text-gray-800 truncate">
              {eventTitle}
            </h2>
          </div>

          <ul className="space-y-2">
            <li>
              <Link
                href={`/admin/dashboard/events/${params.id}`}
                className={`block px-4 py-2 rounded-lg transition-colors ${
                  pathname === `/admin/dashboard/events/${params.id}`
                    ? 'bg-emerald-500 text-white'
                    : 'hover:bg-gray-100'
                }`}
              >
                Overview
              </Link>
            </li>
            <li>
              <Link
                href={`/admin/dashboard/events/${params.id}/reg-codes`}
                className={`block px-4 py-2 rounded-lg transition-colors ${
                  isActive(`/admin/dashboard/events/${params.id}/reg-codes`)
                    ? 'bg-emerald-500 text-white'
                    : 'hover:bg-gray-100'
                }`}
              >
                Registration Codes
              </Link>
            </li>
            <li>
              <Link
                href={`/admin/dashboard/events/${params.id}/access-codes`}
                className={`block px-4 py-2 rounded-lg transition-colors ${
                  isActive(`/admin/dashboard/events/${params.id}/access-codes`)
                    ? 'bg-emerald-500 text-white'
                    : 'hover:bg-gray-100'
                }`}
              >
                Access Codes
              </Link>
            </li>
            <li>
              <Link
                href={`/admin/dashboard/events/${params.id}/invites`}
                className={`block px-4 py-2 rounded-lg transition-colors ${
                  isActive(`/admin/dashboard/events/${params.id}/invites`)
                    ? 'bg-emerald-500 text-white'
                    : 'hover:bg-gray-100'
                }`}
              >
                Send Invites
              </Link>
            </li>
            <li>
              <Link
                href={`/admin/dashboard/events/${params.id}/rsvps`}
                className={`block px-4 py-2 rounded-lg transition-colors ${
                  isActive(`/admin/dashboard/events/${params.id}/rsvps`)
                    ? 'bg-emerald-500 text-white'
                    : 'hover:bg-gray-100'
                }`}
              >
                RSVP Management
              </Link>
            </li>
            <li>
              <Link
                href={`/admin/dashboard/events/${params.id}/tables`}
                className={`block px-4 py-2 rounded-lg transition-colors ${
                  isActive(`/admin/dashboard/events/${params.id}/tables`)
                    ? 'bg-emerald-500 text-white'
                    : 'hover:bg-gray-100'
                }`}
              >
                Tables
              </Link>
            </li>
            <li>
              <Link
                href={`/admin/dashboard/events/${params.id}/sent-invites`}
                className={`block px-4 py-2 rounded-lg transition-colors ${
                  isActive(`/admin/dashboard/events/${params.id}/sent-invites`)
                    ? 'bg-emerald-500 text-white'
                    : 'hover:bg-gray-100'
                }`}
              >
                Sent Invites
              </Link>
            </li>
            <li>
              <Link
                href={`/admin/dashboard/events/${params.id}/edit`}
                className={`block px-4 py-2 rounded-lg transition-colors ${
                  isActive(`/admin/dashboard/events/${params.id}/edit`)
                    ? 'bg-emerald-500 text-white'
                    : 'hover:bg-gray-100'
                }`}
              >
                Edit Event
              </Link>
            </li>
          </ul>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center w-full px-4 py-2 text-left text-red-600 rounded-lg transition-colors hover:bg-red-50"
            >
              <LogOut className="h-5 w-5 mr-2" />
              <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <h1 className="text-xl font-semibold text-gray-800">{eventTitle}</h1>
                </div>
              </div>
              <div className="flex items-center">
                <div className="ml-3 relative">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-700 mr-2">
                      {session?.user?.name || session?.user?.email || 'User'}
                    </span>
                    <Menu className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
