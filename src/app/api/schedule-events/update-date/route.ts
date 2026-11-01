import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { event_id, new_date } = await request.json()

    if (!event_id || !new_date) {
      return NextResponse.json({ error: 'event_id and new_date are required' }, { status: 400 })
    }

    // Parse the new date to get day of week
    const dateObj = new Date(new_date + 'T12:00:00')
    const dayOfWeek = format(dateObj, 'EEEE', { locale: ptBR }).toLowerCase()

    // Update the event
    const { error } = await supabase
      .from('schedule_events')
      .update({
        event_date: new_date,
        day_of_week: dayOfWeek,
      })
      .eq('id', event_id)

    if (error) {
      console.error('Error updating event date:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in update-date:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
