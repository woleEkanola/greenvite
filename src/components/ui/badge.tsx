import React from 'react'

interface BadgeProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  className?: string
  children: React.ReactNode
}

export function Badge({
  variant = 'default',
  className = '',
  children,
}: BadgeProps) {
  const variantStyles = {
    default: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
    secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    destructive: 'bg-red-100 text-red-800 hover:bg-red-200',
    outline: 'border border-gray-200 text-gray-800 hover:bg-gray-100',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
