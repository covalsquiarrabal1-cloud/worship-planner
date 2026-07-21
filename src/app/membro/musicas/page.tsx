'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Music, ExternalLink, Loader2, Send, CheckCircle } from 'lucide-react'

interface SongEvent {
  id: string
  event_date: string
  day_of_week: string
  scale_type: { name: string } | null
  songs: {
    id: string
    order_num: number
    title: string
    version: string | null
    minister: string | null
    youtube_url: string | null
  }[]
}

export default function MemberMusicasPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<SongEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [memberName, setMemberName] = useState('')
  const [suggestionLink, setSuggestionLink] = useState('')
  const [suggestionMessage, setSuggestionMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadMemberName()
  }, [])

  useEffect(() => {
    loadSongs()
  }, [currentDate])

  async function loadMemberName() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: member } = await supabase
      .from('members')
      .select('name')
      .eq('email', user.email)
      .single()
    if (member?.name) setMemberName(member.name)
  }

  async function loadSongs() {
    setLoading(true)
    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')

    const res = await fetch(`/api/songs?start=${start}&end=${end}`)
    if (res.ok) {
      const data = await res.json()
      // Filter only events that have songs
      setEvents(Array.isArray(data) ? data.filter((e: SongEvent) => e.songs && e.songs.length > 0) : [])
    } else {
      setEvents([])
    }
    setLoading(false)
  }

  async function sendSuggestion() {
    if (!suggestionLink.trim() && !suggestionMessage.trim()) return
    setSending(true)

    const res = await fetch('/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_name: memberName || 'Membro',
        link: suggestionLink.trim() || null,
        message: suggestionMessage.trim() || null,
      }),
    })

    if (res.ok) {
      setSent(true)
      setSuggestionLink('')
      setSuggestionMessage('')
      setTimeout(() => setSent(false), 3000)
    }
    setSending(false)
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Músicas</h2>

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 rounded-lg bg-[var(--accent)]">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-medium capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 rounded-lg bg-[var(--accent)]">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Songs by event */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-8 text-[var(--muted-foreground)]">
          <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum louvor cadastrado para este mês.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="card space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-[var(--muted-foreground)] capitalize">
                  {event.day_of_week}, {format(new Date(event.event_date + 'T12:00:00'), 'dd/MM')}
                </span>
                <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded font-medium">
                  {event.scale_type?.name}
                </span>
              </div>
              {event.songs.sort((a, b) => a.order_num - b.order_num).map((song) => (
                <div key={song.id} className="flex items-center gap-3 bg-[var(--accent)] rounded-lg px-3 py-2.5">
                  <span className="text-xs text-[var(--muted-foreground)] w-5">{song.order_num}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{song.title}</p>
                    {song.version && (
                      <p className="text-xs text-[var(--muted-foreground)]">{song.version}</p>
                    )}
                  </div>
                  {song.youtube_url && (
                    <a
                      href={song.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-red-500/20 rounded-lg shrink-0"
                    >
                      <ExternalLink className="w-4 h-4 text-red-400" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* === SUGESTÃO DE LOUVOR === */}
      <div className="card space-y-3 border-blue-500/20">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Send className="w-4 h-4" />
          Envie uma sugestão de louvor
        </h3>
        <input
          type="url"
          placeholder="Cole o link (YouTube, Spotify...)"
          value={suggestionLink}
          onChange={(e) => setSuggestionLink(e.target.value)}
        />
        <textarea
          placeholder="Mensagem (opcional)"
          value={suggestionMessage}
          onChange={(e) => setSuggestionMessage(e.target.value)}
          rows={2}
          className="w-full bg-[var(--accent)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm resize-none"
        />
        {sent ? (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle className="w-4 h-4" />
            Sugestão enviada!
          </div>
        ) : (
          <button
            onClick={sendSuggestion}
            disabled={sending || (!suggestionLink.trim() && !suggestionMessage.trim())}
            className="w-full bg-white text-black font-medium py-2.5 rounded-lg text-sm disabled:opacity-40"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Enviar Sugestão'}
          </button>
        )}
      </div>

      {/* Bottom spacer */}
      <div className="h-24" />
    </div>
  )
}
