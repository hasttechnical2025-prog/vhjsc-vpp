import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import AppShell from '@/components/AppShell'
import { formatThang, formatTien } from '@/lib/format'

type DongRow = {
  san_pham_id: number | null
  ten_hang: string | null
  ten_tay: string | null
  dvt: string | null
  don_gia: number | null
  so_luong: number
  ghi_chu: string | null
  thu_tu: number
}

export default async function PhieuDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { id } = await params

  const { data: phieu } = await supabaseAdmin
    .from('vhjscvpp_phieu')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (!phieu) notFound()

  const { data: dong } = await supabaseAdmin
    .from('vhjscvpp_phieu_dong')
    .select('san_pham_id, ten_hang, ten_tay, dvt, don_gia, so_luong, ghi_chu, thu_tu')
    .eq('phieu_id', id)
    .order('thu_tu', { ascending: true })

  const rows = (dong || []) as unknown as DongRow[]

  return (
    <AppShell user={session}>
      <div className="flex items-center justify-between mb-4">
        <Link href="/phieu" className="text-sm text-accent-600 hover:underline">← Danh sách phiếu</Link>
        <a
          href={`/api/phieu/${id}/pdf`}
          target="_blank"
          rel="noreferrer"
          className="bg-accent hover:bg-accent-600 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          ⬇ Xuất PDF (mẫu BM01)
        </a>
      </div>

      <div className="card p-6">
        <div className="text-center mb-4">
          <div className="font-bold uppercase">Đề xuất mua văn phòng phẩm, trang thiết bị, tài sản văn phòng</div>
          <div className="text-xs text-muted">BM01/QLTS/04-HCNS</div>
        </div>
        <div className="text-sm mb-1"><b>Người đề nghị:</b> {phieu.nguoi_de_nghi_ten}</div>
        <div className="text-sm mb-1"><b>Bộ phận:</b> {phieu.phong_ban_ten || '—'}</div>
        <div className="text-sm mb-1"><b>Đề nghị:</b> {phieu.tieu_de || `Mua sắm VPP tháng ${formatThang(phieu.thang)}`}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm mb-4">
          <div><b>Thời gian cần:</b> {phieu.thoi_gian_can || '—'}</div>
          <div><b>Kế hoạch sử dụng:</b> {phieu.ke_hoach_su_dung || '—'}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border">
            <thead className="bg-accent-50">
              <tr>
                <th className="border border-border px-2 py-1 w-10">TT</th>
                <th className="border border-border px-2 py-1 w-16">Mã hàng</th>
                <th className="border border-border px-2 py-1 text-left">Tên TTB/VPP</th>
                <th className="border border-border px-2 py-1">ĐVT</th>
                <th className="border border-border px-2 py-1">Số lượng</th>
                <th className="border border-border px-2 py-1">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d, i) => (
                <tr key={i}>
                  <td className="border border-border px-2 py-1 text-center">{i + 1}</td>
                  <td className="border border-border px-2 py-1 text-center text-muted">{d.san_pham_id ?? '—'}</td>
                  <td className="border border-border px-2 py-1">{d.ten_hang || d.ten_tay || ''}</td>
                  <td className="border border-border px-2 py-1 text-center">{d.dvt || ''}</td>
                  <td className="border border-border px-2 py-1 text-center">{d.so_luong}</td>
                  <td className="border border-border px-2 py-1">{d.ghi_chu || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-right text-sm mt-3 text-muted">
          Tạm tính (tham khảo): <b className="text-accent-600">{formatTien(phieu.tong_tien)} đ</b>
        </div>
      </div>
    </AppShell>
  )
}
