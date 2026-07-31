'use client'

import { useState, useEffect } from 'react'
import { Loader2, Users, BarChart3, ArrowLeft, ChevronDown } from 'lucide-react'
import Link from 'next/link'

interface MinistryStats {
  id: string
  name: string
  slug: string
  count: number
  leader_name: string | null
  members: string[]
}

interface MultiAreaMember {
  name: string
  areas: string[]
}

interface ReportData {
  worshipCount: number
  worshipMembers: string[]
  ministryStats: MinistryStats[]
  totalUnique: number
  multiArea: MultiAreaMember[]
}

const ministryIcons: Record<string, string> = {
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

export default function RelatoriosPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedArea, setExpandedArea] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/relatorios')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
  }

  if (!data) {
    return <div className="text-center py-12 text-[var(--muted-foreground)]">Erro ao carregar relatórios.</div>
  }

  const totalMinistries = data.ministryStats.reduce((sum, m) => sum + m.count, 0)

  function toggleExpand(key: string) {
    setExpandedArea(prev => prev === key ? null : key)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="p-2 rounded-xl bg-[#1c2128] border border-[#30363d]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-xl font-bold">Relatórios</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Visão geral dos membros</p>
        </div>
      </div>

      {/* Resumo Geral */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center py-5">
          <p className="text-3xl font-bold text-[#58a6ff]">{data.totalUnique}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">Total de Membros</p>
        </div>
        <div className="card text-center py-5">
          <p className="text-3xl font-bold text-green-400">{data.multiArea.length}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">Servem em +1 área</p>
        </div>
      </div>

      {/* Membros por Área */}
      <section className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Membros por Área
        </h3>

        {/* Louvor */}
        <div className="card overflow-hidden">
          <button
            onClick={() => toggleExpand('louvor')}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">🎵</span>
              <span className="text-sm font-medium">Louvor</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#58a6ff]">{data.worshipCount}</span>
              <ChevronDown className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform ${expandedArea === 'louvor' ? 'rotate-180' : ''}`} />
            </div>
          </button>
          {expandedArea === 'louvor' && (
            <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-1">
              {data.worshipMembers.map((name, i) => (
                <p key={i} className="text-xs text-[var(--muted-foreground)] py-0.5">{name}</p>
              ))}
            </div>
          )}
        </div>

        {/* Ministries */}
        {data.ministryStats.map(m => (
          <div key={m.id} className="card overflow-hidden">
            <button
              onClick={() => toggleExpand(m.slug)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{ministryIcons[m.slug] || '⛪'}</span>
                <div className="text-left">
                  <span className="text-sm font-medium">{m.name}</span>
                  {m.leader_name && (
                    <p className="text-[10px] text-[var(--muted-foreground)]">Líder: {m.leader_name}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#58a6ff]">{m.count}</span>
                <ChevronDown className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform ${expandedArea === m.slug ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {expandedArea === m.slug && (
              <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-1">
                {m.leader_name && (
                  <p className="text-xs font-medium text-yellow-400 py-0.5">👑 {m.leader_name} (Líder)</p>
                )}
                {m.members.map((name, i) => (
                  <p key={i} className="text-xs text-[var(--muted-foreground)] py-0.5">{name}</p>
                ))}
                {m.members.length === 0 && (
                  <p className="text-xs text-[var(--muted-foreground)] italic">Nenhum membro cadastrado.</p>
                )}
              </div>
            )}
          </div>
        ))}

        <div className="card flex items-center justify-between bg-[var(--accent)]">
          <span className="text-sm font-semibold">Total (com repetições)</span>
          <span className="text-sm font-bold">{data.worshipCount + totalMinistries}</span>
        </div>
      </section>

      {/* Membros em múltiplas áreas */}
      {data.multiArea.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Servem em mais de 1 área ({data.multiArea.length})
          </h3>

          {data.multiArea.map((m, idx) => (
            <div key={idx} className="card flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium">{m.name}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {m.areas.map((area, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-lg bg-[#58a6ff]/10 text-[#58a6ff]">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
              <span className="text-lg font-bold text-[#58a6ff] shrink-0 ml-3">
                {String(m.areas.length).padStart(2, '0')}
              </span>
            </div>
          ))}
        </section>
      )}

      <div className="h-24" />
    </div>
  )
}
