import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1 text-sm mb-4', className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <div key={index} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" aria-hidden="true" />
            )}
            {isLast ? (
              <span className="text-gray-900 font-medium truncate dark:text-gray-100" aria-current="page">
                {item.label}
              </span>
            ) : item.href ? (
              <Link
                href={item.href}
                className="text-gray-500 hover:text-gray-700 truncate transition-colors dark:text-gray-400 dark:hover:text-gray-300"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-500 truncate dark:text-gray-400">{item.label}</span>
            )}
          </div>
        )
      })}
    </nav>
  )
}
