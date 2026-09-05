import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { supabaseAdmin, selectAll } from '@/lib/supabase-admin'
import { chuanHoaTen, khoaNhom } from '@/lib/match'

// Nhận danh sách dòng bóc từ file báo giá (đã parse ở trình duyệt), đối chiếu với
// danh mục hiện tại theo tên (trong cùng nhóm hàng). Trả về bảng diff.

type FileRow = {
  nhom_hang: string
  ten: string
  xuat_xu?: string | null
  quy_cach?: string | null
  dvt?: string | null
  don_gia: number | null
}

type Sp = { id: number; nhom_hang: string; ten: string; don_gia: number | null; dang_ban: boolean }

export async function POST(req: Request) {
  const session = await requireRole('admin', 'hcns')
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const rows: FileRow[] = Array.isArray(body?.rows) ? body.rows : []
  if (rows.length === 0) return NextResponse.json({ error: 'File không có dòng hợp lệ' }, { status: 400 })

  const catalog = await selectAll<Sp>((from, to) =>
    supabaseAdmin.from('vhjscvpp_san_pham').select('id, nhom_hang, ten, don_gia, dang_ban').range(from, to),
  )

  // Map danh mục theo khoá (nhóm + tên chuẩn hoá) -> danh sách id (phòng trùng tên)
  const mapCat = new Map<string, Sp[]>()
  for (const s of catalog) {
    const k = khoaNhom(s.nhom_hang) + '||' + chuanHoaTen(s.ten)
    const arr = mapCat.get(k) || []
    arr.push(s)
    mapCat.set(k, arr)
  }

  const matchedIds = new Set<number>()
  const giaDoi: { id: number; nhom_hang: string; ten: string; gia_cu: number | null; gia_moi: number | null }[] = []
  let khongDoi = 0
  const spMoi: FileRow[] = []
  const moHo: { ten: string; nhom_hang: string; so_trung: number }[] = []

  for (const r of rows) {
    const k = khoaNhom(r.nhom_hang) + '||' + chuanHoaTen(r.ten)
    const found = mapCat.get(k)
    if (!found || found.length === 0) {
      spMoi.push(r)
      continue
    }
    if (found.length > 1) {
      moHo.push({ ten: r.ten, nhom_hang: r.nhom_hang, so_trung: found.length })
      found.forEach((s) => matchedIds.add(s.id))
      continue
    }
    const s = found[0]
    matchedIds.add(s.id)
    const giaMoi = r.don_gia
    if (giaMoi != null && Number(giaMoi) !== Number(s.don_gia)) {
      giaDoi.push({ id: s.id, nhom_hang: s.nhom_hang, ten: s.ten, gia_cu: s.don_gia, gia_moi: giaMoi })
    } else {
      khongDoi++
    }
  }

  // SP đang bán nhưng không thấy trong file mới -> gợi ý ẩn
  const khongCon = catalog
    .filter((s) => s.dang_ban && !matchedIds.has(s.id))
    .map((s) => ({ id: s.id, nhom_hang: s.nhom_hang, ten: s.ten, gia_cu: s.don_gia }))

  return NextResponse.json({
    ok: true,
    tong_dong_file: rows.length,
    giaDoi,
    khongDoi,
    spMoi,
    khongCon,
    moHo,
  })
}
