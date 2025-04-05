'use client'

import { useState, useEffect } from 'react'
import { Trash, Move, RotateCw, RotateCcw, Plus, Minus } from 'lucide-react'
import { FloorPlanElement, ElementType } from './FloorPlanCanvas'
import FloorPlanCanvas from './FloorPlanCanvas'

interface ElementOption {
  type: ElementType
  label: string
  defaultWidth: number
  defaultHeight: number
  defaultFill: string
  defaultStroke: string
  icon: React.ReactNode
}

interface FloorPlanEditorProps {
  initialLayout?: string
  onLayoutChange: (layout: string) => void
  readOnly?: boolean
}

export default function FloorPlanEditor({
  initialLayout = '',
  onLayoutChange,
  readOnly = false
}: FloorPlanEditorProps) {
  const [elements, setElements] = useState<FloorPlanElement[]>([])
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [canvasWidth, setCanvasWidth] = useState(800)
  const [canvasHeight, setCanvasHeight] = useState(600)
  const [isClient, setIsClient] = useState(false)

  // Element options
  const elementOptions: ElementOption[] = [
    { 
      type: 'roundTable', 
      label: 'Round Table', 
      defaultWidth: 80, 
      defaultHeight: 80, 
      defaultFill: '#f0f0f0', 
      defaultStroke: '#333333',
      icon: <div className="w-6 h-6 rounded-full border-2 border-gray-600 flex items-center justify-center">T</div>
    },
    { 
      type: 'table', 
      label: 'Table', 
      defaultWidth: 100, 
      defaultHeight: 60, 
      defaultFill: '#f0f0f0', 
      defaultStroke: '#333333',
      icon: <div className="w-6 h-6 border-2 border-gray-600 flex items-center justify-center">T</div>
    },
    { 
      type: 'stage', 
      label: 'Stage', 
      defaultWidth: 200, 
      defaultHeight: 80, 
      defaultFill: '#d4a650', 
      defaultStroke: '#8b6914',
      icon: <div className="w-6 h-6 bg-amber-500 text-white flex items-center justify-center">S</div>
    },
    { 
      type: 'danceFloor', 
      label: 'Dance Floor', 
      defaultWidth: 150, 
      defaultHeight: 150, 
      defaultFill: '#b87333', 
      defaultStroke: '#8b4513',
      icon: <div className="w-6 h-6 bg-amber-700 text-white flex items-center justify-center">D</div>
    },
    { 
      type: 'bar', 
      label: 'Bar', 
      defaultWidth: 120, 
      defaultHeight: 40, 
      defaultFill: '#9370db', 
      defaultStroke: '#4b0082',
      icon: <div className="w-6 h-6 bg-purple-500 text-white flex items-center justify-center">B</div>
    },
    { 
      type: 'entrance', 
      label: 'Entrance', 
      defaultWidth: 60, 
      defaultHeight: 20, 
      defaultFill: '#3cb371', 
      defaultStroke: '#2e8b57',
      icon: <div className="w-6 h-6 bg-green-500 text-white flex items-center justify-center">E</div>
    },
    { 
      type: 'dj', 
      label: 'DJ', 
      defaultWidth: 60, 
      defaultHeight: 60, 
      defaultFill: '#ff6347', 
      defaultStroke: '#8b0000',
      icon: <div className="w-6 h-6 bg-red-500 text-white flex items-center justify-center">DJ</div>
    },
    { 
      type: 'band', 
      label: 'Band', 
      defaultWidth: 100, 
      defaultHeight: 60, 
      defaultFill: '#ffd700', 
      defaultStroke: '#b8860b',
      icon: <div className="w-6 h-6 bg-yellow-500 text-white flex items-center justify-center">B</div>
    },
    { 
      type: 'cocktail', 
      label: 'Cocktail', 
      defaultWidth: 40, 
      defaultHeight: 40, 
      defaultFill: '#20b2aa', 
      defaultStroke: '#008080',
      icon: <div className="w-6 h-6 bg-teal-500 text-white flex items-center justify-center">C</div>
    }
  ]

  // Only run on client side
  useEffect(() => {
    setIsClient(true)
    
    // Initialize with provided layout
    if (initialLayout) {
      try {
        const layoutData = JSON.parse(initialLayout)
        if (Array.isArray(layoutData)) {
          setElements(layoutData)
        }
      } catch (e) {
        console.error('Error parsing layout:', e)
      }
    }
    
    // Update canvas size
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize)
    }
  }, [initialLayout])

  // Update parent component when elements change
  useEffect(() => {
    onLayoutChange(JSON.stringify(elements))
  }, [elements, onLayoutChange])

  // Get selected element
  const selectedElement = elements.find(el => el.id === selectedElementId) || null

  // Add new element
  const handleAddElement = (type: ElementType) => {
    if (readOnly) return
    
    const option = elementOptions.find(opt => opt.type === type)
    if (!option) return
    
    const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)
    
    const newElement: FloorPlanElement = {
      id,
      type,
      x: canvasWidth / 2 - option.defaultWidth / 2,
      y: canvasHeight / 2 - option.defaultHeight / 2,
      width: option.defaultWidth,
      height: option.defaultHeight,
      fill: option.defaultFill,
      stroke: option.defaultStroke,
      rotation: 0
    }
    
    setElements(prev => [...prev, newElement])
    setSelectedElementId(id)
  }

  // Delete selected element
  const handleDeleteElement = () => {
    if (readOnly || !selectedElementId) return
    
    setElements(prev => prev.filter(el => el.id !== selectedElementId))
    setSelectedElementId(null)
  }

  // Rotate selected element
  const handleRotateElement = (clockwise: boolean) => {
    if (readOnly || !selectedElementId) return
    
    setElements(prev => prev.map(el => {
      if (el.id === selectedElementId) {
        const rotation = el.rotation || 0
        return { ...el, rotation: rotation + (clockwise ? 15 : -15) }
      }
      return el
    }))
  }

  // Update element properties
  const handleUpdateElement = (id: string, updates: Partial<FloorPlanElement>) => {
    if (readOnly) return
    
    setElements(prev => prev.map(el => 
      el.id === id ? { ...el, ...updates } : el
    ))
  }

  // Update canvas size based on container
  const updateCanvasSize = () => {
    const containerWidth = window.innerWidth < 768 ? window.innerWidth - 40 : Math.min(window.innerWidth - 400, 800)
    setCanvasWidth(containerWidth)
    setCanvasHeight(Math.min(containerWidth * 0.75, 600))
  }

  if (!isClient) {
    return <div className="bg-gray-100 p-4 rounded-lg">Loading floor plan editor...</div>
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {!readOnly && (
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium mb-3">Add Elements</h3>
          <div className="flex flex-wrap gap-2">
            {elementOptions.map(option => (
              <button
                key={option.type}
                onClick={() => handleAddElement(option.type)}
                className="flex flex-col items-center justify-center p-2 border rounded-md hover:bg-gray-50"
                title={option.label}
              >
                {option.icon}
                <span className="text-xs mt-1">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row">
        <div className={`${readOnly ? 'w-full' : 'md:w-3/4'} p-4`}>
          <FloorPlanCanvas
            elements={elements}
            onElementsChange={setElements}
            selectedElement={selectedElementId}
            onSelectElement={setSelectedElementId}
            readOnly={readOnly}
            width={canvasWidth}
            height={canvasHeight}
          />
        </div>
        
        {!readOnly && selectedElement && (
          <div className="md:w-1/4 p-4 border-l">
            <h3 className="text-lg font-medium mb-3">Properties</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Size
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={Math.round(selectedElement.width)}
                    onChange={(e) => handleUpdateElement(selectedElement.id, { width: parseInt(e.target.value) || 10 })}
                    className="w-1/2 px-3 py-2 border rounded-md"
                    placeholder="Width"
                  />
                  <input
                    type="number"
                    value={Math.round(selectedElement.height)}
                    onChange={(e) => handleUpdateElement(selectedElement.id, { height: parseInt(e.target.value) || 10 })}
                    className="w-1/2 px-3 py-2 border rounded-md"
                    placeholder="Height"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={Math.round(selectedElement.x)}
                    onChange={(e) => handleUpdateElement(selectedElement.id, { x: parseInt(e.target.value) || 0 })}
                    className="w-1/2 px-3 py-2 border rounded-md"
                    placeholder="X"
                  />
                  <input
                    type="number"
                    value={Math.round(selectedElement.y)}
                    onChange={(e) => handleUpdateElement(selectedElement.id, { y: parseInt(e.target.value) || 0 })}
                    className="w-1/2 px-3 py-2 border rounded-md"
                    placeholder="Y"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rotation
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={Math.round(selectedElement.rotation || 0)}
                    onChange={(e) => handleUpdateElement(selectedElement.id, { rotation: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                  <button
                    onClick={() => handleRotateElement(false)}
                    className="ml-2 p-2 bg-gray-100 hover:bg-gray-200 rounded-md"
                    title="Rotate counter-clockwise"
                  >
                    <RotateCcw size={16} />
                  </button>
                  <button
                    onClick={() => handleRotateElement(true)}
                    className="ml-1 p-2 bg-gray-100 hover:bg-gray-200 rounded-md"
                    title="Rotate clockwise"
                  >
                    <RotateCw size={16} />
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Colors
                </label>
                <div className="flex space-x-2">
                  <div className="w-1/2">
                    <div className="text-xs text-gray-500 mb-1">Fill</div>
                    <input
                      type="color"
                      value={selectedElement.fill}
                      onChange={(e) => handleUpdateElement(selectedElement.id, { fill: e.target.value })}
                      className="w-full h-8 cursor-pointer"
                    />
                  </div>
                  <div className="w-1/2">
                    <div className="text-xs text-gray-500 mb-1">Border</div>
                    <input
                      type="color"
                      value={selectedElement.stroke}
                      onChange={(e) => handleUpdateElement(selectedElement.id, { stroke: e.target.value })}
                      className="w-full h-8 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleDeleteElement}
                className="w-full flex items-center justify-center px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-md mt-4"
              >
                <Trash size={16} className="mr-2" />
                Delete Element
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
