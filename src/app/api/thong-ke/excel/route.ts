import { layPhien, cap } from '@/lib/guard'
import { thongKe, bienNgay } from '@/lib/thongke'
import * as XLSX from 'xlsx'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await layPhien()
  if (!session || !cap(session, 'vpp.duyet')) return new Response('Không có quyền', { status: 403 })

  const url = new URL(req.url)
  const tu = url.searchParams.get('tu')
  const den = url.searchParams.get('den')
  const pb = url.searchParams.get('pb') || null
  const { tuISO, denISO } = bienNgay(tu, den)

  const kq = await thongKe(tuISO, denISO, pb)
  const wb = XLSX.utils.book_new()

  // Sheet 1 — Tổng hợp mua
  const s1: (string | number)[][] = [['Nhóm hàng', 'Mã hàng', 'Tên TTB/VPP', 'Màu', 'ĐVT', 'Tổng số lượng', 'Đơn giá', 'Thành tiền']]
  for (const r of kq.tongHopMua) s1.push([r.nhom, r.ma, r.ten, r.mau, r.dvt, r.tong_sl, r.don_gia, r.thanh_tien])
  s1.push(['', '', '', '', '', '', 'TỔNG', kq.kpi.tongTien])
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s1), 'Tổng hợp mua')

  // Sheet 2 — Chi phí theo phòng
  const s2: (string | number)[][] = [['Phòng ban', 'Số phiếu', 'Tổng tiền']]
  for (const r of kq.theoPhong) s2.push([r.phong, r.so_phieu, r.tong_tien])
  s2.push(['TỔNG', kq.kpi.soPhieu, kq.kpi.tongTien])
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s2), 'Theo phòng')

  // Sheet 3 — Dữ liệu thô (để tự pivot)
  const s3: (string | number)[][] = [
    ['Tháng', 'Phòng ban', 'Người đề nghị', 'Mã hàng', 'Tên TTB/VPP', 'Màu', 'Nhóm hàng', 'ĐVT', 'Số lượng', 'Đơn giá', 'Thành tiền'],
  ]
  for (const r of kq.flat)
    s3.push([r.thang, r.phong_ban_ten, r.nguoi_de_nghi_ten, r.ma, r.ten, r.mau, r.nhom, r.dvt, r.so_luong, r.don_gia, r.thanh_tien])
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s3), 'Dữ liệu thô')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  const ten = `ThongKe_VPP_${tu || 'all'}_${den || 'all'}.xlsx`
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${ten}"`,
    },
  })
}
