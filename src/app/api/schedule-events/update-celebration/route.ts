import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { event_id, scale_type_id } = await request.json()

    if (!event_id || !scale_type_id) {
      return NextResponse.json({ error: 'event_id and scale_type_id are required' }, { status: 400 })
    }

    // Update the event's scale_type_id
    const { error } = await supabase
      .from('schedule_events')
      .update({
        scale_type_id: scale_type_id,
      })
      .eq('id', event_id)

    if (error) {
      console.error('Error updating event celebration:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in update-celebration:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
