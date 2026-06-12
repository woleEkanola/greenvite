'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Calendar, Users, Table as TableIcon, ArrowRight } from 'lucide-react'

interface SearchResult {
  type: 'event' | 'guest' | 'table'
  label: string
  sublabel?: string
  href: string
  id: string
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [open])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const [eventsRes, tablesRes] = await Promise.all([
        fetch('/api/admin/events'),
        fetch('/api/admin/tables'),
      ])

      const events = eventsRes.ok ? await eventsRes.json() : []
      const tables = tablesRes.ok ? await tablesRes.json() : []

      const all: SearchResult[] = []

      const eventsList = Array.isArray(events) ? events : (events.events || [])

      for (const event of eventsList) {
        if (event.title?.toLowerCase().includes(q.toLowerCase())) {
          all.push({
            type: 'event',
            label: event.title,
            sublabel: `Event · ${event.status || 'draft'}`,
            href: `/admin/dashboard/events/${event.id}`,
            id: event.id,
          })
        }
      }

      const tablesList = Array.isArray(tables) ? tables : []
      for (const table of tablesList) {
        const name = table.name || table.label || ''
        if (name.toLowerCase().includes(q.toLowerCase())) {
          all.push({
            type: 'table',
            label: name,
            sublabel: `Table · ${table.eventTitle || ''}`,
            href: `/admin/dashboard/events/${table.eventId || ''}/tables`,
            id: table.id,
          })
        }
      }

      setResults(all.slice(0, 10))
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (query) search(query)
  }, [query, search])

  const navigate = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      navigate(results[selectedIndex].href)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const iconFor = (type: string) => {
    switch (type) {
      case 'event': return <Calendar className="h-4 w-4 text-emerald-500" />
      case 'guest': return <Users className="h-4 w-4 text-blue-500" />
      case 'table': return <TableIcon className="h-4 w-4 text-amber-500" />
      default: return <Search className="h-4 w-4 text-gray-400" />
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="fixed inset-0 bg-black/25" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 flex items-start justify-center pt-[15vh]" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
        <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
          <div className="flex items-center border-b px-4">
            <Search className="h-5 w-5 text-gray-400 mr-3" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0) }}
              onKeyDown={handleKeyDown}
              placeholder="Search events, tables..."
              className="w-full py-4 text-sm bg-transparent outline-none placeholder:text-gray-400"
            />
            <kbd className="hidden sm:inline-flex items-center rounded border border-gray-200 px-1.5 font-mono text-xs text-gray-400">
              ESC
            </kbd>
          </div>

          {loading && (
            <div className="p-4 text-sm text-gray-500 text-center">Searching...</div>
          )}

          {!loading && results.length > 0 && (
            <ul className="max-h-80 overflow-auto p-2">
              {results.map((result, i) => (
                <li
                  key={result.id}
                  onClick={() => navigate(result.href)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer text-sm transition-colors ${
                    i === selectedIndex ? 'bg-gray-100' : 'hover:bg-gray-50'
                  }`}
                >
                  {iconFor(result.type)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 truncate">{result.label}</div>
                    {result.sublabel && (
                      <div className="text-xs text-gray-500 truncate">{result.sublabel}</div>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                </li>
              ))}
            </ul>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="p-4 text-sm text-gray-500 text-center">No results found.</div>
          )}

          {!loading && query.length < 2 && (
            <div className="p-6 text-sm text-gray-400 text-center">
              Type to search events and tables...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
