'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2, Send, Check, MessageCircle } from 'lucide-react'
import Link from 'next/link'

interface ScheduleEvent {
  id: string
  event_date: string
  day_of_week: string
  week_number: number
  scale_type: { id: string; name: string } | null
  assignments: {
    id: string
    role: string
    member: { id: string; name: string } | null
  }[]
}

interface MemberMessage {
  id: string
  name: string
  phone: string
  days: { date: string; dayOfWeek: string; scaleName: string }[]
}

const roleLabels: Record<string, string> = {
  vocal_1: 'Vocal 1', vocal_2: 'Vocal 2', vocal_3: 'Vocal 3',
  guitarra: 'Guitarra', baixo: 'Baixo', bateria: 'Bateria', teclado: 'Teclado', back: 'Back',
}

export default function MensagensPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [members, setMembers] = useState<{ id: string; name: string; phone: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState(() => Math.ceil(new Date().getDate() / 7))
  const [sentMessages, setSentMessages] = useState<Set<string>>(new Set())
  const [customMessage, setCustomMessage] = useState(
    'Olá "{nome}", Graça e Paz! 🙏\n\nEstamos passando para lembrar que nessa semana você está escalado(a) {dias}.\n\nPara mais detalhes da escala acesse seu aplicativo Worship Planner. 🎵'
  )
  const [showTemplate, setShowTemplate] = useState(false)

  useEffect(() => { loadData() }, [currentDate])

  async function loadData() {
    setLoading(true)
    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')

    const [eventsRes, membersRes] = await Promise.all([
      fetch(`/api/schedule-events?start=${start}&end=${end}`, { cache: 'no-store' }),
      fetch('/api/members'),
    ])

    if (eventsRes.ok) setEvents(await eventsRes.json())
    if (membersRes.ok) {
      const data = await membersRes.json()
      setMembers(Array.isArray(data) ? data : [])
    }
    setLoading(false)
  }

  const weekEvents = events.filter(e => e.week_number === currentWeek)
  const weeks = [...new Set(events.map(e => e.week_number))].sort((a, b) => a - b)

  // Build member messages
  const memberMessages: MemberMessage[] = (() => {
    const memberMap = new Map<string, MemberMessage>()

    for (const event of weekEvents) {
      for (const assignment of event.assignments) {
        if (!assignment.member) continue
        const memberId = assignment.member.id
        const memberData = members.find(m => m.id === memberId)

        if (!memberMap.has(memberId)) {
          memberMap.set(memberId, {
            id: memberId,
            name: assignment.member.name,
            phone: memberData?.phone || '',
            days: [],
          })
        }

        const entry = memberMap.get(memberId)!
        if (!entry.days.some(d => d.date === event.event_date && d.scaleName === (event.scale_type?.name || '-'))) {
          entry.days.push({
            date: event.event_date,
            dayOfWeek: event.day_of_week,
            scaleName: event.scale_type?.name || '-',
          })
        }
      }
    }

    return Array.from(memberMap.values())
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  })()

  function buildMessage(member: MemberMessage): string {
    const diasText = member.days
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => {
        const dateObj = new Date(d.date + 'T12:00:00')
        return `no ${d.dayOfWeek.toLowerCase()} dia ${format(dateObj, 'dd/MM')} (${d.scaleName})`
      })
      .join(' e ')

    return customMessage
      .replace('{nome}', member.name.split(' ')[0])
      .replace('{dias}', diasText)
  }

  function getWhatsAppLink(member: MemberMessage): string {
    const cleanPhone = member.phone.replace(/[^0-9]/g, '')
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone
    const message = encodeURIComponent(buildMessage(member))
    return `https://wa.me/${fullPhone}?text=${message}`
  }

  function markSent(id: string) {
    setSentMessages(prev => new Set([...prev, id]))
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Sub-tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Link href="/admin" className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-[var(--card)] border border-[var(--border)]">
          Escalas
        </Link>
        <Link href="/admin/membros" className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-[var(--card)] border border-[var(--border)]">
          Membros
        </Link>
        <Link href="/admin/musicas" className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-[var(--card)] border border-[var(--border)]">
          Músicas
        </Link>
        <Link href="/admin/minha-escala" className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-[var(--card)] border border-[var(--border)]">
          Minha Escala
        </Link>
        <Link href="/admin/mensagens" className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#58a6ff] text-white shadow-[0_2px_8px_rgba(88,166,255,0.3)]">
          💬 Mensagens
        </Link>
      </div>

      <h2 className="text-lg font-bold flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-green-400" />
        Envio de Mensagens
      </h2>

      {/* Month + Week */}
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 rounded-lg bg-[var(--accent)]">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 rounded-lg bg-[var(--accent)]">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {weeks.length > 0 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setCurrentWeek(w => Math.max(1, w - 1))} className="p-2 rounded-xl bg-[var(--card)] border border-[var(--border)]">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium">Semana {currentWeek}</span>
          <button onClick={() => setCurrentWeek(w => w + 1)} className="p-2 rounded-xl bg-[var(--card)] border border-[var(--border)]">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Week events summary */}
      {weekEvents.length > 0 && (
        <div className="card py-3 px-4">
          <div className="flex flex-wrap gap-2">
            {weekEvents.map(e => (
              <span key={e.id} className="text-xs bg-[var(--accent)] px-2 py-1 rounded">
                {e.day_of_week} {format(new Date(e.event_date + 'T12:00:00'), 'dd/MM')} — <span className="text-green-400 font-medium">{e.scale_type?.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Template toggle */}
      <button
        onClick={() => setShowTemplate(!showTemplate)}
        className="text-xs text-[#58a6ff] hover:underline"
      >
        {showTemplate ? 'Ocultar modelo' : '✏️ Editar modelo da mensagem'}
      </button>

      {showTemplate && (
        <div className="card space-y-2">
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={5}
            className="w-full text-xs"
          />
          <p className="text-[10px] text-[var(--muted-foreground)]">
            Variáveis: <code>{'{nome}'}</code> = primeiro nome, <code>{'{dias}'}</code> = dias escalados
          </p>
        </div>
      )}

      {/* Member list */}
      {memberMessages.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-sm text-[var(--muted-foreground)]">Nenhum membro escalado nesta semana.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-[var(--muted-foreground)]">
              {memberMessages.length} pessoa(s) escalada(s)
            </p>
            {sentMessages.size > 0 && (
              <p className="text-xs text-green-400 font-medium">
                ✓ {sentMessages.size}/{memberMessages.length} enviado(s)
              </p>
            )}
          </div>

          {memberMessages.map(member => {
            const isSent = sentMessages.has(member.id)
            const daysLabel = member.days
              .sort((a, b) => a.date.localeCompare(b.date))
              .map(d => `${d.dayOfWeek} ${format(new Date(d.date + 'T12:00:00'), 'dd/MM')}`)
              .join(', ')

            return (
              <div key={member.id} className={`card flex items-center gap-3 transition-opacity ${isSent ? 'opacity-40' : ''}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{member.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)] truncate">{daysLabel}</p>
                </div>
                {member.phone ? (
                  <a
                    href={getWhatsAppLink(member)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => markSent(member.id)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                      isSent
                        ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                        : 'bg-[#25d366] text-white hover:bg-[#20bd5a] shadow-lg shadow-[#25d366]/20'
                    }`}
                  >
                    {isSent ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                    {isSent ? 'Enviado' : 'Enviar'}
                  </a>
                ) : (
                  <span className="text-[10px] text-red-400 px-3 py-2 shrink-0">Sem telefone</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
