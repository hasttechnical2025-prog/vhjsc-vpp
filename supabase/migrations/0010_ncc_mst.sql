-- Lưu tình trạng hoạt động (theo MST) của NCC, tra qua API VietQR (bên thứ 3,
-- tổng hợp dữ liệu công khai). Chỉ lưu kết quả + thời điểm kiểm tra.
alter table vhjscvpp_ncc add column if not exists mst_trang_thai text;
alter table vhjscvpp_ncc add column if not exists mst_kiem_tra_luc timestamptz;
