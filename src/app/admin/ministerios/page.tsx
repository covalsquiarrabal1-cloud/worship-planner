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

function getMinistryEmoji(slug: string): string {
  const emojiMap: Record<string, string> = {
    'som': '🔊',
    'iluminacao': '💡',
    'projecao': '📽',
    'backstage': '🚪',
    'conexao': '🤝',
    'conexao-alive': '🤝',
    'excelencia': '⭐',
    'intercessao': '🙏',
    'intercessao-alive': '🙏',
    'centurioes': '🛡️',
    'servos': '🙌',
    'fotografia-creative': '📸',
    'stories': '📱',
    'profetico': '🔥',
    'kids': '🧒',
    'ac-soccer': '⚽',
    'ac-volei': '🏐',
    'decoracao': '🎨',
    'ativadas': '👩',
    'forja': '🔨',
    'empoderadas': '👑',
    'strong-brothers': '💪',
    'alive': '⚡',
    'sala-de-cura': '💊',
    'acao-social': '❤️',
    'financas': '💰',
    'bookstore': '📚',
    'exito': '🎯',
    'evangelismo': '📢',
    'membresia': '📋',
  }
  return emojiMap[slug] || '⛪'
}

// Grupos de ministérios (ordem visual)
const MINISTRY_GROUPS: string[][] = [
  ['conexao', 'excelencia', 'centurioes', 'servos'],
  ['louvor', 'iluminacao', 'som', 'projecao', 'backstage'],
  ['ac-soccer', 'ac-volei'],
  ['empoderadas', 'strong-brothers', 'kids'],
  ['sala-de-cura', 'intercessao', 'profetico', 'evangelismo'],
  ['decoracao', 'bookstore', 'exito', 'membresia'],
  ['alive', 'conexao-alive', 'intercessao-alive', 'ativadas', 'forja'],
  ['fotografia-creative', 'stories'],
  ['acao-social', 'financas'],
]

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

  // Montar grupos com dados do banco
  const groups = MINISTRY_GROUPS.map(slugs => {
    const items = slugs
      .map(slug => {
        if (slug === 'louvor') return { id: 'louvor', name: 'Louvor', slug: 'louvor', leader_name: null } as Ministry
        return ministries.find(m => m.slug === slug)
      })
      .filter(Boolean) as Ministry[]
    return items
  }).filter(g => g.length > 0)

  // Ministérios sem grupo
  const allGroupedSlugs = MINISTRY_GROUPS.flat()
  const ungrouped = ministries.filter(m => !allGroupedSlugs.includes(m.slug))

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h2 className="text-xl font-bold">Ministérios</h2>
      <p className="text-sm text-[var(--muted-foreground)]">Gerencie as escalas de cada ministério.</p>

      {groups.map((items, idx) => (
        <div key={idx} className="rounded-2xl border border-[var(--border)] p-3 space-y-2">
          {items.map(m => (
            <Link
              key={m.id}
              href={m.slug === 'louvor' ? '/admin' : `/admin/ministerios/${m.slug}`}
              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#58a6ff]/10 transition-colors"
            >
              <span className="text-xl flex-shrink-0">
                {m.slug === 'louvor' ? '🎵' : getMinistryEmoji(m.slug)}
              </span>
              <span className="font-medium text-sm flex-1">{m.name}</span>
              {m.leader_name && (
                <span className="text-xs text-[var(--muted-foreground)]">{m.leader_name}</span>
              )}
            </Link>
          ))}
        </div>
      ))}

      {ungrouped.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] p-3 space-y-2">
          {ungrouped.map(m => (
            <Link
              key={m.id}
              href={`/admin/ministerios/${m.slug}`}
              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#58a6ff]/10 transition-colors"
            >
              <span className="text-xl flex-shrink-0">{getMinistryEmoji(m.slug)}</span>
              <span className="font-medium text-sm flex-1">{m.name}</span>
              {m.leader_name && (
                <span className="text-xs text-[var(--muted-foreground)]">{m.leader_name}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
