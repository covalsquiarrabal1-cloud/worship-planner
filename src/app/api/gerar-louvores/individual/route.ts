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

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { event_id } = await request.json()
  if (!event_id) return NextResponse.json({ error: 'event_id obrigatório' }, { status: 400 })

  // Load setlist (only ON songs)
  const { data: setlistData } = await serviceClient
    .from('setlist').select('*').eq('status', 'ON').order('number')
  const setlist: SetlistItem[] = setlistData || []

  if (setlist.length === 0) {
    return NextResponse.json({ error: 'Nenhum louvor disponível no Set List' }, { status: 400 })
  }

  // Load the specific event with assignments and member details
  const { data: eventData } = await serviceClient
    .from('schedule_events')
    .select(`
      id, event_date, day_of_week,
      scale_type:scale_types(name),
      assignments:schedule_assignments(
        role,
        member:members(id, name, gender, is_leader, is_back)
      )
    `)
    .eq('id', event_id)
    .single()

  if (!eventData) {
    return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  }

  const event = eventData as any

  // Load songs already used in the same month (to avoid repetition)
  const eventMonth = event.event_date.slice(0, 7) // "2026-08"
  const startDate = `${eventMonth}-01`
  const endDate = `${eventMonth}-31`

  const { data: monthEvents } = await serviceClient
    .from('schedule_events')
    .select('id')
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .neq('id', event_id)

  const otherEventIds = (monthEvents || []).map((e: any) => e.id)
  let usedSongTitles = new Set<string>()

  if (otherEventIds.length > 0) {
    const { data: existingSongs } = await serviceClient
      .from('songs')
      .select('title')
      .in('event_id', otherEventIds)
    if (existingSongs) {
      usedSongTitles = new Set(existingSongs.map((s: any) => s.title.toUpperCase()))
    }
  }

  // Delete existing songs for this event
  await serviceClient.from('songs').delete().eq('event_id', event_id)

  // Generate songs
  const scaleName = event.scale_type?.name || 'CELEBRAÇÃO'
  const vocals = event.assignments.filter((a: any) => a.role.startsWith('vocal_') && a.member)

  if (vocals.length === 0) {
    return NextResponse.json({ error: 'Nenhum vocal atribuído a este evento' }, { status: 400 })
  }

  // Identify roles
  const leader = vocals.find((v: any) => v.member?.is_leader)?.member
  const back = vocals.find((v: any) => v.member?.is_back && v.member?.id !== leader?.id)?.member
  const other = vocals.find((v: any) => v.member?.id !== leader?.id && v.member?.id !== back?.id)?.member

  // Determine gender context
  const maleVocals = vocals.filter((v: any) => v.member?.gender === 'male').map((v: any) => v.member!)
  const femaleVocals = vocals.filter((v: any) => v.member?.gender === 'female').map((v: any) => v.member!)

  // Determine celebration type filter
  const celebrationFilter = getCelebrationFilter(scaleName)

  // Determine if it's a CEIA event
  const isCeia = scaleName.toUpperCase().includes('CEIA')

  // Choose worship type order
  const worshipOrder = chooseWorshipOrder(isCeia)

  // Plan vocal type distribution
  const numMales = maleVocals.length
  const numFemales = femaleVocals.length
  const desiredVocalTypes = planVocalTypeDistribution(numMales, numFemales, true)

  // Pick 4 songs
  const pickedSongs: { song: SetlistItem; ministers: string }[] = []
  const usedInThisEvent = new Set<string>()

  for (let i = 0; i < 4; i++) {
    const requiredWorshipType = worshipOrder[i]
    const preferredVocalType = desiredVocalTypes[i]

    // Find songs matching all criteria
    let candidates = setlist.filter(s => {
      if (usedInThisEvent.has(s.id)) return false
      if (usedSongTitles.has(s.title.toUpperCase()) && setlist.length > 20) return false
      if (s.worship_type?.toUpperCase() !== requiredWorshipType) return false
      if (!matchesCelebrationType(s.celebration_type, celebrationFilter, scaleName)) return false
      if (!isVocalCompatible(s.vocal_type, maleVocals, femaleVocals)) return false
      return true
    })

    // Prefer songs matching the desired vocal type
    const preferred = candidates.filter(s => {
      const vt = (s.vocal_type || '').toUpperCase()
      return vt === preferredVocalType || preferredVocalType === 'ANY'
    })

    if (preferred.length > 0) candidates = preferred

    // Relax "used in month" constraint if needed
    if (candidates.length === 0) {
      candidates = setlist.filter(s => {
        if (usedInThisEvent.has(s.id)) return false
        if (s.worship_type?.toUpperCase() !== requiredWorshipType) return false
        if (!matchesCelebrationType(s.celebration_type, celebrationFilter, scaleName)) return false
        if (!isVocalCompatible(s.vocal_type, maleVocals, femaleVocals)) return false
        return true
      })
    }

    // Relax worship type if needed
    if (candidates.length === 0) {
      candidates = setlist.filter(s => {
        if (usedInThisEvent.has(s.id)) return false
        if (!matchesCelebrationType(s.celebration_type, celebrationFilter, scaleName)) return false
        if (!isVocalCompatible(s.vocal_type, maleVocals, femaleVocals)) return false
        return true
      })
    }

    if (candidates.length === 0) continue

    // Thematic coherence
    let chosen: SetlistItem
    if (i === 1 && pickedSongs.length > 0) {
      const prev = pickedSongs[0].song
      const thematic = candidates.filter(s => s.description === prev.description)
      chosen = thematic.length > 0 ? thematic[Math.floor(Math.random() * thematic.length)] : candidates[Math.floor(Math.random() * candidates.length)]
    } else if (i === 3 && pickedSongs.length >= 3) {
      const prev = pickedSongs[2].song
      const thematic = candidates.filter(s => s.description === prev.description)
      chosen = thematic.length > 0 ? thematic[Math.floor(Math.random() * thematic.length)] : candidates[Math.floor(Math.random() * candidates.length)]
    } else {
      chosen = candidates[Math.floor(Math.random() * candidates.length)]
    }

    pickedSongs.push({ song: chosen, ministers: '' })
    usedInThisEvent.add(chosen.id)
  }

  if (pickedSongs.length === 0) {
    return NextResponse.json({ error: 'Não foi possível encontrar louvores compatíveis' }, { status: 400 })
  }

  // Assign ministers
  const songObjects = pickedSongs.map(p => p.song)
  const ministersList = assignAllMinisters(songObjects, leader, back, other, maleVocals, femaleVocals)

  // Insert songs
  const songsToInsert = pickedSongs.map((p, i) => ({
    event_id: event_id,
    order_num: i + 1,
    title: p.song.title,
    version: p.song.version,
    minister: ministersList[i] || '-',
  }))

  const { error } = await serviceClient.from('songs').insert(songsToInsert)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, songsCreated: songsToInsert.length })
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

