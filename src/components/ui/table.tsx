import React from 'react'

interface TableProps {
  className?: string
  children: React.ReactNode
}

export function Table({ className = '', children }: TableProps) {
  return (
    <div className="w-full overflow-auto">
      <table className={`w-full caption-bottom text-sm ${className}`}>
        {children}
      </table>
    </div>
  )
}

export function TableHeader({ className = '', children }: TableProps) {
  return (
    <thead className={`border-b bg-gray-50 ${className}`}>
      {children}
    </thead>
  )
}

export function TableBody({ className = '', children }: TableProps) {
  return (
    <tbody className={`divide-y ${className}`}>
      {children}
    </tbody>
  )
}

export function TableFooter({ className = '', children }: TableProps) {
  return (
    <tfoot className={`border-t bg-gray-50 font-medium ${className}`}>
      {children}
    </tfoot>
  )
}

export function TableRow({ className = '', children }: TableProps) {
  return (
    <tr className={`border-b transition-colors hover:bg-gray-50 ${className}`}>
      {children}
    </tr>
  )
}

export function TableHead({ className = '', children }: TableProps) {
  return (
    <th className={`h-12 px-4 text-left align-middle font-medium text-gray-500 ${className}`}>
      {children}
    </th>
  )
}

export function TableCell({ className = '', children }: TableProps) {
  return (
    <td className={`p-4 align-middle ${className}`}>
      {children}
    </td>
  )
}
