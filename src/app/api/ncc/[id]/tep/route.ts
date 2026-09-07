import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
const BUCKET = 'vhjscvpp-images'

// Đính kèm tệp hợp đồng/hồ sơ NCC (PDF/ảnh) — chỉ admin & HCNS.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole('admin', 'hcns')
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  const { id } = await params

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Thiếu tệp' }, { status: 400 })
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Tệp quá 10MB' }, { status: 400 })

  const type = file.type || 'application/octet-stream'
  const goc = file.name || 'tep'
  const ext = (goc.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)
  const p = `ncc/${id}/${Date.now()}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(p, buf, { contentType: type, upsert: true })
  if (error) return NextResponse.json({ error: 'Tải lên thất bại: ' + error.message }, { status: 500 })

  const url = supabaseAdmin.storage.from(BUCKET).getPublicUrl(p).data.publicUrl
  const { data, error: e2 } = await supabaseAdmin
    .from('vhjscvpp_ncc_tep')
    .insert({ ncc_id: id, ten_tep: goc, url })
    .select('id, ten_tep, url, created_at')
    .single()
  if (e2) return NextResponse.json({ error: 'Lưu tệp thất bại' }, { status: 500 })
  return NextResponse.json({ ok: true, tep: data })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole('admin', 'hcns')
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  await params
  const b = await req.json().catch(() => null)
  if (!b?.tep_id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })
  const { error } = await supabaseAdmin.from('vhjscvpp_ncc_tep').delete().eq('id', b.tep_id)
  if (error) return NextResponse.json({ error: 'Xoá thất bại' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
