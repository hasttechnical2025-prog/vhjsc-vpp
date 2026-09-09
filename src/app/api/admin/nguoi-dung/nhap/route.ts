import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { supabaseAdmin, selectAll } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const maxDuration = 60

// Sentinel: user import chưa có mật khẩu (đăng nhập bằng Google).
const KHONG_MAT_KHAU = 'SSO_NO_PASSWORD'

const boDau = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim()
const gonKhoang = (s: string) => s.replace(/\s+/g, ' ').trim()

// Một số tên phòng trong danh bạ HR khác cách gọi trong app → gộp về phòng đã có.
const ALIAS: Record<string, string> = {
  'cn ho chi minh': 'chi nhanh hcm',
  'chi nhanh ho chi minh': 'chi nhanh hcm',
  'vpdd da nang': 'van phong da nang',
  'phong quan ly chat luong va chi phi': 'phong quan ly chi phi va chat luong',
}

// Xếp hạng chức vụ để chọn TRƯỞNG bộ phận (nhỏ hơn = ưu tiên hơn). >2 = không coi là trưởng.
function rankChucVu(cv: string): number {
  const c = boDau(cv)
  if (/^(truong phong|truong ban|truong bo phan)/.test(c)) return 0
  if (/giam doc/.test(c) && !/pho giam doc/.test(c)) return 1
  if (/tong giam doc|chu tich/.test(c)) return 1
  if (/^(pho phong|pho ban)/.test(c) || /pho giam doc/.test(c)) return 2
  return 9
}

const STOP = new Set(['va', 'and', '-', '/', '&', ''])
// Sinh mã viết tắt từ tên phòng (bỏ tiền tố Phòng/Văn phòng/Bộ phận; Chi nhánh→CN).
function sinhMa(ten: string): string {
  let s = boDau(ten)
  let cn = ''
  if (s.startsWith('chi nhanh ')) { cn = 'CN'; s = s.slice('chi nhanh '.length) }
  else if (s.startsWith('van phong ')) s = s.slice('van phong '.length)
  else if (s.startsWith('phong ')) s = s.slice('phong '.length)
  else if (s.startsWith('bo phan ')) s = s.slice('bo phan '.length)
  const tu = s.split(' ').filter((w) => !STOP.has(w))
  let ma: string
  if (tu.length === 1) ma = tu[0].toUpperCase() // acronym/1 từ (VHIP…)
  else ma = tu.map((w) => w[0]).join('').toUpperCase()
  ma = (cn + ma).replace(/[^A-Z0-9]/g, '').slice(0, 8)
  return ma || boDau(ten).replace(/[^a-z0-9]/g, '').slice(0, 6).toUpperCase()
}

type Row = { ho_ten?: string; email?: string; phong_ban?: string; chuc_vu?: string }

