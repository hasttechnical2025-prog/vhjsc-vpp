import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  const session = await requireRole()
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body || !Array.isArray(body.dong) || body.dong.length === 0) {
    return NextResponse.json({ error: 'Phiếu rỗng' }, { status: 400 })
  }

  // Tên phòng ban + trưởng bộ phận (snapshot)
  let phongBanTen = ''
  let truongBoPhan: string | null = null
  if (session.phong_ban_id) {
    const { data } = await supabaseAdmin
      .from('vhjscvpp_phong_ban')
      .select('ten, truong_bo_phan')
      .eq('id', session.phong_ban_id)
      .maybeSingle()
    phongBanTen = data?.ten || ''
    truongBoPhan = data?.truong_bo_phan || null
  }

  const tongTien = body.dong.reduce(
    (s: number, d: { don_gia?: number; so_luong?: number }) => s + (Number(d.don_gia) || 0) * (Number(d.so_luong) || 0),
    0,
  )

  const { data: phieu, error: e1 } = await supabaseAdmin
    .from('vhjscvpp_phieu')
    .insert({
      phong_ban_id: session.phong_ban_id,
      phong_ban_ten: phongBanTen,
      truong_bo_phan: truongBoPhan,
      nguoi_de_nghi_id: session.id,
      nguoi_de_nghi_ten: session.ho_ten,
      thang: String(body.thang || '').slice(0, 7),
      tieu_de: body.tieu_de || null,
      thoi_gian_can: body.thoi_gian_can || null,
      ke_hoach_su_dung: body.ke_hoach_su_dung || null,
      ghi_chu: body.ghi_chu || null,
      trang_thai: 'nhap',
      tong_tien: tongTien,
    })
    .select('id')
    .single()

  if (e1 || !phieu) return NextResponse.json({ error: 'Không tạo được phiếu' }, { status: 500 })

  const rows = body.dong.map((d: Record<string, unknown>, i: number) => ({
    phieu_id: phieu.id,
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
  if (e2) {
    // rollback thủ công: phiếu vừa tạo mà dòng lỗi -> xoá phiếu để không để rác
    await supabaseAdmin.from('vhjscvpp_phieu').delete().eq('id', phieu.id)
    return NextResponse.json({ error: 'Không lưu được dòng phiếu' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: phieu.id })
}
