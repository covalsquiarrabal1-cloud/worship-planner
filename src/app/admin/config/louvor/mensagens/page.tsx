'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2, ArrowLeft, MessageCircle, Send, Check } from 'lucide-react'
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
    member: { id: string; name: string; email: string } | null
  }[]
}

interface MemberMessage {
  name: string
  phone: string
  days: { date: string; dayOfWeek: string; scaleName: string }[]
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

  useEffect(() => {
    loadData()
  }, [currentDate])

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

  // Group events by week
  const weekEvents = events.filter(e => e.week_number === currentWeek)
  const weeks = [...new Set(events.map(e => e.week_number))].sort((a, b) => a - b)

  // Build member messages for the selected week
  const memberMessages: MemberMessage[] = (() => {
    const memberMap = new Map<string, MemberMessage>()

    for (const event of weekEvents) {
      for (const assignment of event.assignments) {
        if (!assignment.member) continue
        const memberId = assignment.member.id
        const memberData = members.find(m => m.id === memberId)
        if (!memberData?.phone) continue

        if (!memberMap.has(memberId)) {
          memberMap.set(memberId, {
            name: assignment.member.name,
            phone: memberData.phone,
            days: [],
          })
        }

        const entry = memberMap.get(memberId)!
        // Avoid duplicate days (same date)
        if (!entry.days.some(d => d.date === event.event_date)) {
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
    // Clean phone: remove (, ), -, spaces
    const cleanPhone = member.phone.replace(/[^0-9]/g, '')
    // Add country code 55 if not present
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone
    const message = encodeURIComponent(buildMessage(member))
    return `https://wa.me/${fullPhone}?text=${message}`
  }

  function markSent(name: string) {
    setSentMessages(prev => new Set([...prev, name]))
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/config/louvor" className="p-2 rounded-xl bg-[var(--card)] border border-[var(--border)]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-400" />
            Mensagens da Semana
          </h2>
          <p className="text-xs text-[var(--muted-foreground)]">Envie lembretes via WhatsApp para os escalados</p>
        </div>
      </div>

      {/* Month + Week navigation */}
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

      {/* Events in this week (summary) */}
      {weekEvents.length > 0 && (
        <div className="card space-y-1">
          <p className="text-xs text-[var(--muted-foreground)] font-semibold mb-2">Eventos da semana:</p>
          {weekEvents.map(e => (
            <p key={e.id} className="text-xs">
              <span className="text-[var(--muted-foreground)]">{e.day_of_week}, {format(new Date(e.event_date + 'T12:00:00'), 'dd/MM')}</span>
              {' — '}
              <span className="font-semibold text-green-400">{e.scale_type?.name}</span>
            </p>
          ))}
        </div>
      )}

      {/* Custom message template */}
      <div className="card space-y-2">
        <p className="text-xs font-semibold text-[var(--muted-foreground)]">Modelo da mensagem</p>
        <textarea
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          rows={4}
          className="w-full text-xs"
          placeholder="Use {nome} para o nome e {dias} para os dias escalados"
        />
        <p className="text-[10px] text-[var(--muted-foreground)]">Variáveis: {'{nome}'} = primeiro nome, {'{dias}'} = lista de dias escalados</p>
      </div>

      {/* Member list with send buttons */}
      {memberMessages.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-sm text-[var(--muted-foreground)]">Nenhum membro escalado nesta semana (ou sem telefone cadastrado).</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--muted-foreground)]">{memberMessages.length} membro(s) para notificar</p>
            <p className="text-xs text-green-400">{sentMessages.size} enviado(s)</p>
          </div>

          {memberMessages.map(member => {
            const isSent = sentMessages.has(member.name)
            const daysLabel = member.days.map(d => `${d.dayOfWeek} ${format(new Date(d.date + 'T12:00:00'), 'dd/MM')}`).join(', ')

            return (
              <div key={member.name} className={`card flex items-center gap-3 ${isSent ? 'opacity-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{member.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)] truncate">{daysLabel}</p>
                </div>
                <a
                  href={getWhatsAppLink(member)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => markSent(member.name)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium shrink-0 transition-colors ${
                    isSent
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isSent ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                  {isSent ? 'Enviado' : 'WhatsApp'}
                </a>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
