'use client'

import { useState } from 'react'
import { X, Square, Circle } from 'lucide-react'
import { FloorPlanElement } from './FloorPlanCanvas'
import BatchTableCreator from './BatchTableCreator'

interface SectionCreatorProps {
  onSectionCreated: (section: FloorPlanElement) => void
  onClose: () => void
  existingElements: FloorPlanElement[]
  onTablesAddedToSection?: (sectionId: string, tables: FloorPlanElement[]) => void
}

export default function SectionCreator({ 
  onSectionCreated, 
  onClose, 
  existingElements,
  onTablesAddedToSection
}: SectionCreatorProps) {
  const [sectionName, setSectionName] = useState('Section')
  const [sectionShape, setSectionShape] = useState<'rectangle' | 'circle'>('rectangle')
  const [sectionWidth, setSectionWidth] = useState(300)
  const [sectionHeight, setSectionHeight] = useState(300)
  const [sectionColor, setSectionColor] = useState('#f0f0f0')
  const [borderColor, setBorderColor] = useState('#333333')
  const [showBatchTableCreator, setShowBatchTableCreator] = useState(false)
  const [createdSectionId, setCreatedSectionId] = useState<string | null>(null)
  
  // Handle section creation
  const handleCreateSection = () => {
    const sectionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)
    
    const newSection: FloorPlanElement = {
      id: sectionId,
      type: 'section',
      x: 400 - sectionWidth / 2, // Center in canvas
      y: 300 - sectionHeight / 2,
      width: sectionWidth,
      height: sectionHeight,
      fill: sectionColor,
      stroke: borderColor,
      rotation: 0,
      label: sectionName,
      shape: sectionShape
    }
    
    onSectionCreated(newSection)
    setCreatedSectionId(sectionId)
    
    // If we want to add tables immediately, show the batch table creator
    if (onTablesAddedToSection) {
      setShowBatchTableCreator(true)
    } else {
      onClose()
    }
  }
  
  // Handle tables created for the section
  const handleTablesCreated = (tables: FloorPlanElement[]) => {
    if (onTablesAddedToSection && createdSectionId) {
      onTablesAddedToSection(createdSectionId, tables)
    }
    onClose()
  }
  
  // If showing batch table creator, render that instead
  if (showBatchTableCreator && createdSectionId) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 max-w-2xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add Tables to {sectionName}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <BatchTableCreator 
          onTablesCreated={handleTablesCreated}
          onClose={onClose}
        />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 max-w-xl w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Create Section</h2>
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
            Section Name
          </label>
          <input
            type="text"
            value={sectionName}
            onChange={(e) => setSectionName(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="e.g., VIP Area, Main Hall, etc."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Section Shape
          </label>
          <div className="flex space-x-4">
            <button
              onClick={() => setSectionShape('rectangle')}
              className={`flex-1 py-3 px-4 border rounded-md flex items-center justify-center ${
                sectionShape === 'rectangle' ? 'bg-emerald-50 border-emerald-500' : 'border-gray-300'
              }`}
            >
              <Square className="h-5 w-5 mr-2" />
              Rectangle
            </button>
            <button
              onClick={() => setSectionShape('circle')}
              className={`flex-1 py-3 px-4 border rounded-md flex items-center justify-center ${
                sectionShape === 'circle' ? 'bg-emerald-50 border-emerald-500' : 'border-gray-300'
              }`}
            >
              <Circle className="h-5 w-5 mr-2" />
              Circle
            </button>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Section Size
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Width</label>
              <input
                type="number"
                value={sectionWidth}
                onChange={(e) => setSectionWidth(parseInt(e.target.value) || 300)}
                className="w-full px-3 py-2 border rounded-md"
                min="100"
                max="800"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Height</label>
              <input
                type="number"
                value={sectionHeight}
                onChange={(e) => setSectionHeight(parseInt(e.target.value) || 300)}
                className="w-full px-3 py-2 border rounded-md"
                min="100"
                max="800"
              />
            </div>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Colors
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fill</label>
              <input
                type="color"
                value={sectionColor}
                onChange={(e) => setSectionColor(e.target.value)}
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
        
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="text-sm font-medium text-gray-700 mb-2">About Sections</h3>
          <p className="text-sm text-gray-600">
            Sections are container elements that can group other elements together. 
            When you move or resize a section, all elements inside will move or resize proportionally.
            To add elements to a section, simply place them inside the section boundaries.
          </p>
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
          onClick={handleCreateSection}
          className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600"
        >
          {onTablesAddedToSection ? "Create & Add Tables" : "Create Section"}
        </button>
      </div>
    </div>
  )
}
