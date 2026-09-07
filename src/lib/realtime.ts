// Phát tín hiệu "phiếu có thay đổi" tới mọi client đang mở, qua Supabase Realtime
// Broadcast (HTTP, không mở websocket phía server, không đụng RLS). Client nghe kênh
// 'phieu' và tự router.refresh(). Payload rỗng — chỉ là tín hiệu, không lộ dữ liệu.
export async function phatTinPhieuThayDoi(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return
  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({ messages: [{ topic: 'phieu', event: 'thay_doi', payload: {} }] }),
    })
  } catch {
    /* im lặng — realtime không thành công cũng không ảnh hưởng nghiệp vụ */
  }
}
