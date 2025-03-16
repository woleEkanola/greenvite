import { useEffect } from 'react'

interface ToastProps {
  message: string
  type: 'success' | 'error'
  onClose: () => void
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 5000)

    return () => clearTimeout(timer)
  }, [onClose])

  const bgColor = type === 'success' ? 'bg-emerald-500' : 'bg-red-500'

  return (
    <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up z-50`}>
      <span className="text-lg">
        {type === 'success' ? '✓' : '✕'}
      </span>
      <p>{message}</p>
      <button 
        onClick={onClose}
        className="ml-4 text-white/80 hover:text-white"
        aria-label="Close"
      >
        ✕
      </button>
    </div>
  )
}
