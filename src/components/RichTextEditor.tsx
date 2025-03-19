'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import 'react-quill/dist/quill.snow.css'
import { debounce } from 'lodash'

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { 
  ssr: false,
  loading: () => <div className="border rounded-md p-4 animate-pulse h-48 bg-gray-50" />
})

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  height?: number
  disabled?: boolean
  showImageVariable?: boolean
  simpleMode?: boolean
}

const RichTextEditor = ({ 
  value, 
  onChange, 
  placeholder = 'Enter your content here...', 
  height = 200, 
  disabled = false,
  showImageVariable = true,
  simpleMode = false
}: RichTextEditorProps) => {
  // State to track if the component is mounted (for SSR)
  const [mounted, setMounted] = useState(false)
  // Local state to avoid re-renders during typing
  const [localValue, setLocalValue] = useState(value)

  // Set mounted to true when component mounts
  useEffect(() => {
    setMounted(true)
  }, [])

  // Update local value when prop value changes
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Define the toolbar options - simplified for better performance
  const modules = {
    toolbar: simpleMode 
      ? [
          ['bold', 'italic', 'underline'],
          ['link'],
          ['clean']
        ]
      : [
          [{ 'header': [1, 2, false] }],
          ['bold', 'italic', 'underline'],
          [{ 'list': 'ordered' }, { 'list': 'bullet' }],
          ['link'],
          ['clean']
        ],
  }

  // Define the formats we want to support - reduced for better performance
  const formats = simpleMode
    ? ['bold', 'italic', 'underline', 'link']
    : [
        'header',
        'bold', 'italic', 'underline',
        'list', 'bullet',
        'link'
      ]

  // Debounce the onChange to prevent excessive updates
  const debouncedOnChange = useCallback(
    debounce((content: string) => {
      // Process content to preserve template variables
      let processedContent = content
      
      // Check for and preserve template variables like {{name}}, {{code}}, {{link}}
      const templateVars = ['{{name}}', '{{code}}', '{{link}}', '{{image}}']
      templateVars.forEach(variable => {
        // Create a regex that matches the variable even if it's wrapped in HTML tags
        const regex = new RegExp(`(<[^>]*>)?${variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(<[^>]*>)?`, 'g')
        processedContent = processedContent.replace(regex, variable)
      })
      
      onChange(processedContent)
    }, 300),
    [onChange]
  )

  // Handle local updates immediately for responsive UI
  const handleChange = (content: string) => {
    setLocalValue(content)
    debouncedOnChange(content)
  }

  return (
    <div className="rich-text-editor">
      {mounted && (
        <ReactQuill
          theme="snow"
          value={localValue}
          onChange={handleChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          style={{ height: height, marginBottom: '40px' }}
          readOnly={disabled}
        />
      )}
      <div className="text-xs text-gray-500 pt-[50px]">
        <strong>Available template variables:</strong> <code>{'{{name}}'}</code> - Recipient&apos;s name
        <br />
        <code>{'{{code}}'}</code> - Registration code, <code>{'{{link}}'}</code> - Event link with code
        {showImageVariable && (
          <>
            <br />
            <code>{'{{image}}'}</code> - Insert the uploaded invitation image
          </>
        )}
      </div>
      <style jsx>{`
        .rich-text-editor :global(.ql-editor) {
          min-height: ${height - 42}px;
        }
      `}</style>
    </div>
  )
}

export default RichTextEditor
