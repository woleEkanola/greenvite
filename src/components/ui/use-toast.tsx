import React, { createContext, useContext, useState } from 'react'

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
  icon?: React.ReactNode
}

interface ToastContextType {
  toasts: Toast[]
  toast: (props: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = (props: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, ...props }])
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <div className="fixed bottom-0 right-0 p-4 space-y-4 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`p-4 rounded-md shadow-md ${
              t.variant === 'destructive' ? 'bg-red-100 border-l-4 border-red-500' : 'bg-white border-l-4 border-emerald-500'
            }`}
          >
            <div className="flex items-start">
              {t.icon && <div className="mr-3">{t.icon}</div>}
              <div>
                {t.title && <h4 className="font-medium">{t.title}</h4>}
                {t.description && <p className="text-sm text-gray-500">{t.description}</p>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="ml-auto text-gray-400 hover:text-gray-500"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
