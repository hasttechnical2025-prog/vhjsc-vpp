import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

const BUCKET = 'vhjscvpp-images'

// Upload logo công ty -> Supabase Storage -> lưu URL vào cấu hình. Chỉ admin.
export async function POST(req: Request) {
  const session = await requireRole('admin')
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Thiếu file' }, { status: 400 })
  if (file.size > 3 * 1024 * 1024) return NextResponse.json({ error: 'Ảnh quá 3MB' }, { status: 400 })

  const type = file.type || 'image/png'
  const ext = type.includes('svg') ? 'svg' : type.includes('jpeg') || type.includes('jpg') ? 'jpg' : type.includes('webp') ? 'webp' : 'png'
  const path = `config/logo-${Date.now()}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, buf, {
    contentType: type,
    upsert: true,
  })
  if (error) return NextResponse.json({ error: 'Upload thất bại: ' + error.message }, { status: 500 })

  const url = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  const { error: e2 } = await supabaseAdmin
    .from('vhjscvpp_cauhinh')
    .upsert({ key: 'logo_url', value: url }, { onConflict: 'key' })
  if (e2) return NextResponse.json({ error: 'Lưu URL thất bại' }, { status: 500 })

  return NextResponse.json({ ok: true, url })
}

// Xoá logo (về mặc định không logo)
export async function DELETE() {
  const session = await requireRole('admin')
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  await supabaseAdmin.from('vhjscvpp_cauhinh').delete().eq('key', 'logo_url')
  return NextResponse.json({ ok: true })
}
