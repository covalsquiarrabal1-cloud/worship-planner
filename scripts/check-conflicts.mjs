import { createClient } from '@supabase/supabase-js'
const c = createClient('https://cwfeqngelvknvocvtcna.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg')

async function run() {
  console.log('=== Verificando conflitos entre Louvor e Ministérios ===\n')

  // 1. Get all louvor schedule assignments (Aug + Sep 2026)
  const { data: louvorEvents } = await c.from('schedule_events')
    .select(`
      id, event_date, day_of_week,
      assignments:schedule_assignments(
        id, role,
        member:members(id, name, email, nickname)
      )
    `)
    .gte('event_date', '2026-08-01')
    .lte('event_date', '2026-09-30')

  // Build map: date -> emails busy in louvor
  const louvorByDate = {}
  for (const ev of louvorEvents || []) {
    if (!louvorByDate[ev.event_date]) louvorByDate[ev.event_date] = []
    for (const a of (ev.assignments || [])) {
      if (a.member?.email) {
        louvorByDate[ev.event_date].push({
          email: a.member.email.toLowerCase(),
          name: a.member.nickname || a.member.name,
          role: a.role,
        })
      }
    }
  }

  // 2. Get all ministry assignments for Aug + Sep
  const { data: ministryEvents } = await c.from('ministry_events')
    .select(`
      id, event_date, scale_name, schedule_id,
      assignments:ministry_assignments(
        id, role_name,
        member:ministry_members(id, name, email, nickname)
      )
    `)
    .gte('event_date', '2026-08-01')
    .lte('event_date', '2026-09-30')

  // Get schedule -> ministry mapping
  const scheduleIds = [...new Set((ministryEvents || []).map(e => e.schedule_id))]
  const { data: schedules } = await c.from('ministry_schedules')
    .select('id, ministry_id')
    .in('id', scheduleIds)
  
  const { data: ministries } = await c.from('ministries').select('id, name, slug')
  const ministryMap = {}
  for (const m of ministries || []) ministryMap[m.id] = m.name
  const schedMinMap = {}
  for (const s of schedules || []) schedMinMap[s.id] = s.ministry_id

  // 3. Find conflicts
  const conflicts = []
  for (const ev of ministryEvents || []) {
    const louvorPeople = louvorByDate[ev.event_date] || []
    if (louvorPeople.length === 0) continue

    const ministryName = ministryMap[schedMinMap[ev.schedule_id]] || '?'

    for (const a of (ev.assignments || [])) {
      if (!a.member?.email) continue
      const email = a.member.email.toLowerCase()
      const louvorMatch = louvorPeople.find(p => p.email === email)
      if (louvorMatch) {
        conflicts.push({
          date: ev.event_date,
          person: a.member.nickname || a.member.name,
          email: email,
          louvorRole: louvorMatch.role,
          ministryName: ministryName,
          ministryRole: a.role_name || 'Membro',
          assignmentId: a.id,
        })
      }
    }
  }

  // 4. Also check momentos
  const { data: momentos } = await c.from('ministry_momentos')
    .select('id, event_date, momento, member_id, ministry_id')
    .gte('event_date', '2026-08-01')
    .lte('event_date', '2026-09-30')

  const { data: momentosMembers } = await c.from('momentos_members').select('id, email, nickname, name')
  const momMemberMap = {}
  for (const m of momentosMembers || []) momMemberMap[m.id] = m

  for (const m of momentos || []) {
    if (!m.member_id) continue
    const member = momMemberMap[m.member_id]
    if (!member?.email) continue
    const louvorPeople = louvorByDate[m.event_date] || []
    const louvorMatch = louvorPeople.find(p => p.email === member.email.toLowerCase())
    if (louvorMatch) {
      conflicts.push({
        date: m.event_date,
        person: member.nickname || member.name,
        email: member.email,
        louvorRole: louvorMatch.role,
        ministryName: 'Momentos',
        ministryRole: m.momento,
        assignmentId: m.id,
        isMomento: true,
      })
    }
  }

  if (conflicts.length === 0) {
    console.log('✅ Nenhum conflito encontrado!')
  } else {
    console.log(`⚠️ ${conflicts.length} conflitos encontrados:\n`)
    for (const c of conflicts) {
      console.log(`  ${c.date.slice(5)} | ${c.person} | Louvor: ${c.louvorRole} | ${c.ministryName}: ${c.ministryRole}`)
    }
  }
}

run().catch(console.error)
