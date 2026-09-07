import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { NccRow, NccDanhGiaRow, NccTepRow } from '@/lib/types'
import NccDetail from '@/components/NccDetail'

export default async function NccDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin' && session.role !== 'hcns') redirect('/')
  const { id } = await params

  const { data: ncc } = await supabaseAdmin.from('vhjscvpp_ncc').select('*').eq('id', id).maybeSingle()
  if (!ncc) notFound()

  const { data: danhGia } = await supabaseAdmin
    .from('vhjscvpp_ncc_danh_gia')
    .select('*')
    .eq('ncc_id', id)
    .order('created_at', { ascending: false })
  const { data: tep } = await supabaseAdmin
    .from('vhjscvpp_ncc_tep')
    .select('*')
    .eq('ncc_id', id)
    .order('created_at', { ascending: false })

  return (
    <>
      <Link href="/ncc" className="text-sm text-accent-600 hover:underline">← Danh sách nhà cung cấp</Link>
      <NccDetail
        ncc={ncc as NccRow}
        danhGia={(danhGia || []) as NccDanhGiaRow[]}
        tep={(tep || []) as NccTepRow[]}
      />
    </>
  )
}
