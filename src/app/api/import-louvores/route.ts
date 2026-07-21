import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  // Find events for the dates
  const dates = ['2026-07-24', '2026-07-25', '2026-07-26']

  const { data: events } = await serviceClient
    .from('schedule_events')
    .select('id, event_date')
    .in('event_date', dates)

  if (!events || events.length === 0) {
    return NextResponse.json({ error: 'Eventos não encontrados. Importe a escala primeiro.' }, { status: 400 })
  }

  // Delete existing songs for these events
  const eventIds = events.map(e => e.id)
  await serviceClient.from('songs').delete().in('event_id', eventIds)

  // Songs data
  const songsData: { event_date: string; order_num: number; title: string; version: string; minister: string }[] = [
    // Sexta 24/07 - PROFÉTICA
    { event_date: '2026-07-24', order_num: 1, title: 'PAI NOSSO / QUE ELE CRESÇA (MEDLEY)', version: 'BETHEL MUSIC', minister: 'MAVI' },
    { event_date: '2026-07-24', order_num: 2, title: 'SANTO', version: 'AC MUSIC', minister: 'MATHEUS / MAIARA' },
    { event_date: '2026-07-24', order_num: 3, title: 'TU ÉS + AGUAS PURIFICADORAS', version: 'FHOP MUSIC', minister: 'MATHEUS / MAIARA' },
    { event_date: '2026-07-24', order_num: 4, title: 'QUERO JESUS', version: 'CENTRAL 3', minister: 'MAVI' },
    // Sábado 25/07 - ALIVE
    { event_date: '2026-07-25', order_num: 1, title: 'SOBRE AS AGUAS', version: 'DUNAMIS', minister: 'MICHELE / EDUARDO' },
    { event_date: '2026-07-25', order_num: 2, title: 'QUANDO O CÉU INVADE A TERRA', version: 'GABRIEL J E MATEUS BRITO', minister: 'EDUARDO' },
    { event_date: '2026-07-25', order_num: 3, title: 'BOM PERFUME + MANACIAL + BONDADE DE DEUS', version: 'GABI SAMPAIO', minister: 'FRANCIELE' },
    { event_date: '2026-07-25', order_num: 4, title: 'SINTO FLUIR', version: 'MARCELO MARKES', minister: 'FRANCIELE / EDUARDO' },
    // Domingo 26/07 - CELEBRAÇÃO
    { event_date: '2026-07-26', order_num: 1, title: 'ELE É DEUS', version: 'SEU WORSHIP', minister: 'COVALSQUI / ÉRICA' },
    { event_date: '2026-07-26', order_num: 2, title: 'ZELO', version: 'AC MUSIC', minister: 'MICHELE / COVALSQUI' },
    { event_date: '2026-07-26', order_num: 3, title: 'AMBIÇÃO', version: 'GABI SAMPAIO', minister: 'ÉRICA' },
    { event_date: '2026-07-26', order_num: 4, title: 'ABA', version: 'DIEGO KARTER', minister: 'COVALSQUI' },
  ]

  // Insert songs
  const toInsert = songsData.map(s => {
    const event = events.find(e => e.event_date === s.event_date)
    return {
      event_id: event!.id,
      order_num: s.order_num,
      title: s.title,
      version: s.version,
      minister: s.minister,
    }
  }).filter(s => s.event_id)

  const { error } = await serviceClient.from('songs').insert(toInsert)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, songsCreated: toInsert.length })
}
