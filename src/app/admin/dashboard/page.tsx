'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { RefreshCw } from 'lucide-react'

interface DashboardStats {
  totalRsvp: number
  availableRegistrations: number
  pendingRegistrations: number
  usedRegistrations: number
  inviteSentRegistrations: number
  totalRegistrationCodes: number
  totalInvitesSent: number
  emailInvites: number
  smsInvites: number
  bothInvites: number
  successfulInvites: number
  failedInvites: number
  pendingInvites: number
  canceledInvites: number
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const [stats, setStats] = useState<DashboardStats>({
    totalRsvp: 0,
    availableRegistrations: 0,
    pendingRegistrations: 0,
    usedRegistrations: 0,
    inviteSentRegistrations: 0,
    totalRegistrationCodes: 0,
    totalInvitesSent: 0,
    emailInvites: 0,
    smsInvites: 0,
    bothInvites: 0,
    successfulInvites: 0,
    failedInvites: 0,
    pendingInvites: 0,
    canceledInvites: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchStats = async () => {
    try {
      setIsRefreshing(true)
      console.log('Session Status:', status)
      console.log('Session Data:', session)
      
      const response = await fetch('/api/admin/stats')
      console.log('API Response Status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('API Response Data:', data)
        setStats(data)
      } else {
        // If the response is not OK, log the error
        const errorData = await response.json().catch(() => ({}))
        console.error('API Error Response:', response.status, errorData)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  // Prepare data for pie charts
  const registrationStatusData: { name: string; value: number; color: string }[] = [
    { name: 'Available', value: stats.availableRegistrations, color: '#10b981' },
    { name: 'Invite Sent', value: stats.inviteSentRegistrations, color: '#3b82f6' },
    { name: 'Pending', value: stats.pendingRegistrations, color: '#f59e0b' },
    { name: 'Used', value: stats.usedRegistrations, color: '#6366f1' }
  ].filter(item => item.value > 0)

  const inviteTypeData: { name: string; value: number; color: string }[] = [
    { name: 'Email', value: stats.emailInvites, color: '#3b82f6' },
    { name: 'SMS', value: stats.smsInvites, color: '#8b5cf6' },
    { name: 'Both', value: stats.bothInvites, color: '#ec4899' }
  ].filter(item => item.value > 0)

  const inviteStatusData: { name: string; value: number; color: string }[] = [
    { name: 'Successful', value: stats.successfulInvites, color: '#10b981' },
    { name: 'Failed', value: stats.failedInvites, color: '#ef4444' },
    { name: 'Pending', value: stats.pendingInvites, color: '#f59e0b' },
    { name: 'Canceled', value: stats.canceledInvites, color: '#6b7280' }
  ].filter(item => item.value > 0)

  // Type definitions for chart data
  type ChartDataItem = {
    name: string;
    value: number;
    color: string;
  }

  // Type for label props
  type PieLabelProps = {
    name: string;
    percent: number;
  }

  // Type for tooltip formatter
  type TooltipFormatterProps = (value: number) => [string, string];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-light text-gray-800">Dashboard Overview</h1>
        <button 
          onClick={fetchStats}
          disabled={isRefreshing}
          className={`flex items-center px-3 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors ${
            isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* RSVP Stats */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-light text-gray-600 mb-2">Total RSVPs</h2>
          <p className="text-3xl font-light text-emerald-500">{stats.totalRsvp}</p>
          <div className="mt-2 text-sm text-gray-500">
            Out of {stats.totalRegistrationCodes} registration codes
          </div>
        </div>

        {/* Available Registrations */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-light text-gray-600 mb-2">Available Registrations</h2>
          <p className="text-3xl font-light text-emerald-500">{stats.availableRegistrations}</p>
          <div className="mt-2 text-sm text-gray-500">
            {stats.pendingRegistrations} pending, {stats.inviteSentRegistrations} invite sent
          </div>
        </div>

        {/* Total Invites Sent */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-light text-gray-600 mb-2">Invites Sent</h2>
          <p className="text-3xl font-light text-emerald-500">{stats.totalInvitesSent}</p>
          <div className="mt-2 text-sm text-gray-500">
            {stats.successfulInvites} successful, {stats.failedInvites} failed, {stats.pendingInvites} pending
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Registration Status Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-light text-gray-600 mb-4">Registration Code Status</h2>
          {registrationStatusData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={registrationStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }: PieLabelProps) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {registrationStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value} codes`, 'Count']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No data available
            </div>
          )}
        </div>

        {/* Invite Type Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-light text-gray-600 mb-4">Invite Types</h2>
          {inviteTypeData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inviteTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }: PieLabelProps) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {inviteTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value} invites`, 'Count']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No data available
            </div>
          )}
        </div>

        {/* Invite Status Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-light text-gray-600 mb-4">Invite Status</h2>
          {inviteStatusData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inviteStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }: PieLabelProps) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {inviteStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value} invites`, 'Count']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No data available
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
