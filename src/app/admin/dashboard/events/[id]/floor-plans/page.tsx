'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus, RefreshCw, Save, Eye, X } from 'lucide-react'
import Swal from 'sweetalert2'
import { toast } from 'react-hot-toast'
import Modal from '@/app/components/Modal'
import FloorPlanItem from '@/components/FloorPlanItem'
import FloorPlanEditor from '@/components/FloorPlanEditor'

// Define the FloorPlan type
interface FloorPlan {
  id: string
  name: string
  description?: string
  imageUrl?: string
  layout: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
  eventId: string
}

export default function FloorPlansPage() {
  const params = useParams()
  const router = useRouter()
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<FloorPlan | null>(null)

  useEffect(() => {
    fetchFloorPlans()
  }, [])

  const fetchFloorPlans = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/events/${params.id}/floor-plans`)
      
      if (response.ok) {
        const data = await response.json()
        setFloorPlans(data.floorPlans || [])
      } else {
        console.error('Failed to fetch floor plans')
        toast.error('Failed to load floor plans')
      }
    } catch (error) {
      console.error('Error fetching floor plans:', error)
      toast.error('An error occurred while loading floor plans')
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePlan = () => {
    router.push(`/admin/dashboard/events/${params.id}/floor-plans/create`)
  }

  const handleEditPlan = (plan: FloorPlan) => {
    router.push(`/admin/dashboard/events/${params.id}/floor-plans/${plan.id}/edit`)
  }

  const handleViewPlan = (plan: FloorPlan) => {
    setSelectedPlan(plan)
    setShowPreview(true)
  }

  const handleDeletePlan = async (plan: FloorPlan) => {
    const result = await Swal.fire({
      title: 'Delete Floor Plan',
      text: `Are you sure you want to delete "${plan.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    })
    
    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/admin/events/${params.id}/floor-plans/${plan.id}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          toast.success('Floor plan deleted successfully')
          fetchFloorPlans()
        } else {
          toast.error('Failed to delete floor plan')
        }
      } catch (error) {
        console.error('Error deleting floor plan:', error)
        toast.error('An error occurred while deleting the floor plan')
      }
    }
  }

  const handleSetDefault = async (plan: FloorPlan) => {
    try {
      const response = await fetch(`/api/admin/events/${params.id}/floor-plans/${plan.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...plan,
          isDefault: true
        })
      })
      
      if (response.ok) {
        toast.success(`"${plan.name}" set as default floor plan`)
        fetchFloorPlans()
      } else {
        toast.error('Failed to set default floor plan')
      }
    } catch (error) {
      console.error('Error setting default floor plan:', error)
      toast.error('An error occurred while updating the floor plan')
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Floor Plans</h1>
        <button
          onClick={handleCreatePlan}
          className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Floor Plan
        </button>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
        </div>
      ) : floorPlans.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h2 className="text-xl font-medium text-gray-700 mb-2">No Floor Plans Yet</h2>
          <p className="text-gray-500 mb-6">
            Create your first floor plan to help visualize your event space.
          </p>
          <button
            onClick={handleCreatePlan}
            className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 inline-flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Floor Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {floorPlans.map(plan => (
            <FloorPlanItem
              key={plan.id}
              floorPlan={plan}
              onEdit={() => handleEditPlan(plan)}
              onDelete={() => handleDeletePlan(plan)}
              onView={() => handleViewPlan(plan)}
              onSetDefault={() => handleSetDefault(plan)}
            />
          ))}
        </div>
      )}
      
      {/* Preview Modal */}
      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)}>
        <div className="w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {selectedPlan?.name || 'Floor Plan Preview'}
            </h2>
            <button
              onClick={() => setShowPreview(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {selectedPlan?.description && (
            <p className="text-gray-600 mb-4">{selectedPlan.description}</p>
          )}
          
          <div className="mb-6">
            {selectedPlan && (
              <FloorPlanEditor
                initialLayout={selectedPlan.layout}
                onLayoutChange={() => {}}
                readOnly={true}
              />
            )}
          </div>
          
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
