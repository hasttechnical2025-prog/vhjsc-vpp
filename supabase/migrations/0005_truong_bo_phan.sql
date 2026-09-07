-- Trưởng bộ phận (ký ở khối "TRƯỞNG BỘ PHẬN" trên phiếu BM01).
-- Lưu theo phòng ban; đóng băng vào phiếu khi lập để phiếu cũ không đổi khi phòng ban thay TBP.

alter table vhjscvpp_phong_ban
  add column if not exists truong_bo_phan text;

alter table vhjscvpp_phieu
  add column if not exists truong_bo_phan text;
