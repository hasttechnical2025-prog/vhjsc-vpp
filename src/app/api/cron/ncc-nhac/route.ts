import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { guiTelegram, escHtml } from '@/lib/telegram'
import { formatDate } from '@/lib/format'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Nhắc hạn hợp đồng NCC sắp hết hạn (trong 30 ngày). Gọi bởi Vercel Cron
// (header x-vercel-cron) hoặc admin/HCNS bấm thủ công.
const NGAY_CANH_BAO = 30

async function chay() {
  const homNay = new Date()
  const moc = new Date(homNay.getTime() + NGAY_CANH_BAO * 86400_000)
  const iso = (d: Date) => d.toISOString().slice(0, 10)

  const { data } = await supabaseAdmin
    .from('vhjscvpp_ncc')
    .select('ten, nhom_chi_phi, hop_dong_het_han')
    .eq('trang_thai', 'dang_dung')
    .not('hop_dong_het_han', 'is', null)
    .gte('hop_dong_het_han', iso(homNay))
    .lte('hop_dong_het_han', iso(moc))
    .order('hop_dong_het_han', { ascending: true })

  const list = data || []
  if (list.length > 0) {
    const dong = list
      .map((n) => `• <b>${escHtml(n.ten)}</b> — hết hạn ${formatDate(n.hop_dong_het_han)}${n.nhom_chi_phi ? ` (${escHtml(n.nhom_chi_phi)})` : ''}`)
      .join('\n')
    await guiTelegram(`⏰ <b>Hợp đồng NCC sắp hết hạn (${NGAY_CANH_BAO} ngày tới)</b>\n${dong}`)
  }
  return list.length
}

export async function GET(req: Request) {
  const laCron = req.headers.get('x-vercel-cron') != null
  const secret = process.env.CRON_SECRET
  const authOk = secret ? req.headers.get('authorization') === `Bearer ${secret}` : false
  if (!laCron && !authOk) {
    const session = await getSession()
    if (!session || (session.role !== 'admin' && session.role !== 'hcns'))
      return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  }
  const so = await chay()
  return NextResponse.json({ ok: true, so_hop_dong_sap_het_han: so })
}
