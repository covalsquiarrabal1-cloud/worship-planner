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

export default function MinisteriosPage() {
  const [ministries, setMinistries] = useState<Ministry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadMinistries() }, [])

  async function loadMinistries() {
    const res = await fetch('/api/ministries')
    if (res.ok) {
      const data = await res.json()
      setMinistries(Array.isArray(data) ? data : [])
    }
    setLoading(false)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-bold">Ministérios</h2>
      <p className="text-sm text-[var(--muted-foreground)]">Gerencie as escalas de cada ministério técnico.</p>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/admin"
          className="card flex flex-col items-center justify-center py-8 hover:border-[#58a6ff] transition-colors text-center"
        >
          <span className="text-2xl mb-2">🎵</span>
          <span className="font-semibold text-sm">Louvor</span>
          <span className="text-xs text-[var(--muted-foreground)] mt-1">Escala Principal</span>
        </Link>
        {ministries.map((m) => (
          <Link
            key={m.id}
            href={`/admin/ministerios/${m.slug}`}
            className="card flex flex-col items-center justify-center py-8 hover:border-[#58a6ff] transition-colors text-center"
          >
            <span className="text-2xl mb-2">
              {m.slug === 'som' ? '🔊' : m.slug === 'iluminacao' ? '💡' : m.slug === 'projecao' ? '📽' : '🎭'}
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
