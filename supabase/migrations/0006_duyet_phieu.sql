-- Duyệt phiếu 1 cấp: Chờ duyệt -> Đã duyệt / Từ chối. Admin & HCNS duyệt.

alter table vhjscvpp_phieu drop constraint if exists vhjscvpp_phieu_trang_thai_check;

update vhjscvpp_phieu
set trang_thai = 'cho_duyet'
where trang_thai is null or trang_thai not in ('cho_duyet', 'da_duyet', 'tu_choi');

alter table vhjscvpp_phieu alter column trang_thai set default 'cho_duyet';

alter table vhjscvpp_phieu
  add constraint vhjscvpp_phieu_trang_thai_check
  check (trang_thai in ('cho_duyet', 'da_duyet', 'tu_choi'));

alter table vhjscvpp_phieu
  add column if not exists nguoi_duyet_ten  text,
  add column if not exists thoi_diem_duyet  timestamptz,
  add column if not exists ly_do_tu_choi    text;
