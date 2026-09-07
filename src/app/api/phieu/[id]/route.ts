import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Quyền trên 1 phiếu: người lập phiếu, hoặc admin/hcns.
async function layPhieuNeuDuocPhep(id: string, session: { id: string; role: string }) {
  const { data } = await supabaseAdmin
    .from('vhjscvpp_phieu')
    .select('id, nguoi_de_nghi_id')
    .eq('id', id)
    .maybeSingle()
  if (!data) return { phieu: null, allowed: false }
  const allowed = session.role === 'admin' || session.role === 'hcns' || data.nguoi_de_nghi_id === session.id
  return { phieu: data, allowed }
}

// Lấy chi tiết phiếu + các dòng (cho accordion xem nhanh)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole()
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  const { id } = await params
  const { phieu, allowed } = await layPhieuNeuDuocPhep(id, session)
  if (!phieu) return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })

  const { data: dong } = await supabaseAdmin
    .from('vhjscvpp_phieu_dong')
    .select('san_pham_id, ten_hang, ten_tay, dvt, don_gia, so_luong, ghi_chu, thu_tu')
    .eq('phieu_id', id)
    .order('thu_tu', { ascending: true })

  return NextResponse.json({ dong: dong || [] })
}

// Sửa phiếu: cập nhật thông tin chung + thay toàn bộ dòng
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole()
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  const { id } = await params

  const { phieu, allowed } = await layPhieuNeuDuocPhep(id, session)
  if (!phieu) return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: 'Không có quyền sửa phiếu này' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body || !Array.isArray(body.dong) || body.dong.length === 0)
    return NextResponse.json({ error: 'Phiếu rỗng' }, { status: 400 })

  const tongTien = body.dong.reduce(
    (s: number, d: { don_gia?: number; so_luong?: number }) => s + (Number(d.don_gia) || 0) * (Number(d.so_luong) || 0),
    0,
  )

  const { error: e1 } = await supabaseAdmin
    .from('vhjscvpp_phieu')
    .update({
      thang: String(body.thang || '').slice(0, 7),
      tieu_de: body.tieu_de || null,
      thoi_gian_can: body.thoi_gian_can || null,
      ke_hoach_su_dung: body.ke_hoach_su_dung || null,
      ghi_chu: body.ghi_chu || null,
      tong_tien: tongTien,
      // Sửa phiếu -> quay lại Chờ duyệt, xoá dấu duyệt/từ chối cũ
      trang_thai: 'cho_duyet',
      nguoi_duyet_ten: null,
      thoi_diem_duyet: null,
      ly_do_tu_choi: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (e1) return NextResponse.json({ error: 'Không cập nhật được phiếu' }, { status: 500 })

  // Thay toàn bộ dòng
  await supabaseAdmin.from('vhjscvpp_phieu_dong').delete().eq('phieu_id', id)
  const rows = body.dong.map((d: Record<string, unknown>, i: number) => ({
    phieu_id: id,
    san_pham_id: d.san_pham_id ?? null,
    ten_hang: d.ten_hang ?? d.ten_tay ?? null,
    ten_tay: d.ten_tay ?? null,
    dvt: d.dvt ?? null,
    don_gia: d.don_gia ?? null,
    so_luong: Number(d.so_luong) || 0,
    ghi_chu: d.ghi_chu ?? null,
    thu_tu: typeof d.thu_tu === 'number' ? d.thu_tu : i,
  }))
  const { error: e2 } = await supabaseAdmin.from('vhjscvpp_phieu_dong').insert(rows)
  if (e2) return NextResponse.json({ error: 'Không lưu được dòng phiếu' }, { status: 500 })

  return NextResponse.json({ ok: true, id })
}

// Xoá phiếu (cascade xoá dòng)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole()
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  const { id } = await params

  const { phieu, allowed } = await layPhieuNeuDuocPhep(id, session)
  if (!phieu) return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: 'Không có quyền xoá phiếu này' }, { status: 403 })

  const { error } = await supabaseAdmin.from('vhjscvpp_phieu').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Xoá thất bại' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
