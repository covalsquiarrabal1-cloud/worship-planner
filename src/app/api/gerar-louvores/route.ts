import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

interface SetlistItem {
  id: string
  number: number
  title: string
  version: string | null
  celebration_type: string | null
  vocal_type: string | null
  worship_type: string | null
  description: string | null
  key: string | null
  status: string
}

interface EventWithAssignments {
  id: string
  event_date: string
  day_of_week: string
  scale_type: { name: string } | null
  assignments: { role: string; member: { id: string; name: string; gender: string; is_leader: boolean; is_back: boolean } | null }[]
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { month, year } = await request.json()
  if (!month || !year) return NextResponse.json({ error: 'month e year obrigatórios' }, { status: 400 })

  // Load setlist (only ON songs)
  const { data: setlistData } = await serviceClient
    .from('setlist').select('*').eq('status', 'ON').order('number')
  const setlist: SetlistItem[] = setlistData || []

  if (setlist.length === 0) {
    return NextResponse.json({ error: 'Nenhum louvor disponível no Set List' }, { status: 400 })
  }

  // Load events for the month with assignments and member details
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`

  const { data: eventsData } = await serviceClient
    .from('schedule_events')
    .select(`
      id, event_date, day_of_week,
      scale_type:scale_types(name),
      assignments:schedule_assignments(
        role,
        member:members(id, name, gender, is_leader, is_back)
      )
    `)
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .order('event_date')

  const events: EventWithAssignments[] = (eventsData as any) || []
  if (events.length === 0) {
    return NextResponse.json({ error: 'Nenhum evento encontrado. Gere a escala primeiro.' }, { status: 400 })
  }

  // Delete existing songs for these events
  const eventIds = events.map(e => e.id)
  await serviceClient.from('songs').delete().in('event_id', eventIds)

  // Track used songs to avoid repetition within the month
  const usedSongIds = new Set<string>()

  // Generate songs for each event
  const allSongs: { event_id: string; order_num: number; title: string; version: string | null; minister: string | null }[] = []

  for (const event of events) {
    const scaleName = event.scale_type?.name || 'CELEBRAÇÃO'
    const vocals = event.assignments.filter(a => a.role.startsWith('vocal_') && a.member)

    if (vocals.length === 0) continue

    // Identify roles
    const leader = vocals.find(v => v.member?.is_leader)?.member
    const back = vocals.find(v => v.member?.is_back && v.member?.id !== leader?.id)?.member
    const other = vocals.find(v => v.member?.id !== leader?.id && v.member?.id !== back?.id)?.member

    // Determine gender context
    const maleVocals = vocals.filter(v => v.member?.gender === 'male').map(v => v.member!)
    const femaleVocals = vocals.filter(v => v.member?.gender === 'female').map(v => v.member!)

    // Determine celebration type filter
    const celebrationFilter = getCelebrationFilter(scaleName)

    // Determine if it's a CEIA event
    const isCeia = scaleName.toUpperCase().includes('CEIA')

    // Choose worship type order
    const worshipOrder = chooseWorshipOrder(isCeia)

    // Pick 4 songs
    const pickedSongs: { song: SetlistItem; ministers: string }[] = []

    for (let i = 0; i < 4; i++) {
      const requiredWorshipType = worshipOrder[i]

      // Find compatible songs
      const compatible = setlist.filter(s => {
        // Already used this month? Try to avoid
        if (usedSongIds.has(s.id) && setlist.length > 20) return false
        // Already picked for this event?
        if (pickedSongs.some(p => p.song.id === s.id)) return false
        // Worship type match
        if (s.worship_type?.toUpperCase() !== requiredWorshipType) return false
        // Celebration type match
        if (!matchesCelebrationType(s.celebration_type, celebrationFilter, scaleName)) return false
        // Vocal type compatibility
        if (!isVocalCompatible(s.vocal_type, maleVocals, femaleVocals)) return false
        return true
      })

      // If no compatible found, relax the "used" constraint
      let candidates = compatible
      if (candidates.length === 0) {
        candidates = setlist.filter(s => {
          if (pickedSongs.some(p => p.song.id === s.id)) return false
          if (s.worship_type?.toUpperCase() !== requiredWorshipType) return false
          if (!matchesCelebrationType(s.celebration_type, celebrationFilter, scaleName)) return false
          if (!isVocalCompatible(s.vocal_type, maleVocals, femaleVocals)) return false
          return true
        })
      }

      // If still nothing, relax worship type
      if (candidates.length === 0) {
        candidates = setlist.filter(s => {
          if (pickedSongs.some(p => p.song.id === s.id)) return false
          if (!matchesCelebrationType(s.celebration_type, celebrationFilter, scaleName)) return false
          if (!isVocalCompatible(s.vocal_type, maleVocals, femaleVocals)) return false
          return true
        })
      }

      if (candidates.length === 0) continue

      // Try thematic coherence: louvores 1&2 similar, 3&4 similar
      let chosen: SetlistItem
      if (i === 1 && pickedSongs.length > 0) {
        // Try to match description with song 1
        const prev = pickedSongs[0].song
        const thematic = candidates.filter(s => s.description === prev.description)
        chosen = thematic.length > 0 ? thematic[Math.floor(Math.random() * thematic.length)] : candidates[Math.floor(Math.random() * candidates.length)]
      } else if (i === 3 && pickedSongs.length >= 3) {
        // Try to match description with song 3
        const prev = pickedSongs[2].song
        const thematic = candidates.filter(s => s.description === prev.description)
        chosen = thematic.length > 0 ? thematic[Math.floor(Math.random() * thematic.length)] : candidates[Math.floor(Math.random() * candidates.length)]
      } else {
        chosen = candidates[Math.floor(Math.random() * candidates.length)]
      }

      // Assign ministers
      const ministers = assignMinisters(i, chosen, leader, back, other)
      pickedSongs.push({ song: chosen, ministers })
      usedSongIds.add(chosen.id)
    }

    // Add to batch
    for (let i = 0; i < pickedSongs.length; i++) {
      allSongs.push({
        event_id: event.id,
        order_num: i + 1,
        title: pickedSongs[i].song.title,
        version: pickedSongs[i].song.version,
        minister: pickedSongs[i].ministers,
      })
    }
  }

  // Insert all songs
  if (allSongs.length > 0) {
    const { error } = await serviceClient.from('songs').insert(allSongs)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, songsCreated: allSongs.length })
}

function getCelebrationFilter(scaleName: string): string {
  const upper = scaleName.toUpperCase()
  if (upper.includes('ALIVE')) return 'ALIVE'
  if (upper.includes('STRONGBROTHERS')) return 'STRONGBROTHERS'
  if (upper.includes('EMPODERADAS')) return 'EMPODERADAS'
  if (upper.includes('CEIA')) return 'CEIA'
  return 'CELEBRAÇÃO'
}

function matchesCelebrationType(songCelebType: string | null, filter: string, scaleName: string): boolean {
  const ct = (songCelebType || '').toUpperCase()
  if (ct === 'GERAL') return true
  if (filter === 'ALIVE') return ct === 'ALIVE' || ct === 'GERAL'
  if (filter === 'STRONGBROTHERS') return ct === 'STRONGBROTHERS' || ct === 'CELEBRAÇÃO / STRONGBROTHERS' || ct === 'GERAL'
  if (filter === 'EMPODERADAS') return ct === 'EMPODERADAS' || ct === 'GERAL'
  if (filter === 'CEIA') return ct === 'CEIA' || ct === 'GERAL' || ct === 'CELEBRAÇÃO'
  // CELEBRAÇÃO (general)
  return ct === 'CELEBRAÇÃO' || ct === 'GERAL' || ct === 'CELEBRAÇÃO / STRONGBROTHERS'
}

function isVocalCompatible(vocalType: string | null, males: any[], females: any[]): boolean {
  const vt = (vocalType || '').toUpperCase()
  if (vt === 'UNISEX') return true
  if (vt === 'MASCULINO / FEMININO') return males.length > 0 && females.length > 0
  if (vt === 'MASCULINO') return males.length > 0
  if (vt === 'FEMININO') return females.length > 0
  if (vt === 'FEMININO 2 VOCAIS') return females.length >= 2
  return true
}

function chooseWorshipOrder(isCeia: boolean): string[] {
  if (isCeia) {
    const options = [
      ['CELEBRAÇÃO', 'CELEBRAÇÃO', 'DECLARAÇÃO', 'CEIA'],
      ['CELEBRAÇÃO', 'DECLARAÇÃO', 'DECLARAÇÃO', 'CEIA'],
      ['CELEBRAÇÃO', 'DECLARAÇÃO', 'ADORAÇÃO', 'CEIA'],
    ]
    return options[Math.floor(Math.random() * options.length)]
  }
  const options = [
    ['CELEBRAÇÃO', 'CELEBRAÇÃO', 'DECLARAÇÃO', 'ADORAÇÃO'],
    ['CELEBRAÇÃO', 'DECLARAÇÃO', 'DECLARAÇÃO', 'ADORAÇÃO'],
    ['CELEBRAÇÃO', 'DECLARAÇÃO', 'ADORAÇÃO', 'ADORAÇÃO'],
  ]
  return options[Math.floor(Math.random() * options.length)]
}

function assignMinisters(
  position: number,
  song: SetlistItem,
  leader: any | null,
  back: any | null,
  other: any | null
): string {
  const names: string[] = []

  // Position 0,1 = louvor 1,2 | Position 2,3 = louvor 3,4
  // "Outro" never does position 3 (4th song), preferably 0 or 1

  // Simple distribution patterns
  const patterns = [
    // Pattern A: L+B, O, L+B, L/B
    [['leader', 'back'], ['other'], ['leader', 'back'], ['leader']],
    // Pattern B: L, O, L+B, L+B
    [['leader'], ['other'], ['leader', 'back'], ['leader', 'back']],
    // Pattern C: B, O, L, L+B
    [['back'], ['other'], ['leader'], ['leader', 'back']],
    // Pattern D: L+O, O, L+B, L+B
    [['leader', 'other'], ['other'], ['leader', 'back'], ['leader', 'back']],
  ]

  const pattern = patterns[Math.floor(Math.random() * patterns.length)]
  const roles = pattern[position] || ['leader']

  for (const role of roles) {
    if (role === 'leader' && leader) names.push(leader.name)
    else if (role === 'back' && back) names.push(back.name)
    else if (role === 'other' && other) names.push(other.name)
    else if (role === 'leader' && !leader && back) names.push(back.name)
    else if (role === 'back' && !back && leader) names.push(leader.name)
    else if (role === 'other' && !other && back) names.push(back.name)
  }

  // Remove duplicates
  const unique = [...new Set(names)]
  return unique.length > 0 ? unique.join(' / ') : '-'
}
