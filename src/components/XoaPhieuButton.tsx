'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ConfirmDialog from './ConfirmDialog'

export default function XoaPhieuButton({ id }: { id: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [err, setErr] = useState('')

  async function xoa() {
    setOpen(false)
    const r = await fetch(`/api/phieu/${id}`, { method: 'DELETE' })
    if (!r.ok) {
      const d = await r.json().catch(() => ({}))
      setErr(d.error || 'Xoá thất bại')
      return
    }
    router.push('/phieu')
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="border border-border rounded-lg px-4 py-2 text-sm font-medium text-danger hover:bg-danger/5"
      >
        Xoá
      </button>
      {err && <span className="text-sm text-danger ml-2">{err}</span>}
      <ConfirmDialog
        open={open}
        message="Xoá phiếu này? Không khôi phục được."
        onConfirm={xoa}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
