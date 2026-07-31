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

// Ordem dos ministérios agrupados (separados por null = espaço visual)
const MINISTRY_ORDER: (string | null)[] = [
  'conexao', 'excelencia', 'centurioes', 'servos',
  null,
  'louvor', 'iluminacao', 'som', 'projecao', 'backstage',
  null,
  'ac-soccer', 'ac-volei', 'empoderadas', 'strong-brothers',
  'kids',
  null,
  'sala-de-cura', 'intercessao', 'profetico', 'evangelismo',
  null,
  'decoracao', 'bookstore', 'exito', 'membresia',
  null,
  'alive', 'conexao-alive', 'intercessao-alive', 'ativadas',
  'forja',
  null,
  'fotografia-creative', 'stories',
  null,
  'acao-social', 'financas',
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

  // Construir lista ordenada com separadores
  const orderedItems: (Ministry | 'separator')[] = []
  const usedSlugs = new Set<string>()

  for (const slug of MINISTRY_ORDER) {
    if (slug === null) {
      orderedItems.push('separator')
    } else if (slug === 'louvor') {
      orderedItems.push({ id: 'louvor', name: 'Louvor', slug: 'louvor', leader_name: null })
      usedSlugs.add('louvor')
    } else {
      const m = ministries.find(m => m.slug === slug)
      if (m) {
        orderedItems.push(m)
        usedSlugs.add(slug)
      }
    }
  }

  // Adicionar não agrupados
  const ungrouped = ministries.filter(m => !usedSlugs.has(m.slug))
  if (ungrouped.length > 0) {
    orderedItems.push('separator')
    ungrouped.forEach(m => orderedItems.push(m))
  }

  // Dividir em seções por separador
  const sections: Ministry[][] = []
  let current: Ministry[] = []
  for (const item of orderedItems) {
    if (item === 'separator') {
      if (current.length > 0) sections.push(current)
      current = []
    } else {
      current.push(item)
    }
  }
  if (current.length > 0) sections.push(current)

  return (
    <div className="max-w-md mx-auto px-2 space-y-6">
      <div className="text-center pt-2">
        <h2 className="text-lg font-bold">Ministérios</h2>
      </div>

      {sections.map((section, idx) => (
        <div key={idx} className="grid grid-cols-4 gap-y-5 gap-x-2 justify-items-center">
          {section.map(m => (
            <Link
              key={m.id}
              href={m.slug === 'louvor' ? '/admin' : `/admin/ministerios/${m.slug}`}
              className="flex flex-col items-center gap-1.5 w-[72px] active:scale-90 transition-transform"
            >
              <div className="w-[60px] h-[60px] rounded-[16px] bg-[#1c2128] border border-[#30363d] flex items-center justify-center shadow-lg">
                <span className="text-[28px]">
                  {m.slug === 'louvor' ? '🎵' : getMinistryEmoji(m.slug)}
                </span>
              </div>
              <span className="text-[10px] text-center leading-tight font-medium truncate w-full">{m.name}</span>
            </Link>
          ))}
        </div>
      ))}
    </div>
  )
}
