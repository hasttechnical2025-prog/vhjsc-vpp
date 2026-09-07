import { getSession } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { buildBM01 } from '@/lib/pdf/bm01'
import { getCauHinh } from '@/lib/config'

export const runtime = 'nodejs'

// Tải logo (PNG/JPEG) về base64 data URI để nhúng vào PDF (pdfmake chỉ nhận PNG/JPEG).
async function taiLogo(url: string | null): Promise<string | null> {
  if (!url) return null
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    const ct = r.headers.get('content-type') || ''
    if (!/png|jpe?g/i.test(ct)) return null
    const buf = Buffer.from(await r.arrayBuffer())
    const mime = /png/i.test(ct) ? 'image/png' : 'image/jpeg'
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

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

  // Trưởng bộ phận: nếu phiếu chưa có (phiếu cũ) thì lấy theo phòng ban hiện tại
  if (!phieu.truong_bo_phan && phieu.phong_ban_id) {
    const { data: pb } = await supabaseAdmin
      .from('vhjscvpp_phong_ban')
      .select('truong_bo_phan')
      .eq('id', phieu.phong_ban_id)
      .maybeSingle()
    if (pb?.truong_bo_phan) phieu.truong_bo_phan = pb.truong_bo_phan
  }

  const cauHinh = await getCauHinh()
  const logoDataUri = await taiLogo(cauHinh.logo_url)

  const pdf = await buildBM01(phieu, rows, logoDataUri)

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="DeXuatVPP_${phieu.thang}.pdf"`,
    },
  })
}
