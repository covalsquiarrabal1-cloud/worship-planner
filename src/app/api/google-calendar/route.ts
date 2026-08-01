import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

  try {
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'valparaiso@igrejaamorecuidado.net'
    const apiKey = process.env.GOOGLE_API_KEY

    // Datas do mês
    const timeMin = new Date(year, month - 1, 1).toISOString()
    const timeMax = new Date(year, month, 0, 23, 59, 59).toISOString()

    let events: any[] = []

    if (apiKey) {
      // Abordagem 1: API pública com API key (agenda pública)
      const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`)
      url.searchParams.set('key', apiKey)
      url.searchParams.set('timeMin', timeMin)
      url.searchParams.set('timeMax', timeMax)
      url.searchParams.set('singleEvents', 'true')
      url.searchParams.set('orderBy', 'startTime')

      const response = await fetch(url.toString())

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Google Calendar API Error:', errorData)
        return NextResponse.json(
          { error: 'Erro ao acessar agenda: ' + (errorData.error?.message || response.statusText) },
          { status: 500 }
        )
      }

      const data = await response.json()
      events = (data.items || []).map((event: any) => ({
        id: event.id,
        title: event.summary || 'Sem título',
        date: event.start?.dateTime || event.start?.date || '',
        endDate: event.end?.dateTime || event.end?.date || '',
        location: event.location || null,
        description: event.description || null,
        allDay: !event.start?.dateTime,
      }))
    } else {
      // Abordagem 2: Conta de serviço (fallback)
      const { google } = await import('googleapis')
      const path = await import('path')
      const fs = await import('fs')

      const keyPath = path.resolve(process.cwd(), process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || '')
      const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf-8'))

      const auth = new google.auth.GoogleAuth({
        credentials: keyFile,
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      })

      const calendar = google.calendar({ version: 'v3', auth })

      const response = await calendar.events.list({
        calendarId,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
      })

      events = (response.data.items || []).map((event: any) => ({
        id: event.id,
        title: event.summary || 'Sem título',
        date: event.start?.dateTime || event.start?.date || '',
        endDate: event.end?.dateTime || event.end?.date || '',
        location: event.location || null,
        description: event.description || null,
        allDay: !event.start?.dateTime,
      }))
    }

    return NextResponse.json(events)
  } catch (error: any) {
    console.error('Google Calendar Error:', error.message)
    return NextResponse.json({ error: 'Erro ao acessar agenda: ' + error.message }, { status: 500 })
  }
}
