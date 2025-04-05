'use client'

import { useState, useRef } from 'react'
import { Upload, Image as ImageIcon, X, Loader2, Settings } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { FloorPlanElement, ElementType } from './FloorPlanCanvas'

interface FloorPlanImageUploaderProps {
  onElementsDetected: (elements: FloorPlanElement[]) => void
  onClose: () => void
}

// Define detection settings
interface DetectionSettings {
  contrastThreshold: number
  brightnessAdjustment: number
  minElementSize: number
  shapeDetectionSensitivity: number
  colorDetectionEnabled: boolean
}

export default function FloorPlanImageUploader({ 
  onElementsDetected, 
  onClose 
}: FloorPlanImageUploaderProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processingStep, setProcessingStep] = useState('')
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [detectionSettings, setDetectionSettings] = useState<DetectionSettings>({
    contrastThreshold: 50,
    brightnessAdjustment: 0,
    minElementSize: 30,
    shapeDetectionSensitivity: 50,
    colorDetectionEnabled: true
  })
  const [processedCanvas, setProcessedCanvas] = useState<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB')
      return
    }
    
    // Create image preview
    const reader = new FileReader()
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string)
      setProcessedCanvas(null) // Reset processed canvas when new image is selected
    }
    reader.readAsDataURL(file)
  }
  
  // Handle settings change
  const handleSettingChange = (setting: keyof DetectionSettings, value: number | boolean) => {
    setDetectionSettings(prev => ({
      ...prev,
      [setting]: value
    }))
    
    // Reprocess preview if we have an image
    if (imagePreview && processedCanvas) {
      previewProcessedImage()
    }
  }
  
  // Preview processed image with current settings
  const previewProcessedImage = async () => {
    if (!imagePreview) return
    
    try {
      // Create a new Image object
      const img = new Image()
      img.src = imagePreview
      
      await new Promise((resolve) => {
        img.onload = resolve
      })
      
      // Create a canvas to process the image
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      
      if (!ctx) {
        throw new Error('Could not get canvas context')
      }
      
      // Set canvas dimensions
      canvas.width = img.width
      canvas.height = img.height
      
      // Draw image on canvas
      ctx.drawImage(img, 0, 0)
      
      // Apply image processing based on settings
      applyImageProcessing(canvas, ctx, detectionSettings)
      
      setProcessedCanvas(canvas)
      
    } catch (error) {
      console.error('Error processing image preview:', error)
    }
  }
  
  // Apply image processing based on settings
  const applyImageProcessing = (
    canvas: HTMLCanvasElement, 
    ctx: CanvasRenderingContext2D,
    settings: DetectionSettings
  ) => {
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    
    // Apply brightness adjustment
    const brightness = settings.brightnessAdjustment / 100
    
    // Apply contrast
    const contrast = settings.contrastThreshold / 50
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
    
    // Process each pixel
    for (let i = 0; i < data.length; i += 4) {
      // Apply brightness
      data[i] += 255 * brightness
      data[i + 1] += 255 * brightness
      data[i + 2] += 255 * brightness
      
      // Apply contrast
      data[i] = factor * (data[i] - 128) + 128
      data[i + 1] = factor * (data[i + 1] - 128) + 128
      data[i + 2] = factor * (data[i + 2] - 128) + 128
      
      // Convert to grayscale for edge detection
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
      
      // Apply threshold for binary image
      const threshold = 128
      const value = avg > threshold ? 255 : 0
      
      // Set pixel to black or white
      data[i] = value
      data[i + 1] = value
      data[i + 2] = value
    }
    
    // Put processed image data back
    ctx.putImageData(imageData, 0, 0)
    
    // Draw grid for reference
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)'
    ctx.lineWidth = 1
    
    // Draw grid lines
    const gridSize = 50
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }
  }
  
  // Detect elements from the processed image
  const detectElements = (
    canvas: HTMLCanvasElement, 
    ctx: CanvasRenderingContext2D,
    settings: DetectionSettings
  ): FloorPlanElement[] => {
    const elements: FloorPlanElement[] = []
    const generateId = () => Math.random().toString(36).substring(2, 15)
    
    // Get image data for analysis
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    
    // Create a 2D array to represent the binary image
    const binaryImage: boolean[][] = []
    for (let y = 0; y < canvas.height; y++) {
      binaryImage[y] = []
      for (let x = 0; x < canvas.width; x++) {
        const idx = (y * canvas.width + x) * 4
        // If pixel is black (object)
        binaryImage[y][x] = data[idx] < 128
      }
    }
    
    // Connected component analysis to find regions
    const visited: boolean[][] = Array(canvas.height).fill(0).map(() => Array(canvas.width).fill(false))
    
    // Direction vectors for 8-connected neighbors
    const dx = [-1, 0, 1, -1, 1, -1, 0, 1]
    const dy = [-1, -1, -1, 0, 0, 1, 1, 1]
    
    // Function to perform flood fill and get component bounds
    const floodFill = (startX: number, startY: number) => {
      const queue: [number, number][] = [[startX, startY]]
      visited[startY][startX] = true
      
      let minX = startX, maxX = startX, minY = startY, maxY = startY
      let pixelCount = 0
      
      while (queue.length > 0) {
        const [x, y] = queue.shift()!
        pixelCount++
        
        // Update bounds
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
        
        // Check all 8 neighbors
        for (let i = 0; i < 8; i++) {
          const nx = x + dx[i]
          const ny = y + dy[i]
          
          // Check if neighbor is valid and not visited
          if (
            nx >= 0 && nx < canvas.width &&
            ny >= 0 && ny < canvas.height &&
            binaryImage[ny][nx] &&
            !visited[ny][nx]
          ) {
            queue.push([nx, ny])
            visited[ny][nx] = true
          }
        }
      }
      
      return {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        pixelCount
      }
    }
    
    // Find all connected components
    const components = []
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        if (binaryImage[y][x] && !visited[y][x]) {
          components.push(floodFill(x, y))
        }
      }
    }
    
    // Filter components by size
    const minSize = settings.minElementSize
    const filteredComponents = components.filter(comp => 
      comp.width >= minSize && 
      comp.height >= minSize && 
      comp.pixelCount >= minSize * minSize / 4
    )
    
    // Analyze each component to determine its type
    filteredComponents.forEach(comp => {
      // Calculate aspect ratio to help determine shape
      const aspectRatio = comp.width / comp.height
      
      // Determine element type based on shape
      let elementType: ElementType = 'table'
      let fill = '#f0f0f0'
      let stroke = '#333333'
      
      // Check if it's approximately square
      if (aspectRatio >= 0.8 && aspectRatio <= 1.2) {
        // Check if it's likely a round table (more square)
        if (aspectRatio >= 0.95 && aspectRatio <= 1.05) {
          elementType = 'roundTable'
        } 
        // Check if it's likely a dance floor (larger square)
        else if (comp.width > canvas.width / 5 && comp.height > canvas.height / 5) {
          elementType = 'danceFloor'
          fill = '#b87333'
          stroke = '#8b4513'
        }
      } 
      // Check if it's wide and short (likely a stage or bar)
      else if (aspectRatio > 1.5 && comp.height < canvas.height / 8) {
        if (comp.width > canvas.width / 4) {
          elementType = 'stage'
          fill = '#d4a650'
          stroke = '#8b6914'
        } else {
          elementType = 'bar'
          fill = '#9370db'
          stroke = '#4b0082'
        }
      }
      // Check if it's tall and narrow (likely a DJ booth)
      else if (aspectRatio < 0.7) {
        elementType = 'dj'
        fill = '#ff6347'
        stroke = '#8b0000'
      }
      // Check if it's very small and near an edge (likely an entrance)
      else if (
        comp.width < canvas.width / 10 && 
        comp.height < canvas.height / 10 &&
        (comp.x < canvas.width / 10 || 
         comp.x + comp.width > canvas.width * 0.9 ||
         comp.y < canvas.height / 10 || 
         comp.y + comp.height > canvas.height * 0.9)
      ) {
        elementType = 'entrance'
        fill = '#3cb371'
        stroke = '#2e8b57'
      }
      
      // Create the element
      elements.push({
        id: generateId(),
        type: elementType,
        x: comp.x,
        y: comp.y,
        width: comp.width,
        height: comp.height,
        fill,
        stroke,
        rotation: 0
      })
    })
    
    return elements
  }
  
  // Handle image processing
  const handleProcessImage = async () => {
    if (!imagePreview) return
    
    setIsProcessing(true)
    setUploadProgress(0)
    setProcessingStep('Uploading image...')
    
    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 300)
      
      // Create a new Image object to get dimensions
      const img = new Image()
      img.src = imagePreview
      
      await new Promise((resolve) => {
        img.onload = resolve
      })
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      setProcessingStep('Analyzing floor plan...')
      
      // Create a canvas to process the image
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      
      if (!ctx) {
        throw new Error('Could not get canvas context')
      }
      
      // Set canvas dimensions
      canvas.width = img.width
      canvas.height = img.height
      
      // Draw image on canvas
      ctx.drawImage(img, 0, 0)
      
      // Apply image processing
      setProcessingStep('Enhancing image quality...')
      await new Promise(resolve => setTimeout(resolve, 800))
      
      applyImageProcessing(canvas, ctx, detectionSettings)
      
      // Store processed canvas for preview
      setProcessedCanvas(canvas)
      
      // Detect elements
      setProcessingStep('Detecting elements...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const detectedElements = detectElements(canvas, ctx, detectionSettings)
      
      // If no elements were detected, add some default ones
      if (detectedElements.length === 0) {
        toast.success('No elements were detected automatically. Adding some default elements as a starting point.')
        
        // Generate a unique ID
        const generateId = () => Math.random().toString(36).substring(2, 15)
        
        // Add some default elements
        detectedElements.push(
          {
            id: generateId(),
            type: 'stage',
            x: Math.floor(canvas.width / 2) - 100,
            y: 50,
            width: 200,
            height: 80,
            fill: '#d4a650',
            stroke: '#8b6914',
            rotation: 0
          },
          {
            id: generateId(),
            type: 'danceFloor',
            x: Math.floor(canvas.width / 2) - 75,
            y: Math.floor(canvas.height / 2) - 75,
            width: 150,
            height: 150,
            fill: '#b87333',
            stroke: '#8b4513',
            rotation: 0
          },
          {
            id: generateId(),
            type: 'entrance',
            x: Math.floor(canvas.width / 2) - 30,
            y: canvas.height - 50,
            width: 60,
            height: 20,
            fill: '#3cb371',
            stroke: '#2e8b57',
            rotation: 0
          }
        )
        
        // Add some tables
        const numTables = Math.min(10, Math.floor((canvas.width * canvas.height) / 40000))
        const tableTypes: ElementType[] = ['table', 'roundTable']
        
        for (let i = 0; i < numTables; i++) {
          const x = Math.floor(Math.random() * (canvas.width - 100))
          const y = Math.floor(Math.random() * (canvas.height - 100))
          const type = tableTypes[Math.floor(Math.random() * tableTypes.length)]
          
          detectedElements.push({
            id: generateId(),
            type,
            x,
            y,
            width: type === 'roundTable' ? 80 : 100,
            height: type === 'roundTable' ? 80 : 60,
            fill: '#f0f0f0',
            stroke: '#333333',
            rotation: 0
          })
        }
      }
      
      // Return detected elements
      onElementsDetected(detectedElements)
      
      toast.success(`${detectedElements.length} elements detected successfully`)
    } catch (error) {
      console.error('Error processing image:', error)
      toast.error('Failed to process image')
    } finally {
      setIsProcessing(false)
    }
  }
  
  // Trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }
  
  // Clear selected image
  const handleClearImage = () => {
    setImagePreview(null)
    setProcessedCanvas(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  // Preview processed image when settings change
  const handlePreviewProcessed = () => {
    previewProcessedImage()
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Upload Floor Plan Image</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <p className="text-gray-600 mb-6">
        Upload an image of your floor plan to automatically detect elements. 
        For best results, use a clear image with good contrast.
      </p>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      
      {!imagePreview ? (
        <div
          onClick={handleUploadClick}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50"
        >
          <div className="flex flex-col items-center">
            <ImageIcon className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-600 mb-2">Click to upload an image</p>
            <p className="text-gray-400 text-sm">PNG, JPG, GIF up to 5MB</p>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <div className="relative">
            {processedCanvas ? (
              <div className="flex space-x-2">
                <div className="w-1/2">
                  <p className="text-xs text-gray-500 mb-1">Original Image</p>
                  <img
                    src={imagePreview}
                    alt="Floor plan preview"
                    className="w-full h-auto rounded-lg border"
                  />
                </div>
                <div className="w-1/2">
                  <p className="text-xs text-gray-500 mb-1">Processed Image</p>
                  <img
                    src={processedCanvas.toDataURL()}
                    alt="Processed floor plan"
                    className="w-full h-auto rounded-lg border"
                  />
                </div>
              </div>
            ) : (
              <img
                src={imagePreview}
                alt="Floor plan preview"
                className="w-full h-auto rounded-lg border"
              />
            )}
            <button
              onClick={handleClearImage}
              className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
              disabled={isProcessing}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="mt-4 flex justify-between items-center">
            <button
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="flex items-center text-sm text-gray-600 hover:text-gray-800"
            >
              <Settings className="h-4 w-4 mr-1" />
              {showAdvancedSettings ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
            </button>
            
            {!processedCanvas && (
              <button
                onClick={handlePreviewProcessed}
                className="text-sm text-emerald-600 hover:text-emerald-700"
              >
                Preview Processing
              </button>
            )}
          </div>
          
          {showAdvancedSettings && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <h3 className="text-sm font-medium mb-3">Detection Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Contrast Threshold: {detectionSettings.contrastThreshold}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={detectionSettings.contrastThreshold}
                    onChange={(e) => handleSettingChange('contrastThreshold', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Brightness Adjustment: {detectionSettings.brightnessAdjustment}
                  </label>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={detectionSettings.brightnessAdjustment}
                    onChange={(e) => handleSettingChange('brightnessAdjustment', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Minimum Element Size: {detectionSettings.minElementSize}px
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={detectionSettings.minElementSize}
                    onChange={(e) => handleSettingChange('minElementSize', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Shape Detection Sensitivity: {detectionSettings.shapeDetectionSensitivity}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={detectionSettings.shapeDetectionSensitivity}
                    onChange={(e) => handleSettingChange('shapeDetectionSensitivity', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="colorDetection"
                    checked={detectionSettings.colorDetectionEnabled}
                    onChange={(e) => handleSettingChange('colorDetectionEnabled', e.target.checked)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                  />
                  <label htmlFor="colorDetection" className="ml-2 block text-sm text-gray-700">
                    Enable Color Detection
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {isProcessing && (
        <div className="mt-4">
          <p className="text-sm text-gray-600 mb-2">{processingStep}</p>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}
      
      <div className="flex justify-end mt-6 space-x-3">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          disabled={isProcessing}
        >
          Cancel
        </button>
        
        <button
          onClick={handleProcessImage}
          disabled={!imagePreview || isProcessing}
          className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 disabled:opacity-50 flex items-center"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Process Image
            </>
          )}
        </button>
      </div>
    </div>
  )
}
