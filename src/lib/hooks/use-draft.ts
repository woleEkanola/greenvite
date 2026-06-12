'use client'

import { useEffect, useRef, useCallback } from 'react'

interface UseDraftOptions {
  key: string
  data: unknown
  enabled?: boolean
  intervalMs?: number
}

export function useDraft({ key, data, enabled = true, intervalMs = 30_000 }: UseDraftOptions) {
  const dataRef = useRef(data)

  useEffect(() => {
    dataRef.current = data
  }, [data])

  const save = useCallback(() => {
    if (!enabled) return
    try {
      const serialized = JSON.stringify(dataRef.current)
      localStorage.setItem(`draft:${key}`, serialized)
    } catch {
      // localStorage full or unavailable
    }
  }, [key, enabled])

  const load = useCallback(() => {
    try {
      const stored = localStorage.getItem(`draft:${key}`)
      if (stored) return JSON.parse(stored)
    } catch {
      //
    }
    return null
  }, [key])

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(`draft:${key}`)
    } catch {
      //
    }
  }, [key])

  useEffect(() => {
    if (!enabled) return
    const interval = setInterval(save, intervalMs)
    return () => clearInterval(interval)
  }, [save, intervalMs, enabled])

  useEffect(() => {
    const handler = () => save()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [save])

  return { save, load, clear }
}
