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

  useEffect(() => {
    loadMyMinistries()
  }, [])

  async function loadMyMinistries() {
    const res = await fetch('/api/ministries/meus')
    if (res.ok) {
      const data = await res.json()
      setMinistries(Array.isArray(data) ? data : [])
    }
    setLoading(false)
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
