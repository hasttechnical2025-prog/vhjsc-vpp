import { getSession } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { buildBM01 } from '@/lib/pdf/bm01'

export const runtime = 'nodejs'

type DongRow = {
  san_pham_id: number | null
  ten_hang: string | null
  ten_tay: string | null
  dvt: string | null
  so_luong: number
  ghi_chu: string | null
  thu_tu: number
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return new Response('Chưa đăng nhập', { status: 401 })
  const { id } = await params

  const { data: phieu } = await supabaseAdmin.from('vhjscvpp_phieu').select('*').eq('id', id).maybeSingle()
  if (!phieu) return new Response('Không tìm thấy phiếu', { status: 404 })

  const { data: dong } = await supabaseAdmin
    .from('vhjscvpp_phieu_dong')
    .select('san_pham_id, ten_hang, ten_tay, dvt, so_luong, ghi_chu, thu_tu')
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
