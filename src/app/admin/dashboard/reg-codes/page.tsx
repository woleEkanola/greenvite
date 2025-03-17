'use client'

import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import DataTable from '@/components/DataTable'

interface RegCode {
  code: string
  used: boolean
  usedBy?: string
  usedAt?: string
}

export default function RegCodes() {
  const [regCodes, setRegCodes] = useState<RegCode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [codeCount, setCodeCount] = useState(1)

  useEffect(() => {
    fetchRegCodes()
  }, [])

  const fetchRegCodes = async () => {
    try {
      const response = await fetch('/api/admin/reg-codes')
      if (response.ok) {
        const data = await response.json()
        setRegCodes(data)
      }
    } catch (error) {
      console.error('Error fetching registration codes:', error)
      Swal.fire('Error', 'Failed to fetch registration codes', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateCodes = async () => {
    if (codeCount < 1 || codeCount > 100) {
      Swal.fire('Error', 'Please enter a number between 1 and 100', 'error')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/admin/reg-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count: codeCount }),
      })
      
      if (response.ok) {
        const result = await response.json()
        await fetchRegCodes() // Refresh the list
        Swal.fire('Success', `Generated ${result.count} new registration codes`, 'success')
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate codes')
      }
    } catch (error) {
      console.error('Error generating codes:', error)
      Swal.fire('Error', 'Failed to generate registration codes', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  // Define table columns
  const columns = [
    {
      header: 'Code',
      accessor: 'code' as keyof RegCode,
      searchable: true
    },
    {
      header: 'Status',
      accessor: (code: RegCode) => (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${code.used ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
          {code.used ? 'Used' : 'Available'}
        </span>
      ),
      searchable: false
    },
    {
      header: 'Used By',
      accessor: 'usedBy' as keyof RegCode,
      searchable: true
    },
    {
      header: 'Used At',
      accessor: 'usedAt' as keyof RegCode,
      searchable: true
    }
  ];

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
        <h1 className="text-2xl font-light text-gray-800">Registration Codes</h1>
        <div className="flex items-center gap-4">
          <input
            type="number"
            min="1"
            max="100"
            value={codeCount}
            onChange={(e) => setCodeCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
            className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={handleGenerateCodes}
            disabled={isGenerating}
            className={`bg-emerald-500 text-white px-4 py-2 rounded-md hover:bg-emerald-600 transition-colors
                     ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isGenerating ? 'Generating...' : 'Generate Codes'}
          </button>
        </div>
      </div>

      <DataTable 
        data={regCodes}
        columns={columns}
        itemsPerPage={10}
        searchPlaceholder="Search registration codes..."
        emptyMessage="No registration codes found"
      />
    </div>
  )
}
