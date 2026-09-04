-- Thời gian cần + Kế hoạch sử dụng là dùng CHUNG cho cả phiếu (không theo từng dòng).
-- Chuyển 2 cột từ bảng dòng lên bảng phiếu. (Bảng đang rỗng nên drop cột an toàn.)

alter table vhjscvpp_phieu
  add column if not exists thoi_gian_can text,
  add column if not exists ke_hoach_su_dung text;

alter table vhjscvpp_phieu_dong
  drop column if exists thoi_gian_can,
  drop column if exists ke_hoach_su_dung;
