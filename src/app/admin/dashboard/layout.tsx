'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const isActive = (path: string) => pathname === path

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
          <ul className="space-y-2">
            <li>
              <Link
                href="/admin/dashboard"
                className={`block px-4 py-2 rounded-lg transition-colors ${
                  isActive('/admin/dashboard')
                    ? 'bg-emerald-500 text-white'
                    : 'hover:bg-gray-100'
                }`}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/admin/dashboard/reg-codes"
                className={`block px-4 py-2 rounded-lg transition-colors ${
                  isActive('/admin/dashboard/reg-codes')
                    ? 'bg-emerald-500 text-white'
                    : 'hover:bg-gray-100'
                }`}
              >
                Registration Codes
              </Link>
            </li>
            <li>
              <Link
                href="/admin/dashboard/invites"
                className={`block px-4 py-2 rounded-lg transition-colors ${
                  isActive('/admin/dashboard/invites')
                    ? 'bg-emerald-500 text-white'
                    : 'hover:bg-gray-100'
                }`}
              >
                Send Invites
              </Link>
            </li>
            <li>
              <Link
                href="/admin/dashboard/rsvps"
                className={`block px-4 py-2 rounded-lg transition-colors ${
                  isActive('/admin/dashboard/rsvps')
                    ? 'bg-emerald-500 text-white'
                    : 'hover:bg-gray-100'
                }`}
              >
                RSVP Management
              </Link>
            </li>
            <li>
              <Link
                href="/admin/dashboard/rsvps?action=send-message"
                className={`block px-4 py-2 rounded-lg transition-colors ${
                  pathname.includes('/admin/dashboard/rsvps') && pathname.includes('?action=send-message')
                    ? 'bg-emerald-500 text-white'
                    : 'hover:bg-gray-100'
                }`}
              >
                Send Messages
              </Link>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
