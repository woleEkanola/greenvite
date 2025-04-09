import React, { ReactNode } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  size?: 'small' | 'medium' | 'large' | 'xlarge'
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, size = 'medium' }) => {
  if (!isOpen) return null

  const sizeClasses = {
    small: 'max-w-sm',
    medium: 'max-w-md',
    large: 'max-w-2xl',
    xlarge: 'max-w-[80%] max-h-[80vh]'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className={`bg-white rounded-lg p-6 w-full ${sizeClasses[size]} overflow-auto`}>
        <button 
          onClick={onClose} 
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
          aria-label="Close"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  )
}

export default Modal
