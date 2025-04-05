'use client'

import { useState } from 'react'
import { Plus, Minus, X, Table2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface BulkTableCreatorProps {
  eventId: string
  onTablesCreated: () => void
  onClose: () => void
}

export default function BulkTableCreator({ eventId, onTablesCreated, onClose }: BulkTableCreatorProps) {
  const [tableCount, setTableCount] = useState(10)
  const [startNumber, setStartNumber] = useState(1)
  const [capacity, setCapacity] = useState(8)
  const [tableColor, setTableColor] = useState('#f0f0f0')
  const [prefix, setPrefix] = useState('Table')
  const [loading, setLoading] = useState(false)
  
  // Handle table count change
  const handleTableCountChange = (value: number) => {
    setTableCount(Math.max(1, Math.min(100, value)))
  }
  
  // Handle capacity change
  const handleCapacityChange = (value: number) => {
    setCapacity(Math.max(1, Math.min(20, value)))
  }
  
  // Generate tables
  const handleGenerateTables = async () => {
    try {
      setLoading(true)
      
      const tables = []
      
      // Create table data
      for (let i = 0; i < tableCount; i++) {
        const tableNumber = startNumber + i
        tables.push({
          name: `${prefix} ${tableNumber}`,
          capacity: capacity,
          color: tableColor,
          number: tableNumber
        })
      }
      
      // Send request to create tables in bulk
      const response = await fetch(`/api/admin/events/${eventId}/tables/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tables })
      })
      
      if (!response.ok) {
        throw new Error('Failed to create tables')
      }
      
      const data = await response.json()
      
      toast.success(`Successfully created ${tableCount} tables`)
      onTablesCreated()
      onClose()
    } catch (error) {
      console.error('Error creating tables:', error)
      toast.error('Failed to create tables')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 max-w-xl w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Bulk Create Tables</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Table Naming
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="Prefix"
              className="flex-1 px-3 py-2 border rounded-md"
            />
            <div className="flex items-center">
              <span className="text-gray-500 mx-1">Start #</span>
              <input
                type="number"
                value={startNumber}
                onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
                className="w-16 px-2 py-2 border rounded-md"
                min="1"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Example: {prefix} {startNumber}, {prefix} {startNumber + 1}, ...
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Tables
            </label>
            <div className="flex">
              <button
                onClick={() => handleTableCountChange(tableCount - 1)}
                className="px-3 py-2 border rounded-l-md bg-gray-100"
                type="button"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                value={tableCount}
                onChange={(e) => handleTableCountChange(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border-y text-center"
                min="1"
                max="100"
              />
              <button
                onClick={() => handleTableCountChange(tableCount + 1)}
                className="px-3 py-2 border rounded-r-md bg-gray-100"
                type="button"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Capacity per Table
            </label>
            <div className="flex">
              <button
                onClick={() => handleCapacityChange(capacity - 1)}
                className="px-3 py-2 border rounded-l-md bg-gray-100"
                type="button"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                value={capacity}
                onChange={(e) => handleCapacityChange(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border-y text-center"
                min="1"
                max="20"
              />
              <button
                onClick={() => handleCapacityChange(capacity + 1)}
                className="px-3 py-2 border rounded-r-md bg-gray-100"
                type="button"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Table Color
          </label>
          <input
            type="color"
            value={tableColor}
            onChange={(e) => setTableColor(e.target.value)}
            className="w-full h-10"
          />
        </div>
        
        <div className="p-4 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-600">
            This will create <span className="font-medium">{tableCount}</span> tables with <span className="font-medium">{capacity}</span> seats each.
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Total capacity: <span className="font-medium">{tableCount * capacity}</span> guests
          </p>
        </div>
      </div>
      
      <div className="flex justify-end mt-6 space-x-3">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          type="button"
        >
          Cancel
        </button>
        <button
          onClick={handleGenerateTables}
          className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 flex items-center"
          type="button"
          disabled={loading}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating...
            </>
          ) : (
            <>
              <Table2 className="h-4 w-4 mr-1" />
              Create Tables
            </>
          )}
        </button>
      </div>
    </div>
  )
}
