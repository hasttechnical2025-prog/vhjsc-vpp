import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { xoaCacheSanPham } from '@/lib/catalog'

export const runtime = 'nodejs'

const BUCKET = 'vhjscvpp-images'

// Thay ảnh 1 mặt hàng (chỉ admin). Upload lên Storage rồi cập nhật anh_url.
export async function POST(req: Request) {
  const session = await requireRole('admin')
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  const id = Number(form?.get('id'))
  if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })
  if (!(file instanceof File)) return NextResponse.json({ error: 'Thiếu file ảnh' }, { status: 400 })
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Ảnh quá 5MB' }, { status: 400 })

  const type = file.type || 'image/jpeg'
  if (!/image\/(png|jpe?g|webp)/i.test(type))
    return NextResponse.json({ error: 'Chỉ nhận PNG / JPG / WEBP' }, { status: 400 })
  const ext = /png/i.test(type) ? 'png' : /webp/i.test(type) ? 'webp' : 'jpg'
  const path = `san-pham/sp-${id}-${Date.now()}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, buf, { contentType: type, upsert: true })
  if (error) return NextResponse.json({ error: 'Upload thất bại: ' + error.message }, { status: 500 })

  const url = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  const { error: e2 } = await supabaseAdmin.from('vhjscvpp_san_pham').update({ anh_url: url }).eq('id', id)
  if (e2) return NextResponse.json({ error: 'Lưu ảnh thất bại' }, { status: 500 })

  xoaCacheSanPham()
  return NextResponse.json({ ok: true, url })
}

// Xoá ảnh 1 mặt hàng (chỉ admin) -> anh_url = null, hiển thị "Không ảnh".
// Giữ file trong bucket (vô hại) để đơn giản; chỉ gỡ liên kết.
export async function DELETE(req: Request) {
  const session = await requireRole('admin')
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  const b = await req.json().catch(() => null)
  const id = Number(b?.id)
  if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })
  const { error } = await supabaseAdmin.from('vhjscvpp_san_pham').update({ anh_url: null }).eq('id', id)
  if (error) return NextResponse.json({ error: 'Xoá ảnh thất bại' }, { status: 500 })
  xoaCacheSanPham()
  return NextResponse.json({ ok: true })
}
