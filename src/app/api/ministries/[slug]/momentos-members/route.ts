import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { data: ministry } = await serviceClient.from('ministries').select('id').eq('slug', slug).single()
  if (!ministry) return NextResponse.json({ error: 'Ministério não encontrado' }, { status: 404 })

  const { data, error } = await serviceClient
    .from('momentos_members')
    .select('id, name, nickname')
    .eq('ministry_id', ministry.id)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { data: ministry } = await serviceClient.from('ministries').select('id').eq('slug', slug).single()
  if (!ministry) return NextResponse.json({ error: 'Ministério não encontrado' }, { status: 404 })

  const body = await request.json()
  const { name, email: providedEmail, nickname: providedNickname } = body
  if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const nickname = providedNickname || (name.trim().split(/\s+/).length > 2
    ? `${name.trim().split(/\s+/)[0]} ${name.trim().split(/\s+/).pop()}`
    : name.trim())

  // Use provided email or auto-find from cadastro
  let email: string | null = providedEmail || null

  if (!email) {
    const searchName = name.trim().toLowerCase()
    const { data: signupMatch } = await serviceClient
      .from('ministry_signups')
      .select('email')
      .or(`name.ilike.%${searchName}%,nickname.ilike.%${searchName}%`)
      .limit(1)

    if (signupMatch && signupMatch.length > 0) {
      email = signupMatch[0].email
    } else {
      const { data: memberMatch } = await serviceClient
        .from('ministry_members')
        .select('email')
        .ilike('name', `%${searchName}%`)
        .limit(1)
      if (memberMatch && memberMatch.length > 0) {
        email = memberMatch[0].email
      }
    }
  }

  const { data, error } = await serviceClient
    .from('momentos_members')
    .insert({ ministry_id: ministry.id, name: name.trim(), nickname, email })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  // Remove references in ministry_momentos first (set member_id to null)
  await serviceClient.from('ministry_momentos').update({ member_id: null }).eq('member_id', id)

  // Now delete the member
  const { error } = await serviceClient.from('momentos_members').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
