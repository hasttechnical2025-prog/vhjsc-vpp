// Hiện NGAY khi chuyển trang (header giữ nguyên nhờ layout):
// thanh tiến trình chạy ở đỉnh + spinner + chữ "Đang tải…" -> người dùng biết app đang phản ứng.
export default function Loading() {
  return (
    <>
      {/* Thanh tiến trình indeterminate ở đỉnh màn hình */}
      <div className="fixed top-0 left-0 right-0 h-[3px] z-50 overflow-hidden bg-accent-50">
        <div
          className="h-full w-1/3 rounded-full bg-accent"
          style={{ animation: 'vpp-bar 1.1s ease-in-out infinite' }}
        />
      </div>

      {/* Spinner + chữ */}
      <div className="flex items-center gap-2 text-sm text-muted mb-5">
        <span className="inline-block w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        Đang tải…
      </div>

      {/* Khung xương nội dung */}
      <div className="animate-pulse space-y-4">
        <div className="h-7 w-52 rounded bg-border/70" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-24 rounded-xl bg-border/40" />
          <div className="h-24 rounded-xl bg-border/40" />
          <div className="h-24 rounded-xl bg-border/40" />
        </div>
        <div className="h-72 rounded-xl bg-border/30" />
      </div>
    </>
  )
}
