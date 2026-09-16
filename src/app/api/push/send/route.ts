import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:covalsqui.arrabal1@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

/**
 * Busca user_ids no profiles a partir de uma lista de emails.
 * Faz comparação case-insensitive buscando cada email individualmente
 * para não depender de collation do banco.
 */
async function emailsToUserIds(serviceClient: any, emails: string[]): Promise<string[]> {
  const userIds: string[] = []
  for (const email of emails) {
    const { data } = await serviceClient
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .maybeSingle()
    if (data?.id) userIds.push(data.id)
  }
  return userIds
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()

  // Check permission: admin, official leader_user_id, or ministry_members lider/ambos
  const { data: profile } = await serviceClient
    .from('profiles').select('role, email').eq('id', user.id).single()

  const isAdmin = profile?.role === 'admin'

  if (!isAdmin) {
    // Check leader_user_id
    const { data: officialLeader } = await serviceClient
      .from('ministries')
      .select('id')
      .eq('leader_user_id', user.id)
      .limit(1)
      .maybeSingle()

    // Check ministry_members with lider/ambos role
    let isMemberLeader = false
    if (!officialLeader && profile?.email) {
      const { data: memberLeader } = await serviceClient
        .from('ministry_members')
        .select('id')
        .in('role', ['lider', 'ambos'])
        .ilike('email', profile.email)
        .limit(1)
        .maybeSingle()
      isMemberLeader = !!memberLeader
    }

    if (!officialLeader && !isMemberLeader) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }
  }

  const { title, body, url, memberIds, ministrySlug } = await request.json()
  if (!title || !body) return NextResponse.json({ error: 'title e body obrigatórios' }, { status: 400 })

  let subscriptions: any[] = []

  if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
    // Send to specific members by their ministry_members IDs
    const { data: members } = await serviceClient
      .from('ministry_members')
      .select('email')
      .in('id', memberIds)

    const emails = (members || []).map((m: any) => m.email?.toLowerCase()).filter(Boolean)

    if (emails.length > 0) {
      const userIds = await emailsToUserIds(serviceClient, emails)
      if (userIds.length > 0) {
        const { data } = await serviceClient
          .from('push_subscriptions')
          .select('*')
          .in('user_id', userIds)
        subscriptions = data || []
      }
    }
  } else if (ministrySlug) {
    // Send to all active members of a specific ministry
    const { data: ministry } = await serviceClient
      .from('ministries')
      .select('id')
      .eq('slug', ministrySlug)
      .single()

    if (ministry) {
      const { data: members } = await serviceClient
        .from('ministry_members')
        .select('email')
        .eq('ministry_id', ministry.id)
        .eq('is_blocked', false)

      const emails = (members || []).map((m: any) => m.email?.toLowerCase()).filter(Boolean)

      if (emails.length > 0) {
        const userIds = await emailsToUserIds(serviceClient, emails)
        if (userIds.length > 0) {
          const { data } = await serviceClient
            .from('push_subscriptions')
            .select('*')
            .in('user_id', userIds)
          subscriptions = data || []
        }
      }
    }
  } else {
    // Admin: send to all subscriptions
    const { data } = await serviceClient.from('push_subscriptions').select('*')
    subscriptions = data || []
  }

  if (subscriptions.length === 0) {
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
      // Remove stale/expired subscriptions
      if (err.statusCode === 410 || err.statusCode === 404) {
        await serviceClient.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }

  return NextResponse.json({ success: true, sent, failed })
}
