'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2, ArrowLeft, Users } from 'lucide-react'
import Link from 'next/link'

interface MinistryMember { id: string; name: string; email: string | null; is_blocked: boolean }
interface MinistryEvent {
  id: string; event_date: string; day_of_week: string; week_number: number;
  scale_name: string | null; num_celebrations: number;
  assignments: { id: string; celebration_number: number; member: { id: string; name: string } | null }[]
}

export default function MinistryPage() {
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

  const month = currentDate.getMonth() + 1
  const year = currentDate.getFullYear()

  useEffect(() => { loadData() }, [currentDate])

  async function loadData() {
    setLoading(true)
    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')

    const [membersRes, eventsRes] = await Promise.all([
      fetch(`/api/ministries/${slug}/members`),
      fetch(`/api/ministries/${slug}/events?start=${start}&end=${end}`),
    ])

    if (membersRes.ok) setMembers(await membersRes.json())
    if (eventsRes.ok) setEvents(await eventsRes.json())
    setLoading(false)
  }

  async function addMember() {
    if (!newMemberName.trim() || !newMemberEmail.trim()) {
      alert('Nome e e-mail são obrigatórios.')
      return
    }
    await fetch(`/api/ministries/${slug}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newMemberName.trim(), email: newMemberEmail.trim() }),
    })
    setNewMemberName('')
    setNewMemberEmail('')
    setShowAddMember(false)
    loadData()
  }

  async function deleteMember(id: string) {
    if (!confirm('Remover este membro?')) return
    await fetch(`/api/ministries/${slug}/members?id=${id}`, { method: 'DELETE' })
    loadData()
  }

  async function toggleMemberStatus(id: string, currentBlocked: boolean) {
    const res = await fetch(`/api/ministries/${slug}/members/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_blocked: !currentBlocked }),
    })
    if (res.ok) {
      setMembers(prev => prev.map(m => m.id === id ? { ...m, is_blocked: !currentBlocked } : m))
    }
  }

  async function handleSwapMember(assignmentId: string, newMemberId: string) {
    if (!newMemberId) return

    setEvents(prev => prev.map(event => ({
      ...event,
      assignments: event.assignments.map(a =>
        a.id === assignmentId
          ? { ...a, member: members.find(m => m.id === newMemberId) ? { id: newMemberId, name: members.find(m => m.id === newMemberId)!.name } : a.member }
          : a
      ),
    })))

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
        <Link href="/admin/ministerios" className="p-2 rounded-xl bg-[#1c2128] border border-[#30363d]">
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
          <button onClick={() => setShowAddMember(true)} className="flex items-center gap-2 bg-[#1c2128] border border-[#30363d] px-4 py-3 rounded-2xl text-sm hover:border-[#58a6ff]">
            <Plus className="w-4 h-4" /> Adicionar Membro
          </button>
          {showAddMember && (
            <div className="card space-y-3">
              <input placeholder="Nome" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} autoFocus />
              <input placeholder="E-mail (obrigatório)" type="email" value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} />
              <div className="flex gap-2">
                <button onClick={addMember} className="flex-1 bg-[#58a6ff] text-white py-2 rounded-xl text-sm font-medium">Salvar</button>
                <button onClick={() => setShowAddMember(false)} className="px-4 py-2 text-[#8b949e] text-sm">Cancelar</button>
              </div>
            </div>
          )}
          {members.map(m => (
            <div key={m.id} className={`card flex items-center justify-between ${m.is_blocked ? 'opacity-50' : ''}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{m.name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${m.is_blocked ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                    {m.is_blocked ? 'Inativo' : 'Ativo'}
                  </span>
                </div>
                {m.email && <p className="text-xs text-[var(--muted-foreground)]">{m.email}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleMemberStatus(m.id, m.is_blocked)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${m.is_blocked ? 'text-green-400 hover:bg-green-500/10' : 'text-orange-400 hover:bg-orange-500/10'}`}
                >
                  {m.is_blocked ? 'Ativar' : 'Inativar'}
                </button>
                <button onClick={() => deleteMember(m.id)} className="p-2 text-[#f85149] hover:bg-[#f85149]/10 rounded-xl">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
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

          {/* Generate button */}
          <Link
            href={`/admin/ministerios/${slug}/gerar?month=${month}&year=${year}`}
            className="flex flex-col items-center justify-center gap-2 bg-[#1c2128] border border-[#30363d] py-6 rounded-2xl hover:border-[#58a6ff] transition-colors w-full"
          >
            <Plus className="w-6 h-6 text-[#58a6ff]" />
            <span className="text-sm font-semibold">GERAR ESCALA</span>
          </Link>

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
