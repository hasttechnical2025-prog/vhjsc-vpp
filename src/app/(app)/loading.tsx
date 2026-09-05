// Khung xương hiện NGAY khi chuyển trang (header giữ nguyên nhờ layout) -> hết cảm giác treo.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-7 w-52 rounded bg-border/70" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="h-24 rounded-xl bg-border/40" />
        <div className="h-24 rounded-xl bg-border/40" />
        <div className="h-24 rounded-xl bg-border/40" />
      </div>
      <div className="h-72 rounded-xl bg-border/30" />
    </div>
  )
}
