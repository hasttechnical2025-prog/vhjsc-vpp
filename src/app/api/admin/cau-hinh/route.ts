import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Lưu chữ thương hiệu (thay cho "VHJSC · VPP"). Chỉ admin.
export async function POST(req: Request) {
  const session = await requireRole('admin')
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const brand = (body?.brand_text ?? '').toString().trim()
  if (!brand) return NextResponse.json({ error: 'Chữ thương hiệu không được để trống' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('vhjscvpp_cauhinh')
    .upsert({ key: 'brand_text', value: brand }, { onConflict: 'key' })
  if (error) return NextResponse.json({ error: 'Lưu thất bại' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
