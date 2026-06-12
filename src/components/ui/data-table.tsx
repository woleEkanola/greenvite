'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ArrowUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Input } from './input'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from './table'

export interface Column<T> {
  header: string
  accessor: (item: T) => React.ReactNode
  sortable?: boolean
  sortKey?: string
  className?: string
  hideOnMobile?: boolean
  hideOnTablet?: boolean
}

export interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  emptyMessage?: string
  className?: string
  searchable?: boolean
  searchPlaceholder?: string
  itemsPerPage?: number
  serverPagination?: {
    currentPage: number
    totalPages: number
    totalItems: number
    onPageChange: (page: number) => void
  }
  loading?: boolean
  onRowClick?: (item: T) => void
  headerContent?: React.ReactNode
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  emptyMessage = 'No data found',
  className,
  searchable = false,
  searchPlaceholder = 'Search...',
  itemsPerPage = 20,
  serverPagination,
  loading = false,
  onRowClick,
  headerContent,
}: DataTableProps<T>) {
  const [search, setSearch] = React.useState('')
  const [sortField, setSortField] = React.useState<string | null>(null)
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc')
  const [clientPage, setClientPage] = React.useState(1)

  const handleSort = (key: string) => {
    if (sortField === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(key)
      setSortDirection('asc')
    }
  }

  let sortedData = [...data]
  if (sortField) {
    const col = columns.find(c => c.sortKey === sortField)
    if (col) {
      sortedData.sort((a, b) => {
        const aVal = col.accessor(a)
        const bVal = col.accessor(b)
        const aStr = typeof aVal === 'string' ? aVal : String(aVal)
        const bStr = typeof bVal === 'string' ? bVal : String(bVal)
        const cmp = aStr.localeCompare(bStr)
        return sortDirection === 'asc' ? cmp : -cmp
      })
    }
  }

  let filteredData = sortedData
  if (search) {
    const lowerSearch = search.toLowerCase()
    filteredData = sortedData.filter(item =>
      columns.some(col => {
        const val = col.accessor(item)
        return String(val).toLowerCase().includes(lowerSearch)
      })
    )
  }

  const useServerPagination = !!serverPagination
  const currentPage = useServerPagination ? serverPagination!.currentPage : clientPage
  const totalPages = useServerPagination ? serverPagination!.totalPages : Math.ceil(filteredData.length / itemsPerPage)

  const paginatedData = useServerPagination
    ? filteredData
    : filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const startItem = useServerPagination
    ? (currentPage - 1) * itemsPerPage + 1
    : (currentPage - 1) * itemsPerPage + 1
  const endItem = useServerPagination
    ? Math.min(currentPage * itemsPerPage, serverPagination!.totalItems)
    : Math.min(currentPage * itemsPerPage, filteredData.length)
  const totalItems = useServerPagination ? serverPagination!.totalItems : filteredData.length

  const handlePageChange = (page: number) => {
    if (useServerPagination) {
      serverPagination!.onPageChange(page)
    } else {
      setClientPage(page)
    }
  }

  const pageNumbers: number[] = []
  const maxVisible = 5
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
  let endPage = Math.min(totalPages, startPage + maxVisible - 1)
  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1)
  }
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i)
  }

  return (
    <div className={cn('space-y-4', className)}>
      {(searchable || headerContent) && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          {searchable && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  if (!useServerPagination) setClientPage(1)
                }}
                className="pl-10"
              />
            </div>
          )}
          {headerContent && <div className="flex items-center gap-2">{headerContent}</div>}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden" role="region" aria-live="polite" aria-label={`${itemsPerPage} results per page`}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, idx) => (
                <TableHead
                  key={idx}
                  className={cn(
                    col.className,
                    col.sortable && 'cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-300',
                    col.hideOnMobile && 'hidden sm:table-cell',
                    col.hideOnTablet && 'hidden lg:table-cell'
                  )}
                  onClick={col.sortable && col.sortKey ? () => handleSort(col.sortKey!) : undefined}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <span className="text-gray-400">
                        {sortField === col.sortKey ? (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3" />
                        )}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                    <p className="text-sm text-gray-500">Loading...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-12 text-center">
                  <p className="text-sm text-gray-500">{emptyMessage}</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => (
                <TableRow
                  key={item.id}
                  className={onRowClick ? 'cursor-pointer' : ''}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((col, idx) => (
                    <TableCell
                      key={idx}
                      className={cn(
                        col.className,
                        col.hideOnMobile && 'hidden sm:table-cell',
                        col.hideOnTablet && 'hidden lg:table-cell'
                      )}
                    >
                      {col.accessor(item)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {startItem}-{endItem} of {totalItems}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="xs"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            {startPage > 1 && (
              <>
                <Button
                  variant={currentPage === 1 ? 'default' : 'outline'}
                  size="xs"
                  onClick={() => handlePageChange(1)}
                  className={currentPage === 1 ? '' : ''}
                >
                  1
                </Button>
                {startPage > 2 && <span className="px-1 text-gray-400">...</span>}
              </>
            )}
            {pageNumbers.map(page => (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                size="xs"
                onClick={() => handlePageChange(page)}
                className={cn(
                  'min-w-[28px]',
                  currentPage === page && 'bg-emerald-500 text-white hover:bg-emerald-600'
                )}
              >
                {page}
              </Button>
            ))}
            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && <span className="px-1 text-gray-400">...</span>}
                <Button
                  variant={currentPage === totalPages ? 'default' : 'outline'}
                  size="xs"
                  onClick={() => handlePageChange(totalPages)}
                >
                  {totalPages}
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="xs"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
