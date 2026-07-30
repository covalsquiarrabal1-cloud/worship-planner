'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Ministry {
  id: string
  name: string
  slug: string
  leader_name: string | null
}

const ministryIcons: Record<string, string> = {
  som: '🔊',
  iluminacao: '💡',
  projecao: '📽',
  backstage: '🚪',
}

export default function LiderPage() {
  const [ministries, setMinistries] = useState<Ministry[]>([])
  const [loading, setLoading] = useState(true)
  const [verse, setVerse] = useState({ text: '', reference: '' })

  useEffect(() => {
    loadMyMinistries()
    loadVerse()
  }, [])

  async function loadMyMinistries() {
    const res = await fetch('/api/ministries/meus')
    if (res.ok) {
      const data = await res.json()
      setMinistries(Array.isArray(data) ? data : [])
    }
    setLoading(false)
  }

  async function loadVerse() {
    try {
      const [textRes, refRes] = await Promise.all([
        fetch('/api/app-settings?key=verse_text'),
        fetch('/api/app-settings?key=verse_reference'),
      ])
      if (textRes.ok && refRes.ok) {
        const textData = await textRes.json()
        const refData = await refRes.json()
        if (textData.value) setVerse({ text: textData.value, reference: refData.value || '' })
      }
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Verse */}
      {verse.text && (
        <div className="card border-[var(--border)] bg-gradient-to-br from-[var(--card)] to-[var(--accent)]">
          <p className="text-sm text-[var(--muted-foreground)] italic leading-relaxed">
            &ldquo;{verse.text}&rdquo;
          </p>
          {verse.reference && (
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{verse.reference}</p>
          )}
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold">Seus Ministérios</h2>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Gerencie membros e escalas dos seus ministérios.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {ministries.map((m) => (
          <Link
            key={m.id}
            href={`/lider/${m.slug}`}
            className="card flex flex-col items-center justify-center py-8 hover:border-[#58a6ff] transition-colors text-center"
          >
            <span className="text-2xl mb-2">
              {ministryIcons[m.slug] || '🎭'}
            </span>
            <span className="font-semibold text-sm">{m.name}</span>
            {m.leader_name && (
              <span className="text-xs text-[var(--muted-foreground)] mt-1">{m.leader_name}</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