// Import danh sách user (Họ tên, Email, Phòng ban, Chức vụ). Upsert theo email; user
// mới cấp mặc định VPP: Người đề nghị. TỰ tạo phòng ban chưa có (đồng bộ danh bạ) +
// sinh mã viết tắt + dò TRƯỞNG bộ phận theo chức vụ. KHÔNG đụng super-admin/bảo vệ,
// KHÔNG ghi đè trưởng bộ phận đã có.
export async function POST(req: Request) {
  const session = await requireRole('admin')
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  const body = await req.json().catch(() => null)
  const rows: Row[] = Array.isArray(body?.rows) ? body.rows : []
  if (rows.length === 0) return NextResponse.json({ error: 'File không có dòng nào' }, { status: 400 })

  const phong = await selectAll<{ id: string; ten: string; ma: string | null; truong_bo_phan: string | null }>((from, to) =>
    supabaseAdmin.from('vhjscvpp_phong_ban').select('id, ten, ma, truong_bo_phan').range(from, to),
  )
  const phongTheoKey = new Map(phong.map((p) => [boDau(p.ten), p])) // key bỏ dấu → bản ghi
  const maDaDung = new Set(phong.map((p) => (p.ma || '').toUpperCase()).filter(Boolean))
  const users = await selectAll<{ id: string; email: string | null; bao_ve: boolean; sieu_admin: boolean }>((from, to) =>
    supabaseAdmin.from('vhjscvpp_nguoi_dung').select('id, email, bao_ve, sieu_admin').range(from, to),
  )
  const theoEmail = new Map(users.filter((u) => u.email).map((u) => [u.email!.toLowerCase(), u]))

  // 1) Làm sạch + khử trùng theo email (ưu tiên dòng có phòng ban).
  type Sach = { ho_ten: string; email: string; phongKey: string; phongTen: string; chuc_vu: string }
  const theoEmailSach = new Map<string, Sach>()
  let loi = 0
  for (const r of rows) {
    const ho_ten = gonKhoang(String(r.ho_ten ?? ''))
    const email = String(r.email ?? '').trim().toLowerCase()
    if (!ho_ten || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { loi++; continue }
    const ptenRaw = gonKhoang(String(r.phong_ban ?? ''))
    const key0 = boDau(ptenRaw)
    const phongKey = key0 ? (ALIAS[key0] ?? key0) : ''
    const chuc_vu = gonKhoang(String(r.chuc_vu ?? ''))
    const cu = theoEmailSach.get(email)
    if (cu) {
      if (!cu.phongKey && phongKey) { cu.phongKey = phongKey; cu.phongTen = ptenRaw }
      if (!cu.chuc_vu && chuc_vu) cu.chuc_vu = chuc_vu
      continue
    }
    theoEmailSach.set(email, { ho_ten, email, phongKey, phongTen: ptenRaw, chuc_vu })
  }
  const danhSach = [...theoEmailSach.values()]

  // 2) Dò TRƯỞNG bộ phận cho từng phòng (theo chức vụ), gom thành viên theo phongKey.
  const truongTheoKey = new Map<string, { ho_ten: string; rank: number }>()
  for (const s of danhSach) {
    if (!s.phongKey) continue
    const rk = rankChucVu(s.chuc_vu)
    if (rk > 2) continue
    const cur = truongTheoKey.get(s.phongKey)
    if (!cur || rk < cur.rank) truongTheoKey.set(s.phongKey, { ho_ten: s.ho_ten, rank: rk })
  }

  // 3) Tạo phòng ban chưa có (ten + mã viết tắt + trưởng nếu dò được).
  const phongMoiTao: string[] = []
  const canTao = new Map<string, string>() // phongKey → tên hiển thị
  for (const s of danhSach) {
    if (s.phongKey && !phongTheoKey.has(s.phongKey) && !canTao.has(s.phongKey)) canTao.set(s.phongKey, s.phongTen)
  }
  if (canTao.size > 0) {
    const moi = [...canTao.entries()].map(([key, ten]) => {
      let ma = sinhMa(ten)
      let base = ma, n = 1
      while (maDaDung.has(ma)) { n++; ma = (base + n).slice(0, 8) }
      maDaDung.add(ma)
      return { key, ten, ma, truong_bo_phan: truongTheoKey.get(key)?.ho_ten ?? null }
    })
    const { data: pbMoi, error } = await supabaseAdmin
      .from('vhjscvpp_phong_ban')
      .insert(moi.map(({ ten, ma, truong_bo_phan }) => ({ ten, ma, truong_bo_phan })))
      .select('id, ten')
    if (error) return NextResponse.json({ error: 'Không tạo được phòng ban: ' + error.message }, { status: 500 })
    for (const p of pbMoi ?? []) { phongTheoKey.set(boDau(p.ten), { id: p.id, ten: p.ten, ma: null, truong_bo_phan: null }); phongMoiTao.push(p.ten) }
  }

  // 4) Điền trưởng cho phòng ĐÃ CÓ nhưng đang trống (KHÔNG ghi đè phòng đã có trưởng).
  let truongDaDien = 0
  for (const [key, t] of truongTheoKey) {
    const p = phongTheoKey.get(key)
    if (p && !canTao.has(key) && !(p.truong_bo_phan && p.truong_bo_phan.trim())) {
      const { error } = await supabaseAdmin.from('vhjscvpp_phong_ban').update({ truong_bo_phan: t.ho_ten }).eq('id', p.id)
      if (!error) { truongDaDien++; p.truong_bo_phan = t.ho_ten }
    }
  }

  const idPhong = (s: Sach) => (s.phongKey ? phongTheoKey.get(s.phongKey)?.id ?? null : null)

  // 5) Chia cập nhật / bỏ qua / thêm mới.
  let capNhat = 0, boQua = 0, them = 0, trongPhong = 0
  const themMoi: Sach[] = []
  for (const s of danhSach) {
    if (!s.phongKey) trongPhong++
    const cur = theoEmail.get(s.email)
    if (cur) {
      if (cur.bao_ve || cur.sieu_admin) { boQua++; continue }
      const upd: Record<string, unknown> = { ho_ten: s.ho_ten }
      const pid = idPhong(s)
      if (pid) upd.phong_ban_id = pid
      const { error } = await supabaseAdmin.from('vhjscvpp_nguoi_dung').update(upd).eq('id', cur.id)
      if (error) loi++; else capNhat++
    } else {
      themMoi.push(s)
    }
  }

  // 6) Thêm mới + cấp quyền mặc định theo LÔ.
  if (themMoi.length > 0) {
    const { data: ins, error } = await supabaseAdmin
      .from('vhjscvpp_nguoi_dung')
      .insert(
        themMoi.map((s) => ({
          ho_ten: s.ho_ten, email: s.email, username: s.email,
          password_hash: KHONG_MAT_KHAU, role: 'nguoi_de_nghi', phong_ban_id: idPhong(s), is_active: true,
        })),
      )
      .select('id')
    if (error) return NextResponse.json({ error: 'Không thêm được người dùng: ' + error.message }, { status: 500 })
    them = ins?.length ?? 0
    if (ins?.length) {
      const { error: eq } = await supabaseAdmin.from('vhjscvpp_quyen').upsert(
        ins.map((u) => ({ nguoi_dung_id: u.id, module: 'vpp', vai_tro: 'nguoi_de_nghi' })),
        { onConflict: 'nguoi_dung_id,module' },
      )
      if (eq) loi += ins.length
    }
  }

  return NextResponse.json({ ok: true, them, capNhat, boQua, loi, trongPhong, phongMoiTao, truongDaDien })
}
