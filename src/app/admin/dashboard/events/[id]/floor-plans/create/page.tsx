'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, Settings, Plus, Minus, ImageIcon, Table2, LayoutGrid } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { FloorPlanElement, ElementType } from '@/components/FloorPlanCanvas'
import FloorPlanCanvas from '@/components/FloorPlanCanvas'
import FloorPlanImageUploader from '@/components/FloorPlanImageUploader'
import BatchTableCreator from '@/components/BatchTableCreator'
import SectionCreator from '@/components/SectionCreator'
import Modal from '@/app/components/Modal'

interface ElementOption {
  type: ElementType
  label: string
  defaultWidth: number
  defaultHeight: number
  defaultFill: string
  defaultStroke: string
  icon: React.ReactNode
  shape?: "circle" | "rectangle"
}

export default function CreateFloorPlanPage() {
  const params = useParams()
  const router = useRouter()
  const [elements, setElements] = useState<FloorPlanElement[]>([])
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [canvasWidth, setCanvasWidth] = useState(800)
  const [canvasHeight, setCanvasHeight] = useState(600)
  const [isClient, setIsClient] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showCanvasSettings, setShowCanvasSettings] = useState(false)
  const [customElements, setCustomElements] = useState<ElementOption[]>([])
  const [showCustomElementForm, setShowCustomElementForm] = useState(false)
  const [showImageUploader, setShowImageUploader] = useState(false)
  const [showBatchTableCreator, setShowBatchTableCreator] = useState(false)
  const [showSectionCreator, setShowSectionCreator] = useState(false)
  const [customElementForm, setCustomElementForm] = useState({
    type: '',
    label: '',
    defaultWidth: 100,
    defaultHeight: 100,
    defaultFill: '#cccccc',
    defaultStroke: '#333333'
  })
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    isDefault: false
  })

  // Predefined element options
  const elementOptions: ElementOption[] = [
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
      type: 'roundTable',
      label: 'Round Table',
      defaultWidth: 80,
      defaultHeight: 80,
      defaultFill: '#f0f0f0',
      defaultStroke: '#333333',
      icon: <div className="w-6 h-6 rounded-full border-2 border-gray-600 flex items-center justify-center">T</div>
    },
    {
      type: 'stage',
      label: 'Stage',
      defaultWidth: 200,
      defaultHeight: 100,
      defaultFill: '#d1d5db',
      defaultStroke: '#4b5563',
      icon: <div className="w-6 h-6 bg-gray-200 text-white flex items-center justify-center">S</div>
    },
    {
      type: 'danceFloor',
      label: 'Dance Floor',
      defaultWidth: 150,
      defaultHeight: 150,
      defaultFill: '#fef3c7',
      defaultStroke: '#d97706',
      icon: <div className="w-6 h-6 bg-yellow-200 text-white flex items-center justify-center">D</div>
    },
    {
      type: 'bar',
      label: 'Bar',
      defaultWidth: 150,
      defaultHeight: 50,
      defaultFill: '#bfdbfe',
      defaultStroke: '#3b82f6',
      icon: <div className="w-6 h-6 bg-blue-200 text-white flex items-center justify-center">B</div>
    },
    {
      type: 'entrance',
      label: 'Entrance',
      defaultWidth: 60,
      defaultHeight: 30,
      defaultFill: '#a7f3d0',
      defaultStroke: '#10b981',
      icon: <div className="w-6 h-6 bg-green-200 text-white flex items-center justify-center">E</div>
    },
    {
      type: 'section',
      label: 'Section',
      defaultWidth: 300,
      defaultHeight: 300,
      defaultFill: '#e5e7eb',
      defaultStroke: '#6b7280',
      icon: <div className="w-6 h-6 border-2 border-dashed border-gray-600 flex items-center justify-center">S</div>,
      shape: 'rectangle'
    },
    {
      type: 'section',
      label: 'Circle Section',
      defaultWidth: 300,
      defaultHeight: 300,
      defaultFill: '#e5e7eb',
      defaultStroke: '#6b7280',
      icon: <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center">S</div>,
      shape: 'circle'
    },
    {
      type: 'custom',
      label: 'DJ Booth',
      defaultWidth: 60,
      defaultHeight: 60,
      defaultFill: '#c7d2fe',
      defaultStroke: '#6366f1',
      icon: <div className="w-6 h-6 bg-purple-200 text-white flex items-center justify-center">DJ</div>
    },
    {
      type: 'custom',
      label: 'Band Area',
      defaultWidth: 120,
      defaultHeight: 80,
      defaultFill: '#ddd6fe',
      defaultStroke: '#8b5cf6',
      icon: <div className="w-6 h-6 bg-purple-200 text-white flex items-center justify-center">B</div>
    },
    {
      type: 'custom',
      label: 'Cocktail Station',
      defaultWidth: 80,
      defaultHeight: 80,
      defaultFill: '#fecaca',
      defaultStroke: '#ef4444',
      icon: <div className="w-6 h-6 bg-red-200 text-white flex items-center justify-center">C</div>
    }
  ]

  // Combine default and custom elements
  const allElementOptions = [...elementOptions, ...customElements]

  // Only run on client side
  useEffect(() => {
    setIsClient(true)
    
    // Load custom elements from localStorage if available
    const savedCustomElements = localStorage.getItem('customFloorPlanElements')
    if (savedCustomElements) {
      try {
        const parsedElements = JSON.parse(savedCustomElements)
        setCustomElements(parsedElements.map((el: any) => ({
          ...el,
          icon: <div className="w-6 h-6 bg-gray-500 text-white flex items-center justify-center">{el.label.substring(0, 1)}</div>
        })))
      } catch (e) {
        console.error('Error parsing custom elements:', e)
      }
    }
    
    // Update canvas size
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize)
    }
  }, [])

  // Get selected element
  const selectedElement = elements.find(el => el.id === selectedElementId) || null

  // Add new element
  const handleAddElement = (type: ElementType, options?: Partial<ElementOption>) => {
    const option = allElementOptions.find(opt => {
      if (options && options.label) {
        return opt.type === type && opt.label === options.label
      }
      return opt.type === type
    })
    
    if (!option) return
    
    const id = Date.now().toString()
    const newElement: FloorPlanElement = {
      id,
      type,
      x: canvasWidth / 2 - (options?.defaultWidth || option.defaultWidth) / 2,
      y: canvasHeight / 2 - (options?.defaultHeight || option.defaultHeight) / 2,
      width: options?.defaultWidth || option.defaultWidth,
      height: options?.defaultHeight || option.defaultHeight,
      fill: options?.defaultFill || option.defaultFill,
      stroke: options?.defaultStroke || option.defaultStroke,
      rotation: 0,
      containerId: undefined
    }
    
    // Add shape property for section elements
    if (type === 'section' && options?.shape) {
      if (options.shape === "circle" || options.shape === "rectangle") {
        newElement.shape = options.shape as "circle" | "rectangle";
      }
    }
    
    setElements(prev => [...prev, newElement])
    setSelectedElementId(newElement.id)
  }

  // Delete selected element
  const handleDeleteElement = () => {
    if (!selectedElementId) return
    
    setElements(prev => prev.filter(el => el.id !== selectedElementId))
    setSelectedElementId(null)
  }

  // Rotate selected element
  const handleRotateElement = (clockwise: boolean) => {
    if (!selectedElementId) return
    
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
    setElements(prev => prev.map(el => 
      el.id === id ? { ...el, ...updates } : el
    ))
  }

  // Update canvas size based on container
  const updateCanvasSize = () => {
    const containerWidth = window.innerWidth < 768 ? window.innerWidth - 40 : Math.min(window.innerWidth - 400, 1200)
    setCanvasWidth(containerWidth)
    setCanvasHeight(Math.min(containerWidth * 0.75, 800))
  }

  // Handle form change
  const handleFormChange = (field: string, value: any) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Handle custom element form change
  const handleCustomElementFormChange = (field: string, value: any) => {
    setCustomElementForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Add custom element
  const handleAddCustomElement = () => {
    if (!customElementForm.type || !customElementForm.label) {
      toast.error('Type and label are required')
      return
    }
    
    // Check if type already exists
    if (allElementOptions.some(el => el.type === customElementForm.type)) {
      toast.error('Element type already exists')
      return
    }
    
    const newCustomElement: ElementOption = {
      ...customElementForm,
      type: customElementForm.type as ElementType,
      defaultWidth: Number(customElementForm.defaultWidth),
      defaultHeight: Number(customElementForm.defaultHeight),
      icon: <div className="w-6 h-6 bg-gray-500 text-white flex items-center justify-center">{customElementForm.label.substring(0, 1)}</div>
    }
    
    const updatedCustomElements = [...customElements, newCustomElement]
    setCustomElements(updatedCustomElements)
    
    // Save to localStorage
    localStorage.setItem('customFloorPlanElements', JSON.stringify(updatedCustomElements.map(el => ({
      ...el,
      icon: null // Don't save React elements
    }))))
    
    setShowCustomElementForm(false)
    setCustomElementForm({
      type: '',
      label: '',
      defaultWidth: 100,
      defaultHeight: 100,
      defaultFill: '#cccccc',
      defaultStroke: '#333333'
    })
    
    toast.success('Custom element added')
  }

  // Save floor plan
  const handleSave = async () => {
    // Validate form
    if (!form.name) {
      toast.error('Please enter a name for the floor plan')
      return
    }
    
    if (elements.length === 0) {
      toast.error('Floor plan cannot be empty')
      return
    }
    
    try {
      setSaving(true)
      
      const response = await fetch(`/api/admin/events/${params.id}/floor-plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          layout: JSON.stringify(elements),
          isDefault: form.isDefault
        })
      })
      
      if (response.ok) {
        toast.success('Floor plan created successfully')
        router.push(`/admin/dashboard/events/${params.id}/floor-plans`)
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to save floor plan')
      }
    } catch (error) {
      console.error('Error saving floor plan:', error)
      toast.error('An error occurred while saving the floor plan')
    } finally {
      setSaving(false)
    }
  }

  if (!isClient) {
    return <div className="p-6 bg-gray-100">Loading...</div>
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <button
            onClick={() => router.push(`/admin/dashboard/events/${params.id}/floor-plans`)}
            className="mr-4 p-2 rounded-full hover:bg-gray-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">Create New Floor Plan</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 disabled:opacity-50 flex items-center"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Floor Plan'}
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Canvas</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowSectionCreator(true)}
                  className="p-2 rounded-md hover:bg-gray-100 text-xs flex items-center"
                  title="Create Section"
                >
                  <LayoutGrid className="h-5 w-5 mr-1" />
                  <span className="text-sm">Add Section</span>
                </button>
                <button
                  onClick={() => setShowBatchTableCreator(true)}
                  className="p-2 rounded-md hover:bg-gray-100 flex items-center"
                  title="Batch Create Tables"
                >
                  <Table2 className="h-5 w-5 mr-1" />
                  <span className="text-sm">Batch Tables</span>
                </button>
                <button
                  onClick={() => setShowImageUploader(true)}
                  className="p-2 rounded-md hover:bg-gray-100 flex items-center"
                  title="Upload Floor Plan Image"
                >
                  <ImageIcon className="h-5 w-5 mr-1" />
                  <span className="text-sm">Import Image</span>
                </button>
                <button
                  onClick={() => setShowCanvasSettings(!showCanvasSettings)}
                  className="p-2 rounded-md hover:bg-gray-100"
                  title="Canvas Settings"
                >
                  <Settings className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {showCanvasSettings && (
              <div className="mb-4 p-4 border rounded-md bg-gray-50">
                <h3 className="text-sm font-medium mb-2">Canvas Size</h3>
                <div className="flex space-x-4 mb-4">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Width (px)</label>
                    <div className="flex">
                      <button
                        onClick={() => setCanvasWidth(prev => Math.max(300, prev - 50))}
                        className="px-2 py-1 bg-gray-200 rounded-l-md"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        value={canvasWidth}
                        onChange={(e) => setCanvasWidth(Math.max(300, parseInt(e.target.value) || 300))}
                        className="w-full px-3 py-1 border-y text-center"
                      />
                      <button
                        onClick={() => setCanvasWidth(prev => Math.min(2000, prev + 50))}
                        className="px-2 py-1 bg-gray-200 rounded-r-md"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Height (px)</label>
                    <div className="flex">
                      <button
                        onClick={() => setCanvasHeight(prev => Math.max(200, prev - 50))}
                        className="px-2 py-1 bg-gray-200 rounded-l-md"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        value={canvasHeight}
                        onChange={(e) => setCanvasHeight(Math.max(200, parseInt(e.target.value) || 200))}
                        className="w-full px-3 py-1 border-y text-center"
                      />
                      <button
                        onClick={() => setCanvasHeight(prev => Math.min(1500, prev + 50))}
                        className="px-2 py-1 bg-gray-200 rounded-r-md"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      updateCanvasSize()
                      setShowCanvasSettings(false)
                    }}
                    className="px-3 py-1 text-sm bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Reset to Default
                  </button>
                </div>
              </div>
            )}
            
            <div className="overflow-auto">
              <FloorPlanCanvas
                elements={elements}
                onElementsChange={setElements}
                selectedElement={selectedElementId}
                onSelectElement={setSelectedElementId}
                readOnly={false}
                width={canvasWidth}
                height={canvasHeight}
              />
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <h2 className="text-lg font-medium mb-4">Floor Plan Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., Main Hall Layout"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                  placeholder="Add a description for this floor plan"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={form.isDefault}
                  onChange={(e) => handleFormChange('isDefault', e.target.checked)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-700">
                  Set as default floor plan
                </label>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Elements</h2>
              <button
                onClick={() => setShowCustomElementForm(!showCustomElementForm)}
                className="p-1 rounded-md hover:bg-gray-100 text-xs flex items-center"
              >
                <Plus className="h-3 w-3 mr-1" />
                Custom
              </button>
            </div>
            
            {showCustomElementForm && (
              <div className="mb-4 p-3 border rounded-md bg-gray-50">
                <h3 className="text-sm font-medium mb-2">Add Custom Element</h3>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Type ID</label>
                    <input
                      type="text"
                      value={customElementForm.type}
                      onChange={(e) => handleCustomElementFormChange('type', e.target.value)}
                      className="w-full px-2 py-1 text-sm border rounded-md"
                      placeholder="e.g., customTable"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Label</label>
                    <input
                      type="text"
                      value={customElementForm.label}
                      onChange={(e) => handleCustomElementFormChange('label', e.target.value)}
                      className="w-full px-2 py-1 text-sm border rounded-md"
                      placeholder="e.g., Custom Table"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Width</label>
                      <input
                        type="number"
                        value={customElementForm.defaultWidth}
                        onChange={(e) => handleCustomElementFormChange('defaultWidth', parseInt(e.target.value) || 10)}
                        className="w-full px-2 py-1 text-sm border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Height</label>
                      <input
                        type="number"
                        value={customElementForm.defaultHeight}
                        onChange={(e) => handleCustomElementFormChange('defaultHeight', parseInt(e.target.value) || 10)}
                        className="w-full px-2 py-1 text-sm border rounded-md"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Fill Color</label>
                      <input
                        type="color"
                        value={customElementForm.defaultFill}
                        onChange={(e) => handleCustomElementFormChange('defaultFill', e.target.value)}
                        className="w-full h-8"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Border Color</label>
                      <input
                        type="color"
                        value={customElementForm.defaultStroke}
                        onChange={(e) => handleCustomElementFormChange('defaultStroke', e.target.value)}
                        className="w-full h-8"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-2">
                    <button
                      onClick={() => setShowCustomElementForm(false)}
                      className="px-2 py-1 text-xs border rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddCustomElement}
                      className="px-2 py-1 text-xs bg-emerald-500 text-white rounded-md"
                    >
                      Add Element
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-3 gap-2">
              {allElementOptions.map((option, index) => (
                <button
                  key={`${option.type}-${index}`}
                  onClick={() => handleAddElement(option.type, { label: option.label, shape: option.shape })}
                  className="p-2 rounded-md hover:bg-gray-100 flex flex-col items-center justify-center"
                >
                  {option.icon}
                  <span className="text-xs mt-1">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          {selectedElement && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-lg font-medium mb-4">Element Properties</h2>
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
                      type="range"
                      min="0"
                      max="360"
                      value={Math.round(selectedElement.rotation || 0)}
                      onChange={(e) => handleUpdateElement(selectedElement.id, { rotation: parseInt(e.target.value) || 0 })}
                      className="w-full"
                    />
                    <span className="ml-2 text-sm w-10 text-center">
                      {Math.round(selectedElement.rotation || 0)}°
                    </span>
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
                  Delete Element
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Image Uploader Modal */}
      <Modal isOpen={showImageUploader} onClose={() => setShowImageUploader(false)}>
        <FloorPlanImageUploader 
          onElementsDetected={(detectedElements) => {
            setElements(detectedElements)
            setShowImageUploader(false)
          }}
          onClose={() => setShowImageUploader(false)}
        />
      </Modal>
      
      {/* Batch Table Creator Modal */}
      <Modal isOpen={showBatchTableCreator} onClose={() => setShowBatchTableCreator(false)}>
        <BatchTableCreator 
          onTablesCreated={(tables) => {
            setElements(prev => [...prev, ...tables])
            setShowBatchTableCreator(false)
          }}
          onClose={() => setShowBatchTableCreator(false)}
        />
      </Modal>
      
      {/* Section Creator Modal */}
      <Modal isOpen={showSectionCreator} onClose={() => setShowSectionCreator(false)}>
        <SectionCreator 
          onSectionCreated={(section) => {
            setElements(prev => [...prev, section])
            setShowSectionCreator(false)
          }}
          onClose={() => setShowSectionCreator(false)}
          existingElements={elements}
          onTablesAddedToSection={(sectionId, tables) => {
            const tablesWithContainer = tables.map(table => ({
              ...table,
              containerId: sectionId
            }))
            
            setElements(prev => [...prev, ...tablesWithContainer])
          }}
        />
      </Modal>
    </div>
  )
}
