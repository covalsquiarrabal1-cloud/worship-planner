import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { google } from 'googleapis'

function getServiceAccountCredentials() {
  // Opção 1: variável de ambiente com JSON (produção/Vercel)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
  }

  // Opção 2: arquivo local (desenvolvimento)
  const path = require('path')
  const fs = require('fs')
  const keyPath = path.resolve(process.cwd(), process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || '')
  return JSON.parse(fs.readFileSync(keyPath, 'utf-8'))
}

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

  try {
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'valparaiso@igrejaamorecuidado.net'
    const credentials = getServiceAccountCredentials()

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    })

    const calendar = google.calendar({ version: 'v3', auth })

    // Buscar eventos do mês
    const timeMin = new Date(year, month - 1, 1).toISOString()
    const timeMax = new Date(year, month, 0, 23, 59, 59).toISOString()

    const response = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    })

    const events = (response.data.items || []).map(event => ({
      id: event.id,
      title: event.summary || 'Sem título',
      date: event.start?.dateTime || event.start?.date || '',
      endDate: event.end?.dateTime || event.end?.date || '',
      location: event.location || null,
      description: event.description || null,
      allDay: !event.start?.dateTime,
    }))

    return NextResponse.json(events)
  } catch (error: any) {
    console.error('Google Calendar Error:', error.message)
    return NextResponse.json({ error: 'Erro ao acessar agenda: ' + error.message }, { status: 500 })
  }
}
