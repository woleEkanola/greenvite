import React from 'react'

interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10">
        <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 md:sticky md:block">
          <div className="h-full py-6 pr-6 lg:py-8">
            <nav className="flex flex-col space-y-2">
              <a href="/admin/dashboard" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100">
                Dashboard
              </a>
              <a href="/admin/dashboard/invites" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100">
                Send Invites
              </a>
              <a href="/admin/dashboard/invites/manage" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100">
                Manage Invites
              </a>
              <a href="/admin/dashboard/reg-codes" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100">
                Registration Codes
              </a>
              <a href="/admin/dashboard/rsvps" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100">
                RSVPs
              </a>
            </nav>
          </div>
        </aside>
        <main className="flex w-full flex-col overflow-hidden p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
