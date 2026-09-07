import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Duyệt / Từ chối phiếu — chỉ admin & HCNS.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole('admin', 'hcns')
  if (!session) return NextResponse.json({ error: 'Không có quyền duyệt' }, { status: 403 })
  const { id } = await params

  const body = await req.json().catch(() => null)
  const action = body?.action

  const { data: phieu } = await supabaseAdmin.from('vhjscvpp_phieu').select('id').eq('id', id).maybeSingle()
  if (!phieu) return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 })

  if (action === 'duyet') {
    const { error } = await supabaseAdmin
      .from('vhjscvpp_phieu')
      .update({
        trang_thai: 'da_duyet',
        nguoi_duyet_ten: session.ho_ten,
        thoi_diem_duyet: new Date().toISOString(),
        ly_do_tu_choi: null,
      })
      .eq('id', id)
    if (error) return NextResponse.json({ error: 'Duyệt thất bại' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'tu_choi') {
    const lyDo = (body?.ly_do ?? '').toString().trim()
    if (!lyDo) return NextResponse.json({ error: 'Nhập lý do từ chối' }, { status: 400 })
    const { error } = await supabaseAdmin
      .from('vhjscvpp_phieu')
      .update({
        trang_thai: 'tu_choi',
        nguoi_duyet_ten: session.ho_ten,
        thoi_diem_duyet: new Date().toISOString(),
        ly_do_tu_choi: lyDo,
      })
      .eq('id', id)
    if (error) return NextResponse.json({ error: 'Từ chối thất bại' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 })
}
