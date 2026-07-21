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

  // Track how many times MASCULINO/FEMININO has been used this month
  let duetCount = 0
  const MAX_DUETS_PER_MONTH = 2

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

    // === NEW LOGIC: Choose songs based on vocal composition ===
    // Analyze the vocal team
    const numMales = maleVocals.length
    const numFemales = femaleVocals.length
    
    // Determine ideal vocal type distribution for 4 songs
    // Goal: each vocal sings 1-2 songs, distributed fairly
    const desiredVocalTypes = planVocalTypeDistribution(numMales, numFemales, duetCount < MAX_DUETS_PER_MONTH)
    
    // Count duets in this event's plan
    if (desiredVocalTypes.includes('MASCULINO / FEMININO')) duetCount++

    // Pick 4 songs matching worship order AND desired vocal types
    const pickedSongs: { song: SetlistItem; ministers: string }[] = []

    for (let i = 0; i < 4; i++) {
      const requiredWorshipType = worshipOrder[i]
      const preferredVocalType = desiredVocalTypes[i]

      // Find songs matching all criteria
      let candidates = setlist.filter(s => {
        if (usedSongIds.has(s.id) && setlist.length > 20) return false
        if (pickedSongs.some(p => p.song.id === s.id)) return false
        if (s.worship_type?.toUpperCase() !== requiredWorshipType) return false
        if (!matchesCelebrationType(s.celebration_type, celebrationFilter, scaleName)) return false
        if (!isVocalCompatible(s.vocal_type, maleVocals, femaleVocals)) return false
        return true
      })

      // Prefer songs matching the desired vocal type
      const preferred = candidates.filter(s => {
        const vt = (s.vocal_type || '').toUpperCase()
        return vt === preferredVocalType || (preferredVocalType === 'ANY' && true)
      })

      if (preferred.length > 0) candidates = preferred

      // Relax "used" constraint if needed
      if (candidates.length === 0) {
        candidates = setlist.filter(s => {
          if (pickedSongs.some(p => p.song.id === s.id)) return false
          if (s.worship_type?.toUpperCase() !== requiredWorshipType) return false
          if (!matchesCelebrationType(s.celebration_type, celebrationFilter, scaleName)) return false
          if (!isVocalCompatible(s.vocal_type, maleVocals, femaleVocals)) return false
          return true
        })
      }

      // Relax worship type if needed
      if (candidates.length === 0) {
        candidates = setlist.filter(s => {
          if (pickedSongs.some(p => p.song.id === s.id)) return false
          if (!matchesCelebrationType(s.celebration_type, celebrationFilter, scaleName)) return false
          if (!isVocalCompatible(s.vocal_type, maleVocals, femaleVocals)) return false
          return true
        })
      }

      if (candidates.length === 0) continue

      // Thematic coherence: louvores 1&2 similar, 3&4 similar
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
      usedSongIds.add(chosen.id)
    }

    // Assign ministers for all 4 songs together (ensures fair distribution)
    const songObjects = pickedSongs.map(p => p.song)
    const ministersList = assignAllMinisters(songObjects, leader, back, other)
    
    // Add to batch
    for (let i = 0; i < pickedSongs.length; i++) {
      allSongs.push({
        event_id: event.id,
        order_num: i + 1,
        title: pickedSongs[i].song.title,
        version: pickedSongs[i].song.version,
        minister: ministersList[i] || '-',
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

// Plan what vocal types we WANT for each position based on the vocal team
function planVocalTypeDistribution(numMales: number, numFemales: number, allowDuet: boolean): string[] {
  const hasBoth = numMales > 0 && numFemales > 0

  if (numMales > 0 && numFemales === 0) {
    // All males (e.g. STRONGBROTHERS)
    return ['MASCULINO', 'MASCULINO', 'UNISEX', 'MASCULINO']
  }

  if (numFemales > 0 && numMales === 0) {
    // All females (e.g. EMPODERADAS)
    return ['FEMININO', 'FEMININO', 'UNISEX', 'FEMININO']
  }

  // Mixed team - distribute fairly
  // Include MASCULINO/FEMININO only if allowed (max 2 per month)
  if (hasBoth && allowDuet && Math.random() < 0.4) {
    // Patterns with 1 MASCULINO/FEMININO duet (~40% chance when allowed)
    const patterns = [
      ['MASCULINO / FEMININO', 'FEMININO', 'MASCULINO', 'UNISEX'],
      ['MASCULINO', 'MASCULINO / FEMININO', 'FEMININO', 'UNISEX'],
      ['FEMININO', 'MASCULINO', 'MASCULINO / FEMININO', 'UNISEX'],
      ['UNISEX', 'FEMININO', 'MASCULINO', 'MASCULINO / FEMININO'],
    ]
    return patterns[Math.floor(Math.random() * patterns.length)]
  }

  // No duet - balanced distribution
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

  // 1 male, 1 female
  return ['MASCULINO', 'FEMININO', 'UNISEX', 'UNISEX']
}

function assignMinisters(
  position: number,
  song: SetlistItem,
  leader: any | null,
  back: any | null,
  other: any | null
): string {
  // This function is now a simple placeholder - actual assignment is done in assignAllMinisters
  return '-'
}

// New function: assigns ministers to ALL 4 songs at once ensuring proper distribution
function assignAllMinisters(
  songs: SetlistItem[],
  leader: any | null,
  back: any | null,
  other: any | null
): string[] {
  const allVocals = [leader, back, other].filter(v => v)
  if (allVocals.length === 0) return songs.map(() => '-')

  const maleVocals = allVocals.filter(v => v.gender === 'male')
  const femaleVocals = allVocals.filter(v => v.gender === 'female')

  // Track how many songs each vocal has been assigned
  const assignCount: Record<string, number> = {}
  allVocals.forEach(v => { assignCount[v.id] = 0 })

  const results: string[] = []

  for (let i = 0; i < songs.length; i++) {
    const song = songs[i]
    const vocalType = (song.vocal_type || '').toUpperCase()

    // Determine eligible singers based on vocal_type
    let eligible: any[] = []
    if (vocalType === 'MASCULINO') {
      eligible = maleVocals
    } else if (vocalType === 'FEMININO' || vocalType === 'FEMININO 2 VOCAIS') {
      eligible = femaleVocals
    } else if (vocalType === 'MASCULINO / FEMININO') {
      // Needs one male + one female
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
      // UNISEX - any ONE person
      eligible = allVocals
    }

    if (eligible.length === 0) {
      results.push('-')
      continue
    }

    // Rule: position 3 (4th song) - prefer leader or back, but allow "outro" if it avoids overloading
    if (i === 3) {
      const leaderBack = eligible.filter(v => v.id === leader?.id || v.id === back?.id)
      // Only restrict to leader/back if they have fewer assignments than "outro"
      if (leaderBack.length > 0) {
        const minLeaderBack = Math.min(...leaderBack.map(v => assignCount[v.id] || 0))
        const otherCount = eligible.find(v => v.id === other?.id) ? (assignCount[other?.id] || 0) : 999
        // If leader/back are already at 2 and outro is at 0 or 1, allow outro
        if (minLeaderBack >= 2 && otherCount < minLeaderBack) {
          // Keep full eligible pool
        } else {
          eligible = leaderBack
        }
      }
    }

    // Pick the person with least assignments (fair distribution)
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
  // Filter out anyone with 2+ assignments if others have less
  const minCount = Math.min(...pool.map(v => assignCount[v.id] || 0))
  const leastUsed = pool.filter(v => (assignCount[v.id] || 0) === minCount)
  // Pick randomly among those with least usage
  return leastUsed[Math.floor(Math.random() * leastUsed.length)]
}
