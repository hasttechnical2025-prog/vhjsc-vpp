// Khung "đang tải" dùng chung cho loading.tsx ở mọi cấp: thanh tiến trình ở đỉnh +
// spinner + chữ "Đang tải…" -> phản hồi tức thì khi bấm chuyển trang.
export default function LoadingSkeleton() {
  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-[3px] z-50 overflow-hidden bg-accent-50">
        <div className="h-full w-1/3 rounded-full bg-accent" style={{ animation: 'vpp-bar 1.1s ease-in-out infinite' }} />
      </div>
      <div className="flex items-center gap-2 text-sm text-muted mb-5">
        <span className="inline-block w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        Đang tải…
      </div>
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
