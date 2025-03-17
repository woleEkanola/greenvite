'use client'

import { useState, useEffect } from 'react'

interface DashboardStats {
  totalRsvp: number
  availableRegistrations: number
  totalInvitesSent: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRsvp: 0,
    availableRegistrations: 0,
    totalInvitesSent: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-light text-gray-800 mb-8">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* RSVP Stats */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-light text-gray-600 mb-2">Total RSVPs</h2>
          <p className="text-3xl font-light text-emerald-500">{stats.totalRsvp}</p>
        </div>

        {/* Available Registrations */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-light text-gray-600 mb-2">Available Registrations</h2>
          <p className="text-3xl font-light text-emerald-500">{stats.availableRegistrations}</p>
        </div>

        {/* Total Invites Sent */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-light text-gray-600 mb-2">Invites Sent</h2>
          <p className="text-3xl font-light text-emerald-500">{stats.totalInvitesSent}</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <h2 className="text-xl font-light text-gray-800 mb-4">Recent Activity</h2>
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b text-sm text-gray-500">
            Coming soon...
          </div>
        </div>
      </div>
    </div>
  )
}
