import React from 'react'

export default function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-8">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      <span className="ml-3 text-gray-600">Loading...</span>
    </div>
  )
}
