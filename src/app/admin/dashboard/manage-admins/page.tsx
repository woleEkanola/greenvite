'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { AlertCircle, CheckCircle, Edit, Trash, UserPlus } from 'lucide-react'
import Swal from 'sweetalert2'

interface Admin {
  id: string
  username: string
  email: string | null
  name: string | null
  role: string
  createdAt: string
}

export default function ManageAdmins() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddAdmin, setShowAddAdmin] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)

  useEffect(() => {
    fetchAdmins()
    fetchCurrentUserRole()
  }, [])

  const fetchCurrentUserRole = async () => {
    try {
      const response = await fetch('/api/admin/current-user')
      if (response.ok) {
        const data = await response.json()
        console.log('Current user data:', data) // Debug log
        setCurrentUserRole(data.role)
      } else {
        console.error('Failed to fetch current user role')
      }
    } catch (error) {
      console.error('Error fetching current user role:', error)
    }
  }

  const fetchAdmins = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setAdmins(data.users)
      } else {
        toast.error('Failed to fetch admin users')
      }
    } catch (error) {
      console.error('Error fetching admin users:', error)
      toast.error('An error occurred while fetching admin users')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!username || !password) {
      toast.error('Username and password are required')
      return
    }
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          email: email || undefined,
          name: name || undefined,
          role: isSuperAdmin ? 'superadmin' : 'admin',
        }),
      })
      
      if (response.ok) {
        toast.success('Admin user created successfully')
        setUsername('')
        setPassword('')
        setEmail('')
        setName('')
        setIsSuperAdmin(false)
        setShowAddAdmin(false)
        fetchAdmins()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to create admin user')
      }
    } catch (error) {
      console.error('Error creating admin user:', error)
      toast.error('An error occurred while creating admin user')
    }
  }

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingAdmin || !username) {
      toast.error('Username is required')
      return
    }
    
    try {
      const response = await fetch(`/api/admin/users/${editingAdmin.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password: password || undefined, // Only update if provided
          email: email || undefined,
          name: name || undefined,
          role: isSuperAdmin ? 'superadmin' : 'admin',
        }),
      })
      
      if (response.ok) {
        toast.success('Admin user updated successfully')
        setEditingAdmin(null)
        setUsername('')
        setPassword('')
        setEmail('')
        setName('')
        setIsSuperAdmin(false)
        fetchAdmins()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to update admin user')
      }
    } catch (error) {
      console.error('Error updating admin user:', error)
      toast.error('An error occurred while updating admin user')
    }
  }

  const handleDeleteAdmin = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This action cannot be undone!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    })
    
    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/admin/users/${id}`, {
          method: 'DELETE',
        })
        
        if (response.ok) {
          toast.success('Admin user deleted successfully')
          fetchAdmins()
        } else {
          const data = await response.json()
          toast.error(data.error || 'Failed to delete admin user')
        }
      } catch (error) {
        console.error('Error deleting admin user:', error)
        toast.error('An error occurred while deleting admin user')
      }
    }
  }

  const handleEditAdmin = (admin: Admin) => {
    setEditingAdmin(admin)
    setUsername(admin.username)
    setEmail(admin.email || '')
    setName(admin.name || '')
    setIsSuperAdmin(admin.role === 'superadmin')
    setPassword('') // Clear password field for security
  }

  const handleCancelEdit = () => {
    setEditingAdmin(null)
    setUsername('')
    setPassword('')
    setEmail('')
    setName('')
    setIsSuperAdmin(false)
  }

  // Temporarily disable the role check to allow access
  /*
  if (currentUserRole !== 'superadmin') {
    return (
      <div className="p-8">
        <div className="bg-red-100 p-4 rounded-md flex items-center">
          <AlertCircle className="text-red-500 mr-2" />
          <p className="text-red-700">You do not have permission to access this page. Only superadmins can manage admin accounts.</p>
          <p className="text-red-700 mt-2">Current role: {currentUserRole || 'Loading...'}</p>
        </div>
      </div>
    )
  }
  */

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Admin Accounts</h1>
        {!showAddAdmin && !editingAdmin && (
          <button
            onClick={() => setShowAddAdmin(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add New Admin
          </button>
        )}
      </div>

      {showAddAdmin && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Add New Admin</h2>
          <form onSubmit={handleAddAdmin}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username*
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password*
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isSuperAdmin}
                    onChange={(e) => setIsSuperAdmin(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Grant Superadmin Privileges
                  </span>
                </label>
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAddAdmin(false)}
                className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Create Admin
              </button>
            </div>
          </form>
        </div>
      )}

      {editingAdmin && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Edit Admin: {editingAdmin.username}</h2>
          <form onSubmit={handleUpdateAdmin}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username*
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password (leave blank to keep current)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isSuperAdmin}
                    onChange={(e) => setIsSuperAdmin(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Grant Superadmin Privileges
                  </span>
                </label>
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Update Admin
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created At
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    Loading...
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    No admin users found
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {admin.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {admin.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {admin.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        admin.role === 'superadmin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {admin.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditAdmin(admin)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAdmin(admin.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
