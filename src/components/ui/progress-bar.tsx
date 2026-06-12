import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  max?: number
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  showLabel?: boolean
  label?: string
  className?: string
}

const variantColors = {
  default: 'bg-emerald-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
}

export function ProgressBar({ value, max = 100, variant = 'default', showLabel, label, className }: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div className={cn('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>}
          {showLabel && (
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {value}/{max}
            </span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden dark:bg-gray-800">
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-spring', variantColors[variant])}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  )
}
