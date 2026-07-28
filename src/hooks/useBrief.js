import { useEffect, useState, useCallback } from 'react'
import { db } from '../lib/db'

// The customer's product brief — the thing every agent reads before it acts.
export function useBrief() {
  const [brief, setBrief] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const row = await db.get('product-brief', 'current')
      setBrief(row || null)
    } catch {
      setBrief(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (data) => {
    await db.upsert('product-brief', data, 'current')
    await load()
  }, [load])

  return { brief, loading, save, reload: load }
}

export function briefPrompt(brief) {
  if (!brief) return ''
  return [
    `Product name: ${brief.name || 'unnamed'}`,
    `What it does: ${brief.what || 'n/a'}`,
    `Target audience: ${brief.audience || 'n/a'}`,
    `Current pricing: ${brief.pricing || 'not set'}`,
    `Monthly marketing budget: ${brief.budget || 'not set'}`,
    `Primary goal: ${brief.goal || 'growth'}`,
    `Brand tone: ${brief.tone || 'confident, clear'}`,
    `Traction so far: ${brief.traction || 'early'}`,
  ].join('\n')
}
