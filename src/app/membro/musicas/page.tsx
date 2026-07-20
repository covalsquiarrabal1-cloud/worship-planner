'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Music, ExternalLink, Loader2, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface SongEvent {
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
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadSongs()
  }, [currentDate])

  async function loadSongs() {
    setLoading(true)
    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')

    const { data } = await supabase
      .from('schedule_events')
      .select(`
        event_date,
        day_of_week,
        scale_type:scale_types(name),
        songs(id, order_num, title, version, minister, youtube_url)
      `)
      .gte('event_date', start)
      .lte('event_date', end)
      .order('event_date')

    setEvents((data as unknown as SongEvent[]) || [])
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Músicas</h2>
        <button
          onClick={handleLogout}
          className="p-2 text-[var(--muted-foreground)]"
          title="Sair"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          className="p-2 rounded-lg bg-[var(--accent)]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-medium capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <button
          onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          className="p-2 rounded-lg bg-[var(--accent)]"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : events.filter(e => e.songs.length > 0).length === 0 ? (
        <div className="text-center py-8 text-[var(--muted-foreground)]">
          <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum louvor cadastrado para este mês.</p>
        </div>
      ) : (
        events
          .filter(e => e.songs.length > 0)
          .map((event) => (
            <div key={event.event_date} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium capitalize">
                  {event.day_of_week}, {format(new Date(event.event_date + 'T12:00:00'), 'dd/MM')}
                </span>
                <span className="text-xs bg-[var(--accent)] px-2 py-0.5 rounded">
                  {event.scale_type?.name}
                </span>
              </div>
              <div className="space-y-1">
                {event.songs
                  .sort((a, b) => a.order_num - b.order_num)
                  .map(song => (
                    <div key={song.id} className="card flex items-center gap-3 py-2.5">
                      <span className="text-xs text-[var(--muted-foreground)] w-5">{song.order_num}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{song.title}</p>
                        <p className="text-xs text-[var(--muted-foreground)] truncate">
                          {song.version}{song.minister ? ` • ${song.minister}` : ''}
                        </p>
                      </div>
                      {song.youtube_url && (
                        <a
                          href={song.youtube_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-red-500/20 rounded-lg shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-red-400" />
                        </a>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))
      )}
    </div>
  )
}
