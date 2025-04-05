'use client'

import { useRef, useEffect, useState } from 'react'

export type ElementType = 
  | 'table' 
  | 'roundTable' 
  | 'stage' 
  | 'entrance' 
  | 'danceFloor' 
  | 'bar' 
  | 'custom'
  | 'section'
  | 'dj'
  | 'band'
  | 'cocktail'

export interface FloorPlanElement {
  id: string
  type: ElementType
  x: number
  y: number
  width: number
  height: number
  fill: string
  stroke: string
  rotation: number
  label?: string
  capacity?: number
  number?: number
  containerId?: string
  childIds?: string[]
  shape?: 'rectangle' | 'circle'
}

interface FloorPlanCanvasProps {
  elements: FloorPlanElement[]
  onElementsChange: (elements: FloorPlanElement[]) => void
  selectedElement: string | null
  onSelectElement: (id: string | null) => void
  readOnly?: boolean
  width: number
  height: number
}

export default function FloorPlanCanvas({ 
  elements, 
  onElementsChange, 
  selectedElement: selectedElementId, 
  onSelectElement, 
  readOnly = false,
  width = 800,
  height = 600
}: FloorPlanCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragStartY, setDragStartY] = useState(0)
  const [dragElementStartX, setDragElementStartX] = useState(0)
  const [dragElementStartY, setDragElementStartY] = useState(0)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null)
  const [resizeStartX, setResizeStartX] = useState(0)
  const [resizeStartY, setResizeStartY] = useState(0)
  const [resizedElementInitialSize, setResizedElementInitialSize] = useState({ width: 0, height: 0 })
  const [hoveredElement, setHoveredElement] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [oldContainerState, setOldContainerState] = useState<FloorPlanElement | null>(null)

  // Grid settings
  const gridSize = 20
  const gridColor = '#e5e5e5'
  
  // Draw the canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw grid
    drawGrid(ctx)
    
    // Draw elements
    elements.forEach(element => {
      drawElement(ctx, element, element.id === selectedElementId, element.id === hoveredElement, scale, offsetX, offsetY)
    })
    
    // Draw selection handles if an element is selected
    if (selectedElementId && !readOnly) {
      const element = elements.find(el => el.id === selectedElementId)
      if (element) {
        drawSelectionHandles(ctx, element, scale, offsetX, offsetY)
      }
    }
  }, [elements, selectedElementId, hoveredElement, width, height, readOnly, scale, offsetX, offsetY])
  
  // Draw grid
  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = gridColor
    ctx.lineWidth = 0.5
    
    // Draw vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    
    // Draw horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
  }
  
  // Draw a single element
  const drawElement = (
    ctx: CanvasRenderingContext2D, 
    element: FloorPlanElement, 
    isSelected: boolean,
    isHovered: boolean,
    scale: number,
    offsetX: number,
    offsetY: number
  ) => {
    ctx.save()
  
    // Apply transformations
    const centerX = element.x + element.width / 2
    const centerY = element.y + element.height / 2
  
    ctx.translate(centerX * scale + offsetX, centerY * scale + offsetY)
    ctx.rotate((element.rotation * Math.PI) / 180)
    ctx.translate(-centerX * scale - offsetX, -centerY * scale - offsetY)
  
    // Set styles
    ctx.fillStyle = element.fill
    ctx.strokeStyle = isSelected ? '#3b82f6' : isHovered ? '#60a5fa' : element.stroke
    ctx.lineWidth = isSelected || isHovered ? 2 : 1

    // Draw the element based on its type
    const x = element.x * scale + offsetX
    const y = element.y * scale + offsetY
    const width = element.width * scale
    const height = element.height * scale
  
    // Draw different element types
    switch (element.type) {
      case 'section':
        if (element.shape === 'circle') {
          const radius = Math.min(width, height) / 2
          ctx.beginPath()
          ctx.arc(x + width / 2, y + height / 2, radius, 0, Math.PI * 2)
          ctx.globalAlpha = 0.2 // Make sections more transparent
          ctx.fill()
          ctx.globalAlpha = 1
          ctx.stroke()
          
          // Draw label
          if (element.label) {
            ctx.fillStyle = '#000000'
            ctx.font = '12px Arial'
            ctx.textAlign = 'center'
            ctx.fillText(element.label, x + width / 2, y + height / 2)
          }
        } else {
          // Default to rectangle
          ctx.beginPath()
          ctx.rect(x, y, width, height)
          ctx.globalAlpha = 0.2 // Make sections more transparent
          ctx.fill()
          ctx.globalAlpha = 1
          ctx.stroke()
          
          // Draw label
          if (element.label) {
            ctx.fillStyle = '#000000'
            ctx.font = '12px Arial'
            ctx.textAlign = 'center'
            ctx.fillText(element.label, x + width / 2, y + height / 2)
          }
        }
        break;
      case 'roundTable':
        // Draw a circle
        const radius = Math.min(width, height) / 2
        ctx.beginPath()
        ctx.arc(x + width / 2, y + height / 2, radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        
        // Draw element type label
        ctx.fillStyle = '#000000'
        ctx.font = '12px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        
        // Truncate text if too long
        let displayText = element.label || element.type.charAt(0).toUpperCase() + element.type.slice(1)
        if (displayText.length > 10) {
          displayText = displayText.substring(0, 10) + '...'
        }
        
        ctx.fillText(displayText, x + width / 2, y + height / 2)
        break
      default:
        // Draw a rectangle
        ctx.beginPath()
        ctx.rect(x, y, width, height)
        ctx.fill()
        ctx.stroke()
        
        // Draw element type label
        ctx.fillStyle = '#000000'
        ctx.font = '12px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        
        // Truncate text if too long
        let elementText = element.label || element.type.charAt(0).toUpperCase() + element.type.slice(1)
        if (elementText.length > 10) {
          elementText = elementText.substring(0, 10) + '...'
        }
        
        ctx.fillText(elementText, x + width / 2, y + height / 2)
        break
    }
    
    // Restore the context
    ctx.restore()
  }
  
  // Draw selection handles
  const drawSelectionHandles = (ctx: CanvasRenderingContext2D, element: FloorPlanElement, scale: number, offsetX: number, offsetY: number) => {
    const { x, y, width: elementWidth, height: elementHeight, rotation = 0 } = element
    const handleSize = 8
    
    // Save the current state
    ctx.save()
    
    // Move to the center of the element for rotation
    ctx.translate(x * scale + offsetX + elementWidth * scale / 2, y * scale + offsetY + elementHeight * scale / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    
    // Draw handles
    ctx.fillStyle = '#3b82f6'
    
    // Top-left handle
    ctx.fillRect(-elementWidth * scale / 2 - handleSize / 2, -elementHeight * scale / 2 - handleSize / 2, handleSize, handleSize)
    
    // Top-right handle
    ctx.fillRect(elementWidth * scale / 2 - handleSize / 2, -elementHeight * scale / 2 - handleSize / 2, handleSize, handleSize)
    
    // Bottom-left handle
    ctx.fillRect(-elementWidth * scale / 2 - handleSize / 2, elementHeight * scale / 2 - handleSize / 2, handleSize, handleSize)
    
    // Bottom-right handle
    ctx.fillRect(elementWidth * scale / 2 - handleSize / 2, elementHeight * scale / 2 - handleSize / 2, handleSize, handleSize)
    
    // Restore the context
    ctx.restore()
  }
  
  // Function to check if an element is inside a container
  const isElementInContainer = (element: FloorPlanElement, container: FloorPlanElement): boolean => {
    // Skip if the element is the container itself
    if (element.id === container.id) return false
    
    // For circle containers
    if (container.shape === 'circle') {
      const containerCenterX = container.x + container.width / 2
      const containerCenterY = container.y + container.height / 2
      const containerRadius = Math.min(container.width, container.height) / 2
    
      const elementCenterX = element.x + element.width / 2
      const elementCenterY = element.y + element.height / 2
    
      // Calculate distance between centers
      const distance = Math.sqrt(
        Math.pow(elementCenterX - containerCenterX, 2) + 
        Math.pow(elementCenterY - containerCenterY, 2)
      )
    
      // Element is inside if its center is within the container radius
      return distance <= containerRadius - Math.min(element.width, element.height) / 2
    }
  
    // For rectangle containers (default)
    const padding = 2 // Small padding to ensure elements are fully inside
    return (
      element.x >= container.x + padding &&
      element.y >= container.y + padding &&
      element.x + element.width <= container.x + container.width - padding &&
      element.y + element.height <= container.y + container.height - padding
    )
  }

  // Function to update child elements when a container is moved or resized
  const updateChildElements = (
    container: FloorPlanElement,
    oldContainer: FloorPlanElement,
    elements: FloorPlanElement[]
  ): FloorPlanElement[] => {
    // Find all elements that are children of this container
    const childElements = elements.filter(el => 
      el.containerId === container.id || 
      (el.containerId === undefined && isElementInContainer(el, oldContainer))
    )
    
    if (childElements.length === 0) {
      return elements
    }
    
    const scaleX = container.width / oldContainer.width
    const scaleY = container.height / oldContainer.height
    const deltaX = container.x - oldContainer.x
    const deltaY = container.y - oldContainer.y
    
    return elements.map(element => {
      // Skip the container itself
      if (element.id === container.id) return element
      
      // Check if this element is a child of the container
      if (element.containerId === container.id || 
          (element.containerId === undefined && isElementInContainer(element, oldContainer))) {
        // Calculate new position and size relative to container
        const relativeX = (element.x - oldContainer.x) / oldContainer.width
        const relativeY = (element.y - oldContainer.y) / oldContainer.height
        const relativeWidth = element.width / oldContainer.width
        const relativeHeight = element.height / oldContainer.height
        
        return {
          ...element,
          x: container.x + relativeX * container.width,
          y: container.y + relativeY * container.height,
          width: relativeWidth * container.width,
          height: relativeHeight * container.height,
          containerId: container.id // Ensure the containerId is set
        }
      }
      return element
    })
  }

  // Check if a point is inside an element
  const isPointInElement = (
    x: number,
    y: number,
    element: FloorPlanElement
  ): boolean => {
    // For circle shapes
    if (element.type === 'roundTable' || (element.type === 'section' && element.shape === 'circle')) {
      const centerX = element.x + element.width / 2
      const centerY = element.y + element.height / 2
      const radius = Math.min(element.width, element.height) / 2
      
      const distance = Math.sqrt(
        Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
      )
      
      return distance <= radius
    }
    
    // For rectangle shapes
    return (
      x >= element.x &&
      x <= element.x + element.width &&
      y >= element.y &&
      y <= element.y + element.height
    )
  }

  // Handle mouse down
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return
    
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const mouseX = (e.clientX - rect.left - offsetX) / scale
    const mouseY = (e.clientY - rect.top - offsetY) / scale
    
    // Check if we clicked on an element (in reverse order to get the top-most element)
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i]
      if (isPointInElement(mouseX, mouseY, element)) {
        setIsDragging(true)
        setDragStartX(mouseX)
        setDragStartY(mouseY)
        setDragElementStartX(element.x)
        setDragElementStartY(element.y)
        onSelectElement(element.id)
        
        // If this is a container, store its current state for later comparison
        if (element.type === 'section') {
          setOldContainerState({ ...element })
        }
        
        return
      }
    }
    
    // If we didn't click on any element, deselect
    onSelectElement(null)
  }

  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const mouseX = (e.clientX - rect.left - offsetX) / scale
    const mouseY = (e.clientY - rect.top - offsetY) / scale
    
    // Handle resizing
    if (isResizing && selectedElementId && resizeHandle) {
      const element = elements.find(el => el.id === selectedElementId)
      if (element) {
        const deltaX = mouseX - resizeStartX
        const deltaY = mouseY - resizeStartY
        
        // Calculate new size based on the resize handle
        let newWidth = resizedElementInitialSize.width
        let newHeight = resizedElementInitialSize.height
        let newX = element.x
        let newY = element.y
        
        switch (resizeHandle) {
          case 'tl':
            newWidth = resizedElementInitialSize.width - deltaX
            newHeight = resizedElementInitialSize.height - deltaY
            newX = element.x + deltaX
            newY = element.y + deltaY
            break
          case 'tr':
            newWidth = resizedElementInitialSize.width + deltaX
            newHeight = resizedElementInitialSize.height - deltaY
            newY = element.y + deltaY
            break
          case 'bl':
            newWidth = resizedElementInitialSize.width - deltaX
            newHeight = resizedElementInitialSize.height + deltaY
            newX = element.x + deltaX
            break
          case 'br':
            newWidth = resizedElementInitialSize.width + deltaX
            newHeight = resizedElementInitialSize.height + deltaY
            break
        }
        
        // Ensure minimum size
        newWidth = Math.max(20, newWidth)
        newHeight = Math.max(20, newHeight)
        
        // Update the element
        const updatedElements = elements.map(el => {
          if (el.id === element.id) {
            return { ...el, x: newX, y: newY, width: newWidth, height: newHeight }
          }
          return el
        })
        
        onElementsChange(updatedElements)
      }
    }
    // Handle dragging
    else if (isDragging && selectedElementId) {
      const deltaX = mouseX - dragStartX
      const deltaY = mouseY - dragStartY
      
      // Calculate new position
      let newX = dragElementStartX + deltaX
      let newY = dragElementStartY + deltaY
      
      // Snap to grid if not holding Shift
      if (!e.shiftKey) {
        newX = Math.round(newX / gridSize) * gridSize
        newY = Math.round(newY / gridSize) * gridSize
      }
      
      // Update the element
      const updatedElements = elements.map(el => {
        if (el.id === selectedElementId) {
          return { ...el, x: newX, y: newY }
        }
        return el
      })
      
      onElementsChange(updatedElements)
    }
    // Update hovered element
    else {
      let hoveredId = null
      
      // Check if mouse is over an element
      for (let i = elements.length - 1; i >= 0; i--) {
        const element = elements[i]
        if (isPointInElement(mouseX, mouseY, element)) {
          hoveredId = element.id
          break
        }
      }
      
      setHoveredElement(hoveredId)
    }
  }
  
  // Handle mouse up
  const handleMouseUp = () => {
    setIsDragging(false)
    setIsResizing(false)
    
    // If we were dragging or resizing a container, update its child elements
    if (selectedElementId && oldContainerState) {
      const selectedElement = elements.find(el => el.id === selectedElementId)
      if (selectedElement && selectedElement.type === 'section') {
        const updatedElements = updateChildElements(
          selectedElement,
          oldContainerState,
          elements
        )
        onElementsChange(updatedElements)
        setOldContainerState(null)
      }
    }
  }

  // Add an element to a container
  const addElementToContainer = (elementId: string, containerId: string) => {
    const updatedElements = elements.map(el => {
      if (el.id === containerId) {
        return {
          ...el,
          childIds: [...(el.childIds || []), elementId]
        }
      }
      if (el.id === elementId) {
        return {
          ...el,
          containerId
        }
      }
      return el
    })
    
    onElementsChange(updatedElements)
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="border border-gray-300 bg-white"
      style={{ touchAction: 'none' }}
    />
  )
}
