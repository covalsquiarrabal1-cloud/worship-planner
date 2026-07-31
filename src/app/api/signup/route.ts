import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, phone, birth_date, ministries } = body

    // Validações
    if (!name?.trim() || !email?.trim() || !phone?.trim() || !birth_date) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 })
    }

    if (!ministries || !Array.isArray(ministries) || ministries.length === 0) {
      return NextResponse.json({ error: 'Selecione pelo menos um ministério.' }, { status: 400 })
    }

    // Validar que cada ministério tem role
    for (const m of ministries) {
      if (!m.ministry_id || !m.role || !['membro', 'lider'].includes(m.role)) {
        return NextResponse.json({ error: 'Selecione a função para cada ministério.' }, { status: 400 })
      }
    }

    const serviceClient = await createServiceRoleClient()

    // Inserir inscrição
    const { data: signup, error: signupError } = await serviceClient
      .from('ministry_signups')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        birth_date,
      })
      .select()
      .single()

    if (signupError) {
      return NextResponse.json({ error: signupError.message }, { status: 500 })
    }

    // Inserir seleções de ministérios
    const selections = ministries.map((m: { ministry_id: string; role: string }) => ({
      signup_id: signup.id,
      ministry_id: m.ministry_id,
      role: m.role,
    }))

    const { error: selectionsError } = await serviceClient
      .from('ministry_signup_selections')
      .insert(selections)

    if (selectionsError) {
      return NextResponse.json({ error: selectionsError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: signup.id })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
