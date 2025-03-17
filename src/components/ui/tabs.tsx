import React, { createContext, useContext, useState } from 'react'

interface TabsContextType {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = createContext<TabsContextType | undefined>(undefined)

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  className = '',
  children,
}: {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  children: React.ReactNode
}) {
  const [tabValue, setTabValue] = useState(value || defaultValue || '')

  const handleValueChange = (newValue: string) => {
    if (onValueChange) {
      onValueChange(newValue)
    } else {
      setTabValue(newValue)
    }
  }

  return (
    <TabsContext.Provider
      value={{ value: value || tabValue, onValueChange: handleValueChange }}
    >
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`flex space-x-1 rounded-lg bg-gray-100 p-1 ${className}`}>
      {children}
    </div>
  )
}

export function TabsTrigger({
  value,
  className = '',
  children,
}: {
  value: string
  className?: string
  children: React.ReactNode
}) {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error('TabsTrigger must be used within a Tabs component')
  }

  const { value: selectedValue, onValueChange } = context
  const isSelected = selectedValue === value

  return (
    <button
      className={`px-3 py-1.5 text-sm font-medium transition-all ${
        isSelected
          ? 'bg-white text-emerald-700 shadow-sm rounded-md'
          : 'text-gray-600 hover:text-gray-900'
      } ${className}`}
      onClick={() => onValueChange(value)}
    >
      {children}
    </button>
  )
}

export function TabsContent({
  value,
  className = '',
  children,
}: {
  value: string
  className?: string
  children: React.ReactNode
}) {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error('TabsContent must be used within a Tabs component')
  }

  const { value: selectedValue } = context
  if (selectedValue !== value) {
    return null
  }

  return <div className={className}>{children}</div>
}
