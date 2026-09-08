import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { xoaCacheSanPham } from '@/lib/catalog'

export const runtime = 'nodejs'

const BUCKET = 'vhjscvpp-images'

// Lấy đường dẫn trong bucket từ public URL (null nếu không thuộc bucket này).
function pathTuUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const marker = `/${BUCKET}/`
  const i = url.indexOf(marker)
  if (i < 0) return null
  try {
    return decodeURIComponent(url.slice(i + marker.length))
  } catch {
    return url.slice(i + marker.length)
  }
}

// Xoá file trong kho để tránh phình dung lượng — CHỈ khi không mặt hàng nào khác
// còn trỏ tới URL đó (tránh xoá nhầm ảnh dùng chung).
async function xoaFileNeuMoCoi(oldUrl: string | null, exceptId: number): Promise<void> {
  const path = pathTuUrl(oldUrl)
  if (!path) return
  const { count } = await supabaseAdmin
    .from('vhjscvpp_san_pham')
    .select('id', { count: 'exact', head: true })
    .eq('anh_url', oldUrl)
    .neq('id', exceptId)
  if (count && count > 0) return // còn SP khác dùng -> giữ lại
  await supabaseAdmin.storage.from(BUCKET).remove([path])
}

// Thay ảnh 1 mặt hàng (chỉ admin): upload ảnh mới, cập nhật anh_url, XOÁ ảnh cũ
// khỏi kho để không tích luỹ file thừa.
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

  // Ảnh cũ (để dọn sau khi thay xong)
  const { data: cur } = await supabaseAdmin.from('vhjscvpp_san_pham').select('anh_url').eq('id', id).maybeSingle()
  const anhCu = cur?.anh_url ?? null

  const path = `san-pham/sp-${id}-${Date.now()}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, buf, { contentType: type, upsert: true })
  if (error) return NextResponse.json({ error: 'Upload thất bại: ' + error.message }, { status: 500 })

  const url = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  const { error: e2 } = await supabaseAdmin.from('vhjscvpp_san_pham').update({ anh_url: url }).eq('id', id)
  if (e2) return NextResponse.json({ error: 'Lưu ảnh thất bại' }, { status: 500 })

  if (anhCu && anhCu !== url) await xoaFileNeuMoCoi(anhCu, id) // dọn ảnh cũ
  xoaCacheSanPham()
  return NextResponse.json({ ok: true, url })
}

// Xoá ảnh 1 mặt hàng (chỉ admin) -> anh_url = null (hiển thị "Không ảnh") + xoá
// file khỏi kho để không tích luỹ.
export async function DELETE(req: Request) {
  const session = await requireRole('admin')
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  const b = await req.json().catch(() => null)
  const id = Number(b?.id)
  if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })

  const { data: cur } = await supabaseAdmin.from('vhjscvpp_san_pham').select('anh_url').eq('id', id).maybeSingle()
  const anhCu = cur?.anh_url ?? null

  const { error } = await supabaseAdmin.from('vhjscvpp_san_pham').update({ anh_url: null }).eq('id', id)
  if (error) return NextResponse.json({ error: 'Xoá ảnh thất bại' }, { status: 500 })

  await xoaFileNeuMoCoi(anhCu, id)
  xoaCacheSanPham()
  return NextResponse.json({ ok: true })
}
