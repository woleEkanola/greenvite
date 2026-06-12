import * as React from 'react'
import { Label } from './label'
import { Input } from './input'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  label?: string
  required?: boolean
  error?: string
  helperText?: string
  children: React.ReactNode
  className?: string
  id?: string
}

export function FormField({ label, required, error, helperText, children, className, id }: FormFieldProps) {
  const childId = id || (React.isValidElement(children) ? (children.props as any).id : undefined)

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label htmlFor={childId} className="flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      {children}
      {helperText && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
      )}
      {error && (
        <p className="text-xs text-red-500 dark:text-red-400" role="alert">{error}</p>
      )}
    </div>
  )
}
