'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2, ArrowLeft, Users, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

interface MinistryMember { id: string; name: string; email: string | null }
interface MinistryEvent {
  id: string; event_date: string; day_of_week: string; week_number: number;
  scale_name: string | null; num_celebrations: number;
  assignments: { id: string; celebration_number: number; member: { id: string; name: string } | null }[]
}

export default function LiderMinistryPage() {
  const params = useParams()
  const slug = params.slug as string
  const [members, setMembers] = useState<MinistryMember[]>([])
  const [events, setEvents] = useState<MinistryEvent[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'escala' | 'membros'>('escala')
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [isPublished, setIsPublished] = useState(false)
  const [worshipMembers, setWorshipMembers] = useState<{ name: string; email: string }[]>([])
  const [addMode, setAddMode] = useState<'select' | 'manual'>('select')

  const month = currentDate.getMonth() + 1
  const year = currentDate.getFullYear()

  useEffect(() => { loadData() }, [currentDate])

  async function loadData() {
    setLoading(true)
    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')

    const [membersRes, eventsRes, pubRes] = await Promise.all([
      fetch(`/api/ministries/${slug}/members`),
      fetch(`/api/ministries/${slug}/events?start=${start}&end=${end}`),
      fetch(`/api/ministries/${slug}/publish-status?month=${month}&year=${year}`),
    ])

    if (membersRes.ok) setMembers(await membersRes.json())
    if (eventsRes.ok) setEvents(await eventsRes.json())
    if (pubRes.ok) {
      const pubData = await pubRes.json()
      setIsPublished(pubData.is_published ?? false)
    } else {
      setIsPublished(false)
    }
    setLoading(false)
  }

  async function addMember() {
    if (!newMemberName.trim()) return
    await fetch(`/api/ministries/${slug}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newMemberName.trim(), email: newMemberEmail.trim() || null }),
    })
    setNewMemberName('')
    setNewMemberEmail('')
    setShowAddMember(false)
    loadData()
  }

  async function addFromWorship(worshipMember: { name: string; email: string }) {
    // Check if already in this ministry
    if (members.some(m => m.email?.toLowerCase() === worshipMember.email.toLowerCase())) {
      alert(`${worshipMember.name} já está neste ministério.`)
      return
    }
    await fetch(`/api/ministries/${slug}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: worshipMember.name, email: worshipMember.email }),
    })
    loadData()
  }

  async function loadWorshipMembers() {
    const res = await fetch('/api/members')
    if (res.ok) {
      const data = await res.json()
      setWorshipMembers(
        (Array.isArray(data) ? data : [])
          .filter((m: any) => m.email)
          .map((m: any) => ({ name: m.name, email: m.email }))
      )
    }
  }

  async function deleteMember(id: string) {
    if (!confirm('Remover este membro?')) return
    await fetch(`/api/ministries/${slug}/members?id=${id}`, { method: 'DELETE' })
    loadData()
  }

  async function togglePublish() {
    setPublishing(true)
    const res = await fetch(`/api/ministries/${slug}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year }),
    })
    if (res.ok) {
      const data = await res.json()
      setIsPublished(data.is_published)
      alert(data.is_published ? 'Escala publicada! Membros podem ver agora.' : 'Escala ocultada.')
    } else {
      const data = await res.json()
      alert('Erro: ' + (data.error || 'Erro desconhecido'))
    }
    setPublishing(false)
  }

  async function handleSwapMember(assignmentId: string, newMemberId: string) {
    if (!newMemberId) return

    // Update locally for instant feedback
    setEvents(prev => prev.map(event => ({
      ...event,
      assignments: event.assignments.map(a =>
        a.id === assignmentId
          ? { ...a, member: members.find(m => m.id === newMemberId) ? { id: newMemberId, name: members.find(m => m.id === newMemberId)!.name } : a.member }
          : a
      ),
    })))

    // Persist to API
    const res = await fetch(`/api/ministries/${slug}/assignments`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignmentId, memberId: newMemberId }),
    })

    if (!res.ok) {
      alert('Erro ao trocar membro. Recarregando...')
      loadData()
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/lider" className="p-2 rounded-xl bg-[#1c2128] border border-[#30363d]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-xl font-bold capitalize">{slug.replace('-', ' ')}</h2>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setTab('escala')}
          className={`py-5 rounded-2xl text-sm font-semibold transition-all ${tab === 'escala' ? 'bg-[#58a6ff] text-white shadow-lg shadow-[#58a6ff]/20' : 'bg-[#1c2128] border border-[#30363d] text-[#8b949e]'}`}
        >
          📅 Escala
        </button>
        <button
          onClick={() => setTab('membros')}
          className={`py-5 rounded-2xl text-sm font-semibold transition-all ${tab === 'membros' ? 'bg-[#58a6ff] text-white shadow-lg shadow-[#58a6ff]/20' : 'bg-[#1c2128] border border-[#30363d] text-[#8b949e]'}`}
        >
          <Users className="w-4 h-4 inline mr-1" /> Membros ({members.length})
        </button>
      </div>

      {tab === 'membros' ? (
        <div className="space-y-3">
          <button onClick={() => { setShowAddMember(true); loadWorshipMembers() }} className="flex items-center gap-2 bg-[#1c2128] border border-[#30363d] px-4 py-3 rounded-2xl text-sm hover:border-[#58a6ff]">
            <Plus className="w-4 h-4" /> Adicionar Membro
          </button>
          {showAddMember && (
            <div className="card space-y-3">
              {/* Mode toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAddMode('select')}
                  className={`py-2 rounded-xl text-xs font-medium transition-all ${addMode === 'select' ? 'bg-[#58a6ff] text-white' : 'bg-[#1c2128] border border-[#30363d] text-[#8b949e]'}`}
                >
                  Selecionar do Louvor
                </button>
                <button
                  onClick={() => setAddMode('manual')}
                  className={`py-2 rounded-xl text-xs font-medium transition-all ${addMode === 'manual' ? 'bg-[#58a6ff] text-white' : 'bg-[#1c2128] border border-[#30363d] text-[#8b949e]'}`}
                >
                  Cadastro Manual
                </button>
              </div>

              {addMode === 'select' ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {worshipMembers.length === 0 ? (
                    <p className="text-xs text-[var(--muted-foreground)] text-center py-3">Carregando...</p>
                  ) : (
                    worshipMembers
                      .filter(wm => !members.some(m => m.email?.toLowerCase() === wm.email.toLowerCase()))
                      .map(wm => (
                        <button
                          key={wm.email}
                          onClick={() => addFromWorship(wm)}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#1c2128] border border-[#30363d] hover:border-[#58a6ff] transition-colors text-left"
                        >
                          <div>
                            <p className="text-sm font-medium">{wm.name}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">{wm.email}</p>
                          </div>
                          <Plus className="w-4 h-4 text-[#58a6ff] shrink-0" />
                        </button>
                      ))
                  )}
                  {worshipMembers.length > 0 && worshipMembers.filter(wm => !members.some(m => m.email?.toLowerCase() === wm.email.toLowerCase())).length === 0 && (
                    <p className="text-xs text-[var(--muted-foreground)] text-center py-3">Todos os membros do louvor já estão neste ministério.</p>
                  )}
                </div>
              ) : (
                <>
                  <input placeholder="Nome" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} autoFocus />
                  <input placeholder="E-mail (obrigatório)" value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} />
                  <div className="flex gap-2">
                    <button onClick={addMember} className="flex-1 bg-[#58a6ff] text-white py-2 rounded-xl text-sm font-medium">Salvar</button>
                  </div>
                </>
              )}

              <button onClick={() => setShowAddMember(false)} className="w-full py-2 text-[#8b949e] text-xs">Cancelar</button>
            </div>
          )}
          {members.map(m => (
            <div key={m.id} className="card flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{m.name}</p>
                {m.email && <p className="text-xs text-[var(--muted-foreground)]">{m.email}</p>}
              </div>
              <button onClick={() => deleteMember(m.id)} className="p-2 text-[#f85149] hover:bg-[#f85149]/10 rounded-xl">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Month Nav */}
          <div className="flex items-center justify-between">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-3 rounded-xl bg-[#1c2128] border border-[#30363d]">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-base font-semibold capitalize">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</span>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-3 rounded-xl bg-[#1c2128] border border-[#30363d]">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href={`/lider/${slug}/gerar?month=${month}&year=${year}`}
              className="flex flex-col items-center justify-center gap-2 bg-[#1c2128] border border-[#30363d] py-5 rounded-2xl hover:border-[#58a6ff] transition-colors"
            >
              <Plus className="w-5 h-5 text-[#58a6ff]" />
              <span className="text-xs font-semibold">GERAR ESCALA</span>
            </Link>
            <button
              onClick={togglePublish}
              disabled={publishing || events.length === 0}
              className={`flex flex-col items-center justify-center gap-2 border py-5 rounded-2xl transition-colors disabled:opacity-40 ${
                isPublished
                  ? 'bg-[#f85149]/10 border-[#f85149]/40 hover:border-[#f85149]'
                  : 'bg-[#1c2128] border-[#30363d] hover:border-green-500'
              }`}
            >
              {publishing ? <Loader2 className="w-5 h-5 animate-spin" /> : isPublished ? <EyeOff className="w-5 h-5 text-[#f85149]" /> : <Eye className="w-5 h-5 text-green-400" />}
              <span className="text-xs font-semibold">{isPublished ? 'OCULTAR' : 'PUBLICAR'}</span>
            </button>
          </div>

          {/* Events */}
          {events.length === 0 ? (
            <div className="card text-center py-8 text-[var(--muted-foreground)]">
              <p className="text-sm">Nenhuma escala gerada para este mês.</p>
            </div>
          ) : (
            events.map(event => (
              <div key={event.id} className="card space-y-2">
                <div>
                  <span className="text-xs text-[var(--muted-foreground)] capitalize">{event.day_of_week}, {event.event_date.slice(8,10)}/{event.event_date.slice(5,7)}</span>
                  {event.scale_name && <span className="text-xs text-green-400 ml-2 font-medium">{event.scale_name}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {event.assignments.sort((a, b) => a.celebration_number - b.celebration_number).map(a => (
                    <div key={a.id} className="flex items-center gap-1">
                      {event.num_celebrations > 1 && (
                        <span className="text-xs text-[var(--muted-foreground)]">C{a.celebration_number}:</span>
                      )}
                      <select
                        value={a.member?.id || ''}
                        onChange={(e) => handleSwapMember(a.id, e.target.value)}
                        className="text-xs bg-[#1c2128] border border-[#30363d] rounded-lg px-2 py-1.5 text-white"
                      >
                        <option value="">— Selecione —</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
