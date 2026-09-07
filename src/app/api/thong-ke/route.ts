import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { thongKe, bienNgay } from '@/lib/thongke'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await requireRole('admin', 'hcns')
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })

  const url = new URL(req.url)
  const { tuISO, denISO } = bienNgay(url.searchParams.get('tu'), url.searchParams.get('den'))
  const pb = url.searchParams.get('pb') || null

  const kq = await thongKe(tuISO, denISO, pb)
  // Không trả 'flat' (nặng) cho màn hình — chỉ dùng khi xuất Excel
  return NextResponse.json({ kpi: kq.kpi, tongHopMua: kq.tongHopMua, theoPhong: kq.theoPhong })
}
