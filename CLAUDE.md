# VHJSC — Dịch vụ Hành chính

**ĐỌC TRƯỚC: `PROJECT_STATUS.md`** (hiện trạng, module, migration mới nhất, việc treo).

App **"Dịch vụ Hành chính - VHJSC"**: hub nhiều module HCNS. Module đầu là **Đăng ký VPP** (đề xuất mua VPP theo mẫu BM01), có thêm **Nhà cung cấp (NCC)** và **Quản trị hệ thống**. Next.js 16 (App Router, Turbopack) + React 19 + Tailwind 4 (light) + Supabase. Repo `hasttechnical2025-prog/vhjsc-vpp`, deploy Vercel từ `main`.

## Quy tắc BẮT BUỘC
- **KHÔNG dùng popup trình duyệt** (window.confirm/alert/prompt) → luôn dùng `ConfirmDialog` của app.
- **Tiền** `#.###` (`toLocaleString('vi-VN')`, helper `formatTien`); **ngày** `DD/MM/YYYY` (component `DateField`, helper `formatDate`/`isoToDmy`/`dmyToIso`). KHÔNG dùng `<input type=date>` trần. Lọc Tháng dùng dropdown (Firefox không bung `<input type=month>`).
- **Thêm module mới = thêm 1 mục trong `src/lib/modules.ts` + code route riêng** (prefix `/cong-tac`, `/xe`…; bảng tiền tố riêng `vhjsc_<module>_*`). KHÔNG sửa khung hub/nav. Bảng dùng chung giữ tên `vhjscvpp_` (nguoi_dung/phong_ban) — không đổi tên.
- **Migration (DDL) do USER tự chạy** trên Supabase SQL Editor — mình tạo file `.sql` trong `supabase/migrations/` rồi hướng dẫn user chạy; mình chỉ chạy được DML qua script service_role. Sau khi user xác nhận đã chạy migration mới push code phụ thuộc nó.
- **Build kiểm chứng**: `SESSION_SECRET=build-dummy npx next build`. Sau khi `git mv`/di chuyển route phải `rm -rf .next` rồi build (type cache đường cũ).
- **"commit" = commit + push luôn** (deploy production). Message tiếng Việt, kết `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Chỉ commit khi user nhờ.
- Danh sách có thể >1000 dòng → dùng `selectAll()` (`src/lib/supabase-admin.ts`); app lọc/tìm client-side.

## This is NOT the Next.js you know
Bản Next.js 16 có breaking changes so với dữ liệu huấn luyện. Đọc guide trong `node_modules/next/dist/docs/` khi cần API mới; để ý deprecation.
