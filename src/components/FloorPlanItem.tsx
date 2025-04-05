'use client'

import { useState, useEffect } from 'react'
import { Edit, Trash, Eye, Check } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

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

interface FloorPlanItemProps {
  floorPlan: FloorPlan
  onEdit: (floorPlan: FloorPlan) => void
  onDelete: (floorPlan: FloorPlan) => void
  onView: (floorPlan: FloorPlan) => void
  onSetDefault: (floorPlan: FloorPlan) => void
}

export default function FloorPlanItem({
  floorPlan,
  onEdit,
  onDelete,
  onView,
  onSetDefault
}: FloorPlanItemProps) {
  const [elementCount, setElementCount] = useState(0)
  const [isClient, setIsClient] = useState(false)

  // Only run on client side
  useEffect(() => {
    setIsClient(true)
    
    // Parse the layout to get element count
    try {
      const layoutData = JSON.parse(floorPlan.layout)
      setElementCount(Array.isArray(layoutData) ? layoutData.length : 0)
    } catch (e) {
      console.error('Error parsing floor plan layout:', e)
      setElementCount(0)
    }
  }, [floorPlan.layout])
  
  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            {floorPlan.name}
            {floorPlan.isDefault && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-emerald-100 text-emerald-800 rounded-full">
                Default
              </span>
            )}
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => onView(floorPlan)}
              className="p-1 text-gray-500 hover:text-gray-700"
              title="View floor plan"
            >
              <Eye size={18} />
            </button>
            <button
              onClick={() => onEdit(floorPlan)}
              className="p-1 text-blue-500 hover:text-blue-700"
              title="Edit floor plan"
            >
              <Edit size={18} />
            </button>
            <button
              onClick={() => onDelete(floorPlan)}
              className="p-1 text-red-500 hover:text-red-700"
              title="Delete floor plan"
            >
              <Trash size={18} />
            </button>
            {!floorPlan.isDefault && (
              <button
                onClick={() => onSetDefault(floorPlan)}
                className="p-1 text-emerald-500 hover:text-emerald-700"
                title="Set as default"
              >
                <Check size={18} />
              </button>
            )}
          </div>
        </div>
        
        {floorPlan.description && (
          <p className="mt-1 text-sm text-gray-600">{floorPlan.description}</p>
        )}
        
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>
            {isClient ? `${elementCount} ${elementCount === 1 ? 'element' : 'elements'}` : 'Loading...'}
          </span>
          <span>
            {isClient ? `Updated ${formatDistanceToNow(new Date(floorPlan.updatedAt))} ago` : ''}
          </span>
        </div>
      </div>
      
      {floorPlan.imageUrl && (
        <div className="h-40 overflow-hidden border-t">
          <img
            src={floorPlan.imageUrl}
            alt={floorPlan.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  )
}
