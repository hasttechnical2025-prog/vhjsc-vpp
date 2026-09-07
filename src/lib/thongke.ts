import { supabaseAdmin, selectAll } from '@/lib/supabase-admin'

// Thống kê CHỈ trên phiếu ĐÃ DUYỆT, lọc theo khoảng ngày lập (created_at) + phòng ban.

export type FlatRow = {
  thang: string
  phong_ban_ten: string
  nguoi_de_nghi_ten: string
  ma: string
  ten: string
  mau: string
  nhom: string
  dvt: string
  so_luong: number
  don_gia: number
  thanh_tien: number
}

export type MuaRow = { ma: string; ten: string; mau: string; nhom: string; dvt: string; tong_sl: number; don_gia: number; thanh_tien: number }
export type PhongRow = { phong: string; so_phieu: number; tong_tien: number }

export type KetQua = {
  kpi: { tongTien: number; soPhieu: number; soPhong: number; soMatHang: number }
  tongHopMua: MuaRow[]
  theoPhong: PhongRow[]
  flat: FlatRow[]
}

type PhieuLite = {
  id: string
  phong_ban_id: string | null
  phong_ban_ten: string
  nguoi_de_nghi_ten: string
  thang: string
  tong_tien: number
  created_at: string
}
type DongLite = {
  phieu_id: string
  san_pham_id: number | null
  ten_hang: string | null
  ten_tay: string | null
  dvt: string | null
  don_gia: number | null
  so_luong: number
  mau: string | null
}

const RONG: KetQua = { kpi: { tongTien: 0, soPhieu: 0, soPhong: 0, soMatHang: 0 }, tongHopMua: [], theoPhong: [], flat: [] }

export async function thongKe(tuISO: string | null, denISO: string | null, phongBanId: string | null): Promise<KetQua> {
  const phieu = await selectAll<PhieuLite>((from, to) => {
    let q = supabaseAdmin
      .from('vhjscvpp_phieu')
      .select('id, phong_ban_id, phong_ban_ten, nguoi_de_nghi_ten, thang, tong_tien, created_at')
      .eq('trang_thai', 'da_duyet')
      .order('created_at', { ascending: false })
      .range(from, to)
    if (tuISO) q = q.gte('created_at', tuISO)
    if (denISO) q = q.lte('created_at', denISO)
    if (phongBanId) q = q.eq('phong_ban_id', phongBanId)
    return q
  })
  if (phieu.length === 0) return RONG

  const phieuMap = new Map(phieu.map((p) => [p.id, p]))
  const ids = phieu.map((p) => p.id)

  const dong = await selectAll<DongLite>((from, to) =>
    supabaseAdmin
      .from('vhjscvpp_phieu_dong')
      .select('phieu_id, san_pham_id, ten_hang, ten_tay, dvt, don_gia, so_luong, mau')
      .in('phieu_id', ids)
      .range(from, to),
  )

  // Nhóm hàng của sản phẩm (để cột "Nhóm")
  const spIds = [...new Set(dong.map((d) => d.san_pham_id).filter((x): x is number => x != null))]
  const nhomMap = new Map<number, string>()
  if (spIds.length) {
    const sps = await selectAll<{ id: number; nhom_hang: string }>((from, to) =>
      supabaseAdmin.from('vhjscvpp_san_pham').select('id, nhom_hang').in('id', spIds).range(from, to),
    )
    for (const s of sps) nhomMap.set(s.id, s.nhom_hang)
  }

  const flat: FlatRow[] = dong.map((d) => {
    const p = phieuMap.get(d.phieu_id)!
    const dg = Number(d.don_gia) || 0
    const sl = Number(d.so_luong) || 0
    return {
      thang: p.thang,
      phong_ban_ten: p.phong_ban_ten || '',
      nguoi_de_nghi_ten: p.nguoi_de_nghi_ten,
      ma: d.san_pham_id != null ? String(d.san_pham_id) : '',
      ten: d.ten_hang || d.ten_tay || '',
      mau: d.mau || '',
      nhom: d.san_pham_id != null ? nhomMap.get(d.san_pham_id) || '' : '(Khác)',
      dvt: d.dvt || '',
      so_luong: sl,
      don_gia: dg,
      thanh_tien: dg * sl,
    }
  })

  // Tổng hợp mua: gộp theo mã hàng + màu (mục khác gộp theo tên)
  const gMap = new Map<string, MuaRow>()
  for (const r of flat) {
    const key = (r.ma || 'T:' + r.ten.toLowerCase().trim()) + '|' + r.mau
    const g = gMap.get(key) || { ma: r.ma, ten: r.ten, mau: r.mau, nhom: r.nhom, dvt: r.dvt, tong_sl: 0, don_gia: 0, thanh_tien: 0 }
    g.tong_sl += r.so_luong
    g.thanh_tien += r.thanh_tien
    gMap.set(key, g)
  }
  const tongHopMua = [...gMap.values()]
    .map((g) => ({ ...g, don_gia: g.tong_sl ? Math.round(g.thanh_tien / g.tong_sl) : 0 }))
    .sort((a, b) => a.nhom.localeCompare(b.nhom, 'vi') || b.thanh_tien - a.thanh_tien)

  // Chi phí theo phòng
  const pMap = new Map<string, PhongRow>()
  for (const p of phieu) {
    const ten = p.phong_ban_ten || '—'
    const g = pMap.get(ten) || { phong: ten, so_phieu: 0, tong_tien: 0 }
    g.so_phieu += 1
    g.tong_tien += Number(p.tong_tien) || 0
    pMap.set(ten, g)
  }
  const theoPhong = [...pMap.values()].sort((a, b) => b.tong_tien - a.tong_tien)

  const kpi = {
    tongTien: phieu.reduce((s, p) => s + (Number(p.tong_tien) || 0), 0),
    soPhieu: phieu.length,
    soPhong: new Set(phieu.map((p) => p.phong_ban_ten || '—')).size,
    soMatHang: gMap.size,
  }

  return { kpi, tongHopMua, theoPhong, flat }
}

// Chuyển tham số ngày (YYYY-MM-DD) thành mốc thời gian bao trọn ngày theo giờ VN (+07).
export function bienNgay(tu: string | null, den: string | null) {
  const tuISO = tu ? `${tu}T00:00:00+07:00` : null
  const denISO = den ? `${den}T23:59:59+07:00` : null
  return { tuISO, denISO }
}
