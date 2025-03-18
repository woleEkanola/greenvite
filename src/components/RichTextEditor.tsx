'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import 'react-quill/dist/quill.snow.css'

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  height?: number
  disabled?: boolean
}

const RichTextEditor = ({ value, onChange, placeholder = 'Enter your content here...', height = 200, disabled = false }: RichTextEditorProps) => {
  // State to track if the component is mounted (for SSR)
  const [mounted, setMounted] = useState(false)

  // Set mounted to true when component mounts
  useEffect(() => {
    setMounted(true)
  }, [])

  // Define the toolbar options
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean']
    ],
  }

  // Define the formats we want to support
  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet',
    'align',
    'link', 'image'
  ]

  // Custom handler to preserve template variables
  const handleChange = (content: string) => {
    // Process content to preserve template variables
    let processedContent = content
    
    // Check for and preserve template variables like {{name}}, {{code}}, {{link}}
    const templateVars = ['{{name}}', '{{code}}', '{{link}}']
    templateVars.forEach(variable => {
      // Create a regex that matches the variable even if it's wrapped in HTML tags
      const regex = new RegExp(`(<[^>]*>)?${variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(<[^>]*>)?`, 'g')
      processedContent = processedContent.replace(regex, variable)
    })
    
    onChange(processedContent)
  }

  return (
    <div className="rich-text-editor">
      {mounted && (
        <ReactQuill
          theme="snow"
          value={value}
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
        {/* Only show code and link variables if they're likely to be used */}
        If registration code is enabled: <code>{'{{code}}'}</code> - Registration code, <code>{'{{link}}'}</code> - Event link with code
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
