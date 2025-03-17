'use client'

import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import DataTable from '@/components/DataTable'

interface RegCode {
  id: string
  code: string
  used: boolean
  usedBy?: string
  usedAt?: string
  status?: 'available' | 'used' | 'pending' | 'invite-sent'
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

  const handleDeleteCode = async (codeId: string, codeValue: string) => {
    // Confirm deletion
    const result = await Swal.fire({
      title: 'Delete Registration Code',
      text: `Are you sure you want to delete code ${codeValue}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch('/api/admin/reg-codes', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ codeId }),
        });
        
        if (response.ok) {
          await fetchRegCodes(); // Refresh the list
          Swal.fire('Deleted!', `Registration code ${codeValue} has been deleted.`, 'success');
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete code');
        }
      } catch (error) {
        console.error('Error deleting code:', error);
        Swal.fire('Error', 'Failed to delete registration code', 'error');
      }
    }
  };

  // Define table columns
  const columns = [
    {
      header: 'Code',
      accessor: 'code' as keyof RegCode,
      searchable: true
    },
    {
      header: 'Status',
      accessor: (code: RegCode) => {
        let statusText = 'Available';
        let colorClass = 'bg-green-100 text-green-800';
        
        if (code.status === 'used' || code.used) {
          statusText = 'Used';
          colorClass = 'bg-red-100 text-red-800';
        } else if (code.status === 'invite-sent') {
          statusText = 'Invite Sent';
          colorClass = 'bg-blue-100 text-blue-800';
        } else if (code.status === 'pending') {
          statusText = 'Pending';
          colorClass = 'bg-yellow-100 text-yellow-800';
        }
        
        return (
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}>
            {statusText}
          </span>
        );
      },
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
    },
    {
      header: 'Actions',
      accessor: (code: RegCode) => {
        // Only show delete button for available codes
        if (code.status === 'available' && !code.used) {
          return (
            <button
              onClick={() => handleDeleteCode(code.id, code.code)}
              className="text-red-600 hover:text-red-900"
            >
              Delete
            </button>
          );
        }
        return null;
      },
      searchable: false
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
