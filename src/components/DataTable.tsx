import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

interface DataTableProps<T> {
  data: T[];
  columns: {
    header: string;
    accessor: keyof T | ((item: T) => React.ReactNode);
    searchable?: boolean;
  }[];
  itemsPerPage?: number;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  customHeader?: React.ReactNode;
  useServerPagination?: boolean;
  serverPaginationInfo?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    onPageChange: (page: number) => void;
  };
}

export default function DataTable<T>({
  data,
  columns,
  itemsPerPage = 10,
  searchPlaceholder = "Search...",
  emptyMessage = "No data available",
  className = "",
  customHeader,
  useServerPagination = false,
  serverPaginationInfo,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredData, setFilteredData] = useState<T[]>(data);

  // Update filtered data when search term or data changes
  useEffect(() => {
    if (!useServerPagination) {
      if (searchTerm.trim() === '') {
        setFilteredData(data);
      } else {
        // Create a stable reference to searchable columns
        const searchableColumns = columns.filter(column => column.searchable !== false);
        
        const filtered = data.filter(item => {
          return searchableColumns.some(column => {
            if (typeof column.accessor === 'function') {
              // Skip function accessors for searching
              return false;
            }
            
            const value = item[column.accessor as keyof T];
            if (value === null || value === undefined) return false;
            
            return String(value).toLowerCase().includes(searchTerm.toLowerCase());
          });
        });
        
        setFilteredData(filtered);
      }
      
      // Reset to first page when search changes
      setCurrentPage(1);
    } else {
      // When using server pagination, just use the data as is
      setFilteredData(data);
    }
  }, [searchTerm, data, useServerPagination]);
  
  // Handle column changes separately to avoid infinite re-renders
  useEffect(() => {
    // This effect only runs when columns change
    // It doesn't need to do anything, just ensures we're aware of column changes
    // without causing re-renders in the main data filtering effect
  }, [columns]);

  // Calculate pagination for client-side
  const totalPages = useServerPagination 
    ? (serverPaginationInfo?.totalPages || 1)
    : Math.ceil(filteredData.length / itemsPerPage);
    
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  
  // Current data to display
  const currentData = useServerPagination 
    ? filteredData // When using server pagination, the data is already paginated
    : filteredData.slice(startIndex, endIndex);

  // Handle page change
  const goToPage = (page: number) => {
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    
    if (useServerPagination && serverPaginationInfo) {
      serverPaginationInfo.onPageChange(page);
    } else {
      setCurrentPage(page);
    }
  };

  // Get the current page from props or state
  const displayCurrentPage = useServerPagination 
    ? (serverPaginationInfo?.currentPage || 1)
    : currentPage;

  // Get total items count
  const totalItems = useServerPagination
    ? (serverPaginationInfo?.totalItems || 0)
    : filteredData.length;

  return (
    <div className={`w-full ${className}`}>
      {/* Custom Header */}
      {customHeader && (
        <div className="mb-4">
          {customHeader}
        </div>
      )}
      
      {/* Search bar */}
      <div className="mb-4 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, index) => (
                <th 
                  key={index} 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentData.length > 0 ? (
              currentData.map((item, rowIndex) => (
                <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {columns.map((column, colIndex) => (
                    <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                      {typeof column.accessor === 'function' 
                        ? column.accessor(item)
                        : item[column.accessor as keyof T] as React.ReactNode}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td 
                  colSpan={columns.length} 
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">
              {useServerPagination 
                ? ((serverPaginationInfo?.currentPage || 1) - 1) * itemsPerPage + 1
                : startIndex + 1}
            </span> to{" "}
            <span className="font-medium">
              {useServerPagination
                ? Math.min((serverPaginationInfo?.currentPage || 1) * itemsPerPage, totalItems)
                : Math.min(endIndex, filteredData.length)}
            </span> of{" "}
            <span className="font-medium">{totalItems}</span> results
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => goToPage(displayCurrentPage - 1)}
              disabled={displayCurrentPage === 1}
              className={`px-3 py-1 rounded-md ${
                displayCurrentPage === 1
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Previous
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Show pages around current page
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (displayCurrentPage <= 3) {
                pageNum = i + 1;
              } else if (displayCurrentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = displayCurrentPage - 2 + i;
              }
              
              return (
                <button
                  key={i}
                  onClick={() => goToPage(pageNum)}
                  className={`px-3 py-1 rounded-md ${
                    displayCurrentPage === pageNum
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => goToPage(displayCurrentPage + 1)}
              disabled={displayCurrentPage === totalPages}
              className={`px-3 py-1 rounded-md ${
                displayCurrentPage === totalPages
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
