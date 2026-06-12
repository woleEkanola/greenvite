'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBannerProps {
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorBanner({ message = 'Something went wrong', onRetry, className = '' }: ErrorBannerProps) {
  return (
    <div className={`flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 ${className}`}>
      <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1 rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
    </div>
  )
}
