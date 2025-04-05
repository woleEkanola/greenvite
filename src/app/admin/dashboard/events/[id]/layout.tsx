'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  LogOut, 
  Menu, 
  Home, 
  Users, 
  Calendar, 
  Mail, 
  Utensils, 
  Gift, 
  BarChart, 
  QrCode, 
  Ticket,
  Send,
  MessageSquare,
  Globe
} from 'lucide-react'
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

  // Check if the current route is the access-mobile page
  const isAccessMobilePage = pathname.includes('access-mobile')

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
      {/* Sidebar - hidden for access-mobile route */}
      {!isAccessMobilePage && (
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
                {isSidebarOpen && <span>Back to Events</span>}
              </Link>
              {isSidebarOpen && (
                <h2 className="text-lg font-semibold text-gray-800 truncate">
                  {eventTitle}
                </h2>
              )}
            </div>

            <ul className="space-y-2">
              <li>
                <Link
                  href={`/admin/dashboard/events/${params.id}`}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                    pathname === `/admin/dashboard/events/${params.id}`
                      ? 'bg-emerald-500 text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Home className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Overview</span>}
                </Link>
              </li>
              <li>
                <Link
                  href={`/admin/dashboard/events/${params.id}/reg-codes`}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                    isActive(`/admin/dashboard/events/${params.id}/reg-codes`)
                      ? 'bg-emerald-500 text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <QrCode className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Registration Codes</span>}
                </Link>
              </li>
              <li>
                <Link
                  href={`/admin/dashboard/events/${params.id}/access-codes`}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                    isActive(`/admin/dashboard/events/${params.id}/access-codes`)
                      ? 'bg-emerald-500 text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Ticket className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Access Codes</span>}
                </Link>
              </li>
              <li>
                <Link
                  href={`/admin/dashboard/events/${params.id}/invites`}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                    isActive(`/admin/dashboard/events/${params.id}/invites`)
                      ? 'bg-emerald-500 text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Send className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Send Invites</span>}
                </Link>
              </li>
              <li>
                <Link
                  href={`/admin/dashboard/events/${params.id}/rsvps`}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                    isActive(`/admin/dashboard/events/${params.id}/rsvps`)
                      ? 'bg-emerald-500 text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Users className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">RSVP Management</span>}
                </Link>
              </li>
              <li>
                <Link
                  href={`/admin/dashboard/events/${params.id}/tables`}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                    isActive(`/admin/dashboard/events/${params.id}/tables`)
                      ? 'bg-emerald-500 text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Utensils className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Tables</span>}
                </Link>
              </li>
              <li>
                <Link
                  href={`/admin/dashboard/events/${params.id}/sent-invites`}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                    isActive(`/admin/dashboard/events/${params.id}/sent-invites`)
                      ? 'bg-emerald-500 text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Mail className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Sent Invites</span>}
                </Link>
              </li>
              <li>
                <Link
                  href={`/admin/dashboard/events/${params.id}/message-templates`}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                    isActive(`/admin/dashboard/events/${params.id}/message-templates`)
                      ? 'bg-emerald-500 text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <MessageSquare className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Message Templates</span>}
                </Link>
              </li>
              <li>
                <Link
                  href={`/admin/dashboard/events/${params.id}/event-page`}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                    isActive(`/admin/dashboard/events/${params.id}/event-page`)
                      ? 'bg-emerald-500 text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Globe className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Event Page</span>}
                </Link>
              </li>
            </ul>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center w-full px-4 py-2 text-left text-red-600 rounded-lg transition-colors hover:bg-red-50"
              >
                <LogOut className="h-5 w-5 min-w-5" />
                {isSidebarOpen && <span className="ml-3">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>}
              </button>
            </div>
          </nav>
        </aside>
      )}

      {/* Main Content - full width for access-mobile */}
      <main className={`transition-all duration-300 ${!isAccessMobilePage ? (isSidebarOpen ? 'ml-64' : 'ml-20') : 'ml-0'}`}>
        {/* Page Content */}
        <div className={`${isAccessMobilePage ? '' : 'py-6'}`}>
          <div className={`${isAccessMobilePage ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}`}>
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
