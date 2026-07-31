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

// Grupos de ministérios
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

  function getGridCols(count: number) {
    if (count <= 2) return 'grid-cols-2'
    if (count <= 4) return 'grid-cols-2'
    return 'grid-cols-3'
  }

  return (
    <div className="max-w-lg mx-auto px-4 space-y-5">
      <div className="text-center pt-2">
        <h2 className="text-lg font-bold">Ministérios</h2>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {groups.map((items, idx) => (
          <div
            key={idx}
            className="rounded-3xl p-4 flex flex-col items-center justify-center aspect-square"
            style={{ background: 'rgba(255, 255, 255, 0.06)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
          >
            <div className={`grid ${getGridCols(items.length)} gap-3 w-full place-items-center`}>
              {items.map(m => (
                <Link
                  key={m.id}
                  href={m.slug === 'louvor' ? '/admin' : `/admin/ministerios/${m.slug}`}
                  className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
                >
                  <div className="w-[44px] h-[44px] rounded-[12px] bg-[#1c2128] border border-[#30363d] flex items-center justify-center shadow-md">
                    <span className="text-[20px]">
                      {m.slug === 'louvor' ? '🎵' : getMinistryEmoji(m.slug)}
                    </span>
                  </div>
                  <span className="text-[9px] text-center leading-tight font-medium truncate w-[50px]">{m.name}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {ungrouped.length > 0 && (
          <div
            className="rounded-3xl p-4 flex flex-col items-center justify-center aspect-square"
            style={{ background: 'rgba(255, 255, 255, 0.06)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
          >
            <div className={`grid ${getGridCols(ungrouped.length)} gap-3 w-full place-items-center`}>
              {ungrouped.map(m => (
                <Link
                  key={m.id}
                  href={`/admin/ministerios/${m.slug}`}
                  className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
                >
                  <div className="w-[44px] h-[44px] rounded-[12px] bg-[#1c2128] border border-[#30363d] flex items-center justify-center shadow-md">
                    <span className="text-[20px]">{getMinistryEmoji(m.slug)}</span>
                  </div>
                  <span className="text-[9px] text-center leading-tight font-medium truncate w-[50px]">{m.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
