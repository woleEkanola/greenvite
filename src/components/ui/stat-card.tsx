import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  trend?: {
    value: number
    label: string
  }
  icon?: React.ReactNode
  className?: string
}

export function StatCard({ title, value, description, trend, icon, className }: StatCardProps) {
  const trendColor = trend && trend.value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
  const trendIcon = trend && trend.value >= 0 ? '↑' : '↓'

  return (
    <div className={cn(
      'rounded-lg border border-gray-200 bg-white p-6 shadow-card dark:border-gray-800 dark:bg-gray-900',
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{value}</p>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
        {icon && (
          <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-1">
          <span className={cn('text-sm font-medium', trendColor)}>
            {trendIcon}{Math.abs(trend.value)}%
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{trend.label}</span>
        </div>
      )}
    </div>
  )
}
