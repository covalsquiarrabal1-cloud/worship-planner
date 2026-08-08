'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, ArrowLeft, Save, Check } from 'lucide-react'
import Link from 'next/link'

interface MemberWithRoles {
  id: string
  name: string
  gender: string | null
  roles: string[]
}

const ROLE_COLUMNS = [
  { key: 'torre_domingo', label: 'Torre Domingo', short: 'T.Dom' },
  { key: 'torre_sexta', label: 'Torre Sexta', short: 'T.Sex' },
  { key: 'torre_strong', label: 'Torre StrongBrothers', short: 'T.Str' },
  { key: 'torre_empoderadas', label: 'Torre Empoderadas', short: 'T.Emp' },
  { key: 'intercessor', label: 'Intercessor', short: 'Inter' },
  { key: 'coluna', label: 'Coluna', short: 'Coluna' },
  { key: 'suporte', label: 'Suporte', short: 'Suporte' },
]

export default function EquipesPage() {
  const params = useParams()
  const slug = params.slug as string

  const [tab, setTab] = useState<'escala' | 'funcoes'>('funcoes')
  const [members, setMembers] = useState<MemberWithRoles[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const res = await fetch(`/api/ministries/${slug}/member-roles`)
    if (res.ok) setMembers(await res.json())
    setLoading(false)
  }

  function toggleRole(memberId: string, roleType: string) {
    setMembers(prev => prev.map(m => {
      if (m.id !== memberId) return m
      const hasRole = m.roles.includes(roleType)
      return { ...m, roles: hasRole ? m.roles.filter(r => r !== roleType) : [...m.roles, roleType] }
    }))
    setHasChanges(true)
  }

  async function saveRoles() {
    setSaving(true)
    const memberRoles = members.map(m => ({ member_id: m.id, roles: m.roles }))
    const res = await fetch(`/api/ministries/${slug}/member-roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberRoles }),
    })
    if (res.ok) { setHasChanges(false); alert('Configuração salva!') }
    else { const d = await res.json(); alert('Erro: ' + (d.error || 'Erro')) }
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/admin/ministerios/${slug}`} className="p-2 rounded-xl bg-[var(--card)] border border-[var(--border)]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-xl font-bold">Equipes - <span className="capitalize">{slug.replace(/-/g, ' ')}</span></h2>
          <p className="text-sm text-[var(--muted-foreground)]">Marque em quais funções cada membro pode ser escalado</p>
        </div>
      </div>

      {/* Legend */}
      <div className="card text-xs space-y-1">
        <p className="font-semibold text-[var(--muted-foreground)]">Legenda:</p>
        <div className="flex flex-wrap gap-3">
          <span><span className="text-amber-400 font-bold">T.Dom</span> = Torre Domingo</span>
          <span><span className="text-amber-400 font-bold">T.Sex</span> = Torre Sexta</span>
          <span><span className="text-amber-400 font-bold">T.Str</span> = Torre Strong</span>
          <span><span className="text-amber-400 font-bold">T.Emp</span> = Torre Empoderadas</span>
          <span><span className="text-blue-400 font-bold">Inter</span> = Intercessor</span>
          <span><span className="text-red-400 font-bold">Coluna</span> = Coluna</span>
          <span><span className="text-green-400 font-bold">Suporte</span> = Suporte</span>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-[var(--border)] bg-[var(--accent)]">
              <th className="text-left py-2.5 px-3 font-semibold sticky left-0 bg-[var(--accent)] z-10 min-w-[160px] border-r-2 border-[var(--border)]">Nome</th>
              {ROLE_COLUMNS.map((col, i) => (
                <th key={col.key} className={`py-2.5 px-2 font-semibold text-center min-w-[60px] ${i < ROLE_COLUMNS.length - 1 ? 'border-r border-[var(--border)]' : ''}`}>
                  <span className="text-[10px]">{col.short}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((member, idx) => (
              <tr key={member.id} className={`border-b border-[var(--border)] hover:bg-[var(--accent)]/50 ${idx % 2 === 0 ? '' : 'bg-[var(--accent)]/20'}`}>
                <td className="py-2.5 px-3 font-medium sticky left-0 bg-[var(--card)] z-10 border-r-2 border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${member.gender === 'male' ? 'bg-blue-400' : member.gender === 'female' ? 'bg-pink-400' : 'bg-gray-400'}`} />
                    <span className="truncate text-[11px]">{member.name}</span>
                  </div>
                </td>
                {ROLE_COLUMNS.map((col, i) => {
                  const hasRole = member.roles.includes(col.key)
                  return (
                    <td key={col.key} className={`py-1.5 text-center ${i < ROLE_COLUMNS.length - 1 ? 'border-r border-[var(--border)]' : ''}`}>
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => toggleRole(member.id, col.key)}
                          className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${
                            hasRole
                              ? col.key.startsWith('torre') ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40'
                              : col.key === 'intercessor' ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40'
                              : col.key === 'coluna' ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/40'
                              : 'bg-green-500/20 text-green-400 ring-1 ring-green-500/40'
                              : 'bg-[var(--accent)] hover:bg-[var(--border)]'
                          }`}
                        >
                          {hasRole && <Check className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Save */}
      <button
        onClick={saveRoles}
        disabled={saving || !hasChanges}
        className="w-full bg-[#58a6ff] text-white font-semibold py-3.5 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {hasChanges ? 'Salvar Funções' : 'Nenhuma alteração'}
      </button>

      <div style={{ height: '80px' }} />
    </div>
  )
}