function planVocalTypeDistribution(numMales: number, numFemales: number, allowDuet: boolean): string[] {
  const hasBoth = numMales > 0 && numFemales > 0

  if (numMales > 0 && numFemales === 0) {
    return ['MASCULINO', 'MASCULINO', 'UNISEX', 'MASCULINO']
  }

  if (numFemales > 0 && numMales === 0) {
    return ['FEMININO', 'FEMININO', 'UNISEX', 'FEMININO']
  }

  if (hasBoth && allowDuet && Math.random() < 0.4) {
    const patterns = [
      ['MASCULINO / FEMININO', 'FEMININO', 'MASCULINO', 'UNISEX'],
      ['MASCULINO', 'MASCULINO / FEMININO', 'FEMININO', 'UNISEX'],
      ['FEMININO', 'MASCULINO', 'MASCULINO / FEMININO', 'UNISEX'],
      ['UNISEX', 'FEMININO', 'MASCULINO', 'MASCULINO / FEMININO'],
    ]
    return patterns[Math.floor(Math.random() * patterns.length)]
  }

  if (numMales >= 2) {
    const patterns = [
      ['MASCULINO', 'MASCULINO', 'FEMININO', 'UNISEX'],
      ['MASCULINO', 'UNISEX', 'MASCULINO', 'FEMININO'],
    ]
    return patterns[Math.floor(Math.random() * patterns.length)]
  }

  if (numFemales >= 2) {
    const patterns = [
      ['FEMININO', 'FEMININO', 'MASCULINO', 'UNISEX'],
      ['MASCULINO', 'FEMININO', 'UNISEX', 'FEMININO'],
      ['FEMININO', 'MASCULINO', 'FEMININO', 'UNISEX'],
    ]
    return patterns[Math.floor(Math.random() * patterns.length)]
  }

  return ['MASCULINO', 'FEMININO', 'UNISEX', 'UNISEX']
}

function assignAllMinisters(
  songs: SetlistItem[],
  leader: any | null,
  back: any | null,
  other: any | null,
  maleVocals: any[],
  femaleVocals: any[]
): string[] {
  const allVocals = [leader, back, other].filter(v => v)
  if (allVocals.length === 0) return songs.map(() => '-')

  const assignCount: Record<string, number> = {}
  allVocals.forEach(v => { assignCount[v.id] = 0 })

  const results: string[] = []

  for (let i = 0; i < songs.length; i++) {
    const song = songs[i]
    const vocalType = (song.vocal_type || '').toUpperCase()

    let eligible: any[] = []
    if (vocalType === 'MASCULINO') {
      eligible = maleVocals
    } else if (vocalType === 'FEMININO' || vocalType === 'FEMININO 2 VOCAIS') {
      eligible = femaleVocals
    } else if (vocalType === 'MASCULINO / FEMININO') {
      const male = getLeastUsed(maleVocals, assignCount)
      const female = getLeastUsed(femaleVocals, assignCount)
      if (male && female) {
        assignCount[male.id]++
        assignCount[female.id]++
        results.push(`${male.name} / ${female.name}`)
      } else if (male) {
        assignCount[male.id]++
        results.push(male.name)
      } else if (female) {
        assignCount[female.id]++
        results.push(female.name)
      } else {
        results.push('-')
      }
      continue
    } else {
      eligible = allVocals
    }

    if (eligible.length === 0) {
      results.push('-')
      continue
    }

    if (i === 3) {
      const leaderBack = eligible.filter(v => v.id === leader?.id || v.id === back?.id)
      if (leaderBack.length > 0) {
        const minLeaderBack = Math.min(...leaderBack.map((v: any) => assignCount[v.id] || 0))
        const otherCount = eligible.find(v => v.id === other?.id) ? (assignCount[other?.id] || 0) : 999
        if (!(minLeaderBack >= 2 && otherCount < minLeaderBack)) {
          eligible = leaderBack
        }
      }
    }

    const chosen = getLeastUsed(eligible, assignCount)
    if (chosen) {
      assignCount[chosen.id]++
      results.push(chosen.name)
    } else {
      results.push('-')
    }
  }

  return results
}

function getLeastUsed(pool: any[], assignCount: Record<string, number>): any | null {
  if (pool.length === 0) return null
  const minCount = Math.min(...pool.map(v => assignCount[v.id] || 0))
  const leastUsed = pool.filter(v => (assignCount[v.id] || 0) === minCount)
  return leastUsed[Math.floor(Math.random() * leastUsed.length)]
}
