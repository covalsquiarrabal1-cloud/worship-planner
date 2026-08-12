import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:covalsqui.arrabal1@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { title, body, url } = await request.json()
  if (!title || !body) return NextResponse.json({ error: 'title e body obrigatórios' }, { status: 400 })
  // Get all subscriptions (only users who opted in have subscriptions)
  const { data: subscriptions } = await serviceClient.from('push_subscriptions').select('*')

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ success: true, sent: 0, failed: 0, message: 'Nenhum dispositivo registrado' })
  }

  const payload = JSON.stringify({ title, body, url: url || '/membro' })
  let sent = 0
  let failed = 0

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }, payload)
      sent++
    } catch (err: any) {
      failed++
      // Remove expired subscriptions
      if (err.statusCode === 410 || err.statusCode === 404) {
        await serviceClient.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }

  return NextResponse.json({ success: true, sent, failed })
}
