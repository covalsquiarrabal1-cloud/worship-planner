'use client'

import { useState, useEffect } from 'react'
import { format, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2, ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

interface Member { id: string; name: string }

interface TeamData {
  name: string
  torre_member_id: string | null
  members: { member_id: string; role: 'intercessor' | 'suporte' }[]
}

export default function IntercessaoEquipesPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [teams, setTeams] = useState<TeamData[]>([
    { name: 'Equipe 1', torre_member_id: null, members: [] },
    { name: 'Equipe 2', torre_member_id: null, members: [] },
  ])
  const [suportes, setSuportes] = useState<string[]>([])
  const [torres, setTorres] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const month = currentDate.getMonth() + 1
  const year = currentDate.getFullYear()

  useEffect(() => {
    loadData()
  }, [month, year])

  async function loadData() {
    setLoading(true)

    // Load members
    const membersRes = await fetch('/api/ministries/intercessao/members')
    let members: Member[] = []
    if (membersRes.ok) {
      const data = await membersRes.json()
      members = data.filter((m: any) => !m.is_blocked).map((m: any) => ({ id: m.id, name: m.name }))
      setAllMembers(members)
    }

    // Load existing teams for this month
    const teamsRes = await fetch(`/api/ministries/intercessao/teams?month=${month}&year=${year}`)
    if (teamsRes.ok) {
      const teamsData = await teamsRes.json()
      if (teamsData.length > 0) {
        const loadedTeams: TeamData[] = teamsData
          .filter((t: any) => t.name !== 'Suportes')
          .map((t: any) => ({
            name: t.name,
            torre_member_id: t.torre_member?.id || null,
            members: (t.members || []).filter((m: any) => m.role === 'intercessor').map((m: any) => ({
              member_id: m.member?.id,
              role: 'intercessor' as const,
            })),
          }))
        setTeams(loadedTeams.length > 0 ? loadedTeams : [
          { name: 'Equipe 1', torre_member_id: null, members: [] },
          { name: 'Equipe 2', torre_member_id: null, members: [] },
        ])

        // Load torres
        const torresIds = teamsData
          .filter((t: any) => t.torre_member)
          .map((t: any) => t.torre_member.id)
        setTorres(torresIds)

        // Load suportes
        const suportesTeam = teamsData.find((t: any) => t.name === 'Suportes')
        if (suportesTeam) {
          setSuportes(suportesTeam.members.map((m: any) => m.member?.id).filter(Boolean))
        }
      }
    }

    setLoading(false)
  }

  function addTeam() {
    setTeams(prev => [...prev, { name: `Equipe ${prev.length + 1}`, torre_member_id: null, members: [] }])
  }

  function removeTeam(idx: number) {
    setTeams(prev => prev.filter((_, i) => i !== idx))
  }

  function setTeamTorre(idx: number, memberId: string) {
    setTeams(prev => prev.map((t, i) => i === idx ? { ...t, torre_member_id: memberId || null } : t))
  }

  function toggleTeamMember(teamIdx: number, memberId: string) {
    setTeams(prev => prev.map((t, i) => {
      if (i !== teamIdx) return t
      const exists = t.members.find(m => m.member_id === memberId)
      if (exists) {
        return { ...t, members: t.members.filter(m => m.member_id !== memberId) }
      }
      return { ...t, members: [...t.members, { member_id: memberId, role: 'intercessor' as const }] }
    }))
  }

  function toggleSuporte(memberId: string) {
    setSuportes(prev => prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId])
  }

  function toggleTorre(memberId: string) {
    setTorres(prev => prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId])
  }

  async function saveTeams() {
    setSaving(true)

    // Build teams data including suportes as a special team
    const allTeams = [
      ...teams,
      { name: 'Suportes', torre_member_id: null, members: suportes.map(id => ({ member_id: id, role: 'suporte' as const })) },
    ]

    await fetch('/api/ministries/intercessao/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teams: allTeams, month, year }),
    })

    setSaving(false)
    alert('Equipes salvas!')
  }

  // Members not assigned to any team or suporte
  const assignedIds = new Set([
    ...teams.flatMap(t => t.members.map(m => m.member_id)),
    ...suportes,
  ])
  const unassigned = allMembers.filter(m => !assignedIds.has(m.id))

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/ministerios/intercessao" className="p-2 rounded-xl bg-[var(--card)] border border-[var(--border)]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-xl font-bold">Equipes - Intercessão</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Monte as equipes do mês</p>
        </div>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 rounded-lg bg-[var(--accent)]">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold capitalize">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</span>
        <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 rounded-lg bg-[var(--accent)]">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Torres */}
      <div className="card space-y-3">
        <h3 className="text-sm font-bold">Torres (Líderes)</h3>
        <p className="text-[10px] text-[var(--muted-foreground)]">Selecione quem são os líderes de torre. Não são escalados juntos.</p>
        <div className="flex flex-wrap gap-2">
          {allMembers.map(m => (
            <button
              key={m.id}
              onClick={() => toggleTorre(m.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                torres.includes(m.id)
                  ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40'
                  : 'bg-[var(--accent)] text-[var(--muted-foreground)] hover:bg-[var(--border)]'
              }`}
            >
              {torres.includes(m.id) ? '👑 ' : ''}{m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Suportes */}
      <div className="card space-y-3">
        <h3 className="text-sm font-bold">Suportes</h3>
        <p className="text-[10px] text-[var(--muted-foreground)]">Selecione quem atua como suporte (distribuídos separadamente).</p>
        <div className="flex flex-wrap gap-2">
          {allMembers.filter(m => !torres.includes(m.id)).map(m => (
            <button
              key={m.id}
              onClick={() => toggleSuporte(m.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                suportes.includes(m.id)
                  ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40'
                  : 'bg-[var(--accent)] text-[var(--muted-foreground)] hover:bg-[var(--border)]'
              }`}
            >
              {suportes.includes(m.id) ? '✓ ' : ''}{m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Teams */}
      {teams.map((team, idx) => (
        <div key={idx} className="card space-y-3">
          <div className="flex items-center justify-between">
            <input
              value={team.name}
              onChange={e => setTeams(prev => prev.map((t, i) => i === idx ? { ...t, name: e.target.value } : t))}
              className="!py-1 !px-2 !text-sm font-bold !w-auto !bg-transparent !border-none"
            />
            <button onClick={() => removeTeam(idx)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Torre for this team */}
          <div>
            <label className="text-[10px] text-[var(--muted-foreground)] uppercase font-semibold">Torre</label>
            <select
              value={team.torre_member_id || ''}
              onChange={e => setTeamTorre(idx, e.target.value)}
              className="!py-2 !text-xs mt-1"
            >
              <option value="">— Selecionar Torre —</option>
              {allMembers.filter(m => torres.includes(m.id)).map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Intercessores */}
          <div>
            <label className="text-[10px] text-[var(--muted-foreground)] uppercase font-semibold">Intercessores</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {allMembers.filter(m => !torres.includes(m.id) && !suportes.includes(m.id)).map(m => (
                <button
                  key={m.id}
                  onClick={() => toggleTeamMember(idx, m.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    team.members.find(tm => tm.member_id === m.id)
                      ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/40'
                      : 'bg-[var(--accent)] text-[var(--muted-foreground)] hover:bg-[var(--border)]'
                  }`}
                >
                  {team.members.find(tm => tm.member_id === m.id) ? '✓ ' : ''}{m.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Add team */}
      <button onClick={addTeam} className="w-full py-3 rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:border-[#58a6ff] hover:text-[#58a6ff] transition-colors flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" /> Adicionar Equipe
      </button>

      {/* Unassigned members */}
      {unassigned.length > 0 && (
        <div className="card border-amber-500/30 space-y-2">
          <p className="text-xs font-medium text-amber-400">⚠️ Membros sem equipe ({unassigned.length})</p>
          <p className="text-[10px] text-[var(--muted-foreground)]">{unassigned.map(m => m.name).join(', ')}</p>
        </div>
      )}

      {/* Save */}
      <button
        onClick={saveTeams}
        disabled={saving}
        className="w-full bg-[#58a6ff] text-white font-semibold py-3.5 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Salvar Equipes
      </button>
    </div>
  )
}
