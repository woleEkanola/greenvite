'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import 'react-quill/dist/quill.snow.css'

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
  // Track if we're currently editing to prevent unnecessary updates
  const [isEditing, setIsEditing] = useState(false)
  // Reference to the editor instance
  const editorRef = useRef<any>(null)
  
  // Set mounted to true when component mounts
  useEffect(() => {
    setMounted(true)
    
    // Cleanup function
    return () => {
      setMounted(false)
    }
  }, [])
  
  // Handle external value changes only when not actively editing
  useEffect(() => {
    if (mounted && !isEditing) {
      // Preserve template variables in the value
      const preservedValue = preserveTemplateVariables(value)
      
      // Update the editor content if it differs from current value
      if (editorRef.current && editorRef.current.getEditor) {
        const editor = editorRef.current.getEditor()
        const currentContent = editor.root.innerHTML
        
        if (currentContent !== preservedValue) {
          editor.clipboard.dangerouslyPasteHTML(preservedValue)
        }
      }
    }
  }, [value, mounted, isEditing])
  
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
    clipboard: {
      matchVisual: false // Disable the default clipboard matching to improve stability
    }
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
  
  // Function to preserve template variables in content
  const preserveTemplateVariables = (content: string): string => {
    if (!content) return content
    
    const templateVars = ['{{name}}', '{{code}}', '{{link}}', '{{image}}']
    let preservedContent = content
    
    templateVars.forEach(variable => {
      // Case-insensitive replacement to standardize variables
      const regex = new RegExp(`{{\\s*${variable.slice(2, -2)}\\s*}}`, 'gi')
      preservedContent = preservedContent.replace(regex, variable)
    })
    
    return preservedContent
  }
  
  // Handle editor changes
  const handleChange = (content: string) => {
    // Start editing state
    setIsEditing(true)
    
    // Process content to preserve template variables
    const processedContent = preserveTemplateVariables(content)
    
    // Call the onChange prop with processed content
    onChange(processedContent)
    
    // End editing state after a short delay
    setTimeout(() => {
      setIsEditing(false)
    }, 500)
  }
  
  // Handle editor focus
  const handleFocus = () => {
    setIsEditing(true)
  }
  
  // Handle editor blur
  const handleBlur = () => {
    setIsEditing(false)
  }

  return (
    <div className="rich-text-editor">
      {mounted && (
        <ReactQuill
          ref={editorRef}
          theme="snow"
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
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
