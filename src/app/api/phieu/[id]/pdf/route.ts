import { getSession } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { buildBM01 } from '@/lib/pdf/bm01'

export const runtime = 'nodejs'

type DongRow = {
  ten_tay: string | null
  dvt: string | null
  so_luong: number
  thoi_gian_can: string | null
  ke_hoach_su_dung: string | null
  ghi_chu: string | null
  thu_tu: number
  san_pham: { ten: string } | null
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return new Response('Chưa đăng nhập', { status: 401 })
  const { id } = await params

  const { data: phieu } = await supabaseAdmin.from('vpp_phieu').select('*').eq('id', id).maybeSingle()
  if (!phieu) return new Response('Không tìm thấy phiếu', { status: 404 })

  const { data: dong } = await supabaseAdmin
    .from('vpp_phieu_dong')
    .select('ten_tay, dvt, so_luong, thoi_gian_can, ke_hoach_su_dung, ghi_chu, thu_tu, san_pham:vpp_san_pham(ten)')
    .eq('phieu_id', id)
    .order('thu_tu', { ascending: true })

  const rows = (dong || []) as unknown as DongRow[]

  const pdf = await buildBM01(phieu, rows)

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="DeXuatVPP_${phieu.thang}.pdf"`,
    },
  })
}
