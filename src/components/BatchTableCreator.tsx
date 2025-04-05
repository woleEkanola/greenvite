'use client'

import { useState } from 'react'
import { Plus, Minus, X } from 'lucide-react'
import { FloorPlanElement, ElementType } from './FloorPlanCanvas'

interface BatchTableCreatorProps {
  onTablesCreated: (tables: FloorPlanElement[]) => void
  onClose: () => void
}

export default function BatchTableCreator({ onTablesCreated, onClose }: BatchTableCreatorProps) {
  const [tableType, setTableType] = useState<'table' | 'roundTable'>('roundTable')
  const [tableCount, setTableCount] = useState(10)
  const [startNumber, setStartNumber] = useState(1)
  const [capacity, setCapacity] = useState(8)
  const [tableWidth, setTableWidth] = useState(80)
  const [tableHeight, setTableHeight] = useState(80)
  const [tableColor, setTableColor] = useState('#f0f0f0')
  const [borderColor, setBorderColor] = useState('#333333')
  const [arrangement, setArrangement] = useState<'grid' | 'circle' | 'rows'>('grid')
  const [spacing, setSpacing] = useState(40)
  const [prefix, setPrefix] = useState('Table')
  
  // Handle table count change
  const handleTableCountChange = (value: number) => {
    setTableCount(Math.max(1, Math.min(100, value)))
  }
  
  // Handle capacity change
  const handleCapacityChange = (value: number) => {
    setCapacity(Math.max(1, Math.min(20, value)))
  }
  
  // Handle spacing change
  const handleSpacingChange = (value: number) => {
    setSpacing(Math.max(10, Math.min(200, value)))
  }
  
  // Generate tables
  const handleGenerateTables = () => {
    const tables: FloorPlanElement[] = []
    const generateId = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)
    
    // Calculate positions based on arrangement
    const positions = calculatePositions(
      tableCount,
      tableWidth,
      tableHeight,
      arrangement,
      spacing
    )
    
    // Create tables
    for (let i = 0; i < tableCount; i++) {
      const tableNumber = startNumber + i
      const position = positions[i]
      
      tables.push({
        id: generateId(),
        type: tableType,
        x: position.x,
        y: position.y,
        width: tableWidth,
        height: tableHeight,
        fill: tableColor,
        stroke: borderColor,
        rotation: 0,
        // Add custom properties for tables
        label: `${prefix} ${tableNumber}`,
        capacity: capacity,
        number: tableNumber
      } as FloorPlanElement)
    }
    
    onTablesCreated(tables)
    onClose()
  }
  
  // Calculate positions based on arrangement
  const calculatePositions = (
    count: number,
    width: number,
    height: number,
    arrangement: 'grid' | 'circle' | 'rows',
    spacing: number
  ) => {
    const positions: { x: number, y: number }[] = []
    
    switch (arrangement) {
      case 'grid': {
        // Calculate grid dimensions
        const itemsPerRow = Math.ceil(Math.sqrt(count))
        const rowCount = Math.ceil(count / itemsPerRow)
        
        // Calculate total width and height
        const totalWidth = itemsPerRow * (width + spacing) - spacing
        const totalHeight = rowCount * (height + spacing) - spacing
        
        // Calculate starting position (centered)
        const startX = 400 - totalWidth / 2
        const startY = 300 - totalHeight / 2
        
        // Create grid
        for (let row = 0; row < rowCount; row++) {
          for (let col = 0; col < itemsPerRow; col++) {
            const index = row * itemsPerRow + col
            if (index < count) {
              positions.push({
                x: startX + col * (width + spacing),
                y: startY + row * (height + spacing)
              })
            }
          }
        }
        break
      }
      
      case 'circle': {
        // Calculate circle radius
        const radius = Math.max(count * (width + spacing) / (2 * Math.PI), 150)
        
        // Calculate center position
        const centerX = 400
        const centerY = 300
        
        // Create circle
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * 2 * Math.PI
          positions.push({
            x: centerX + radius * Math.cos(angle) - width / 2,
            y: centerY + radius * Math.sin(angle) - height / 2
          })
        }
        break
      }
      
      case 'rows': {
        // Calculate rows (2 rows by default)
        const rowCount = 2
        const itemsPerRow = Math.ceil(count / rowCount)
        
        // Calculate total width and height
        const totalWidth = itemsPerRow * (width + spacing) - spacing
        
        // Calculate starting position (centered)
        const startX = 400 - totalWidth / 2
        const startY = 200
        
        // Create rows
        for (let row = 0; row < rowCount; row++) {
          for (let col = 0; col < itemsPerRow; col++) {
            const index = row * itemsPerRow + col
            if (index < count) {
              positions.push({
                x: startX + col * (width + spacing),
                y: startY + row * (height + spacing + 50)
              })
            }
          }
        }
        break
      }
    }
    
    return positions
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 max-w-2xl w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Batch Create Tables</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-md font-medium mb-3">Table Properties</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Table Type
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={() => setTableType('roundTable')}
                  className={`flex-1 py-2 px-3 border rounded-md flex items-center justify-center ${
                    tableType === 'roundTable' ? 'bg-emerald-50 border-emerald-500' : 'border-gray-300'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full border-2 border-gray-600 flex items-center justify-center mr-2">
                    T
                  </div>
                  Round Table
                </button>
                <button
                  onClick={() => setTableType('table')}
                  className={`flex-1 py-2 px-3 border rounded-md flex items-center justify-center ${
                    tableType === 'table' ? 'bg-emerald-50 border-emerald-500' : 'border-gray-300'
                  }`}
                >
                  <div className="w-6 h-6 border-2 border-gray-600 flex items-center justify-center mr-2">
                    T
                  </div>
                  Rectangle Table
                </button>
              </div>
            </div>
            
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
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacity per Table
              </label>
              <div className="flex">
                <button
                  onClick={() => handleCapacityChange(capacity - 1)}
                  className="px-3 py-2 border rounded-l-md bg-gray-100"
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
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Table Size
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Width</label>
                  <input
                    type="number"
                    value={tableWidth}
                    onChange={(e) => setTableWidth(parseInt(e.target.value) || 80)}
                    className="w-full px-3 py-2 border rounded-md"
                    min="40"
                    max="200"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Height</label>
                  <input
                    type="number"
                    value={tableHeight}
                    onChange={(e) => setTableHeight(parseInt(e.target.value) || 80)}
                    className="w-full px-3 py-2 border rounded-md"
                    min="40"
                    max="200"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Colors
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fill</label>
                  <input
                    type="color"
                    value={tableColor}
                    onChange={(e) => setTableColor(e.target.value)}
                    className="w-full h-10"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Border</label>
                  <input
                    type="color"
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
                    className="w-full h-10"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-md font-medium mb-3">Arrangement</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Tables
              </label>
              <div className="flex">
                <button
                  onClick={() => handleTableCountChange(tableCount - 1)}
                  className="px-3 py-2 border rounded-l-md bg-gray-100"
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
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Layout Pattern
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setArrangement('grid')}
                  className={`p-3 border rounded-md flex flex-col items-center ${
                    arrangement === 'grid' ? 'bg-emerald-50 border-emerald-500' : 'border-gray-300'
                  }`}
                >
                  <div className="w-16 h-16 grid grid-cols-3 gap-1 mb-1">
                    {[...Array(9)].map((_, i) => (
                      <div key={i} className="bg-gray-300 rounded-sm"></div>
                    ))}
                  </div>
                  <span className="text-xs">Grid</span>
                </button>
                <button
                  onClick={() => setArrangement('circle')}
                  className={`p-3 border rounded-md flex flex-col items-center ${
                    arrangement === 'circle' ? 'bg-emerald-50 border-emerald-500' : 'border-gray-300'
                  }`}
                >
                  <div className="w-16 h-16 relative mb-1">
                    <div className="absolute inset-0 border-2 border-gray-300 rounded-full"></div>
                    {[...Array(8)].map((_, i) => {
                      const angle = (i / 8) * 2 * Math.PI
                      const x = 8 + 6 * Math.cos(angle)
                      const y = 8 + 6 * Math.sin(angle)
                      return (
                        <div 
                          key={i} 
                          className="absolute w-2 h-2 bg-gray-500 rounded-full"
                          style={{ 
                            left: `${x}px`, 
                            top: `${y}px`,
                            transform: 'translate(-50%, -50%)'
                          }}
                        ></div>
                      )
                    })}
                  </div>
                  <span className="text-xs">Circle</span>
                </button>
                <button
                  onClick={() => setArrangement('rows')}
                  className={`p-3 border rounded-md flex flex-col items-center ${
                    arrangement === 'rows' ? 'bg-emerald-50 border-emerald-500' : 'border-gray-300'
                  }`}
                >
                  <div className="w-16 h-16 flex flex-col justify-center gap-4 mb-1">
                    <div className="flex justify-center gap-1">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="w-2 h-2 bg-gray-500 rounded-sm"></div>
                      ))}
                    </div>
                    <div className="flex justify-center gap-1">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="w-2 h-2 bg-gray-500 rounded-sm"></div>
                      ))}
                    </div>
                  </div>
                  <span className="text-xs">Rows</span>
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Spacing Between Tables
              </label>
              <div className="flex">
                <button
                  onClick={() => handleSpacingChange(spacing - 10)}
                  className="px-3 py-2 border rounded-l-md bg-gray-100"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  value={spacing}
                  onChange={(e) => handleSpacingChange(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border-y text-center"
                  min="10"
                  max="200"
                  step="10"
                />
                <button
                  onClick={() => handleSpacingChange(spacing + 10)}
                  className="px-3 py-2 border rounded-r-md bg-gray-100"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="mt-8">
              <div className="p-4 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">
                  This will create <span className="font-medium">{tableCount}</span> tables with <span className="font-medium">{capacity}</span> seats each, 
                  arranged in a <span className="font-medium">{arrangement}</span> pattern.
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Total capacity: <span className="font-medium">{tableCount * capacity}</span> guests
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end mt-6 space-x-3">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleGenerateTables}
          className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600"
        >
          Create Tables
        </button>
      </div>
    </div>
  )
}
