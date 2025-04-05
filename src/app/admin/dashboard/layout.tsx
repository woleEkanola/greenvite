'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { LogOut, Menu, User, ChevronDown } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  // Check if we're on an event detail page that has its own sidebar
  const isEventDetailPage = /\/admin\/dashboard\/events\/[^\/]+(?:\/.*)?$/.test(pathname);

  // Handle click outside to close user menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuRef])

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
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar - Hide for event detail pages */}
      {!isEventDetailPage && (
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
            <ul className="space-y-2">
              <li>
                <Link
                  href="/admin/dashboard"
                  className={`block px-4 py-2 rounded-lg transition-colors ${
                    isActive('/admin/dashboard') && !pathname.includes('/admin/dashboard/')
                      ? 'bg-emerald-500 text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  Overview
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/dashboard/events"
                  className={`block px-4 py-2 rounded-lg transition-colors ${
                    isActive('/admin/dashboard/events')
                      ? 'bg-emerald-500 text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  Events
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
      )}

      {/* Main Content - Adjust margin based on whether sidebar is shown */}
      <main className={`transition-all duration-300 ${!isEventDetailPage ? (isSidebarOpen ? 'ml-64' : 'ml-20') : 'ml-0'}`}>
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <h1 className="text-xl font-semibold text-gray-800">Admin Dashboard</h1>
                </div>
              </div>
              <div className="flex items-center">
                <div className="ml-3 relative" ref={userMenuRef}>
                  <div>
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center max-w-xs text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                    >
                      <span className="sr-only">Open user menu</span>
                      <div className="flex items-center px-3 py-2 rounded-md hover:bg-gray-100">
                        <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                          <User className="h-5 w-5" />
                        </div>
                        {session?.user?.name && (
                          <span className="ml-2 text-gray-700">{session.user.name}</span>
                        )}
                        <ChevronDown className="ml-1 h-4 w-4 text-gray-500" />
                      </div>
                    </button>
                  </div>
                  {showUserMenu && (
                    <div 
                      className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-30"
                    >
                      <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <LogOut className="mr-2 h-4 w-4 text-gray-500" />
                        {isLoggingOut ? 'Logging out...' : 'Sign out'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>
        
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
