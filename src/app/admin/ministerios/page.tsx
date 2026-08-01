'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Ministry {
  id: string
  name: string
  slug: string
  leader_name: string | null
  group_name: string | null
}

function getMinistryEmoji(slug: string): string {
  const emojiMap: Record<string, string> = {
    'som': '🔊',
    'iluminacao': '💡',
    'projecao': '🖥️',
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
    'sala-de-cura': '❤️‍🩹',
    'acao-social': '❤️',
    'financas': '💰',
    'bookstore': '📚',
    'exito': '🎯',
    'evangelismo': '📢',
    'membresia': '📋',
    'louvor': '🎶',
    'ac-casais': '💒',
  }
  return emojiMap[slug] || '⛪'
}

function getMinistryIcon3D(slug: string): string {
  const emoji = getMinistryEmoji(slug)
  return `https://cdn.jsdelivr.net/gh/shuding/fluentui-emoji-unicode/assets/${encodeURIComponent(emoji)}_3d.png`
}

// Ordem preferida dos grupos
const GROUP_ORDER = ['Integração', 'Culto', 'Esporte', 'Comunidade', 'Espiritual', 'Operacional', 'Alive', 'Comunicação', 'Administrativo', 'Outros']

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

  // Agrupar por group_name do banco
  const groupMap: Record<string, Ministry[]> = {}
  
  // Adicionar Louvor no grupo Culto
  const louvorItem = { id: 'louvor', name: 'Louvor', slug: 'louvor', leader_name: null, group_name: 'Culto' } as Ministry
  groupMap['Culto'] = [louvorItem]

  for (const m of ministries) {
    const group = m.group_name || 'Outros'
    if (!groupMap[group]) groupMap[group] = []
    groupMap[group].push(m)
  }

  // Ordenar grupos
  const groups = GROUP_ORDER
    .filter(g => groupMap[g] && groupMap[g].length > 0)
    .map(g => groupMap[g])

  // Grupos que não estão na ordem predefinida
  const extraGroups = Object.keys(groupMap)
    .filter(g => !GROUP_ORDER.includes(g))
    .map(g => groupMap[g])
    .filter(g => g.length > 0)

  const allGroups = [...groups, ...extraGroups]

  return (
    <div className="flex flex-col items-center px-3 pb-8">
      <div className="text-center pt-2">
        <h2 className="text-lg font-bold">Ministérios</h2>
      </div>

      {allGroups.map((items, idx) => (
        <div
          key={idx}
          className="w-[85%] max-w-[360px] aspect-square rounded-[32px] p-6 flex flex-wrap items-center justify-center content-center gap-5"
          style={{ background: 'rgba(255, 255, 255, 0.07)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.12)', marginBottom: '30px' }}
        >
          {items.map(m => (
            <Link
              key={m.id}
              href={m.slug === 'louvor' ? '/admin' : `/admin/ministerios/${m.slug}`}
              className="flex flex-col items-center gap-2 active:scale-90 transition-transform"
            >
              <div className="w-[77px] h-[77px] rounded-[16px] bg-[#1c2128] border border-[#30363d] flex items-center justify-center shadow-lg">
                <img
                  src={m.slug === 'louvor' ? getMinistryIcon3D('louvor') : getMinistryIcon3D(m.slug)}
                  alt={m.name}
                  className="w-[48px] h-[48px] object-contain"
                />
              </div>
              <span className="text-[11px] text-center leading-tight font-medium w-[80px] break-words">{m.name}</span>
            </Link>
          ))}
        </div>
      ))}
    </div>
  )
}
