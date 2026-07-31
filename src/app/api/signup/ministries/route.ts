import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// Rota pública - lista ministérios para o formulário (sem autenticação)
export async function GET() {
  const serviceClient = await createServiceRoleClient()

  const { data, error } = await serviceClient
    .from('ministries')
    .select('id, name, slug')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data || [])
}
