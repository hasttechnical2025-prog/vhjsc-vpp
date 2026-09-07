-- Module Nhà cung cấp (NCC): hồ sơ tập trung + đánh giá theo kỳ + tệp đính kèm.
-- Truy cập qua service_role (API server) nên bật RLS mà không cần policy.

create table if not exists vhjscvpp_ncc (
  id                 uuid primary key default gen_random_uuid(),
  ten                text not null,
  ma_so_thue         text,
  dia_chi            text,
  so_dien_thoai      text,
  email              text,
  nguoi_lien_he      text,
  nhom_chi_phi       text,        -- Hành chính, CNTT, Tuyển dụng...
  loai_chi_phi       text,        -- hàng/dịch vụ cung cấp
  co_hoa_don         text,        -- 'co' | 'khong' | 'ca_hai' | null
  tan_suat_thanh_toan text,
  ngay_den_han       text,        -- mô tả tự do (VD "Mùng 8 hàng tháng")
  hop_dong_mo_ta     text,
  hop_dong_het_han   date,        -- để nhắc hạn hợp đồng
  trang_thai         text not null default 'dang_dung',  -- 'dang_dung' | 'ngung'
  ghi_chu            text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists vhjscvpp_ncc_danh_gia (
  id             uuid primary key default gen_random_uuid(),
  ncc_id         uuid not null references vhjscvpp_ncc(id) on delete cascade,
  ky             text not null,                 -- 'Năm 2026', 'Q1 2026'...
  diem_chat_luong smallint,                      -- 1..5
  diem_gia        smallint,
  diem_tien_do    smallint,
  diem_ho_tro     smallint,
  diem_chung_tu   smallint,
  diem_tong       numeric(3,2),                  -- 0..5 (có trọng số)
  xep_loai        text,                          -- 'A' | 'B' | 'C'
  nhan_xet        text,
  de_xuat         text,                          -- 'tiep_tuc' | 'theo_doi' | 'thay_the'
  nguoi_cham_ten  text,
  created_at      timestamptz not null default now()
);

create table if not exists vhjscvpp_ncc_tep (
  id         uuid primary key default gen_random_uuid(),
  ncc_id     uuid not null references vhjscvpp_ncc(id) on delete cascade,
  ten_tep    text not null,
  url        text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ncc_danh_gia_ncc on vhjscvpp_ncc_danh_gia(ncc_id);
create index if not exists idx_ncc_tep_ncc on vhjscvpp_ncc_tep(ncc_id);
create index if not exists idx_ncc_het_han on vhjscvpp_ncc(hop_dong_het_han);

alter table vhjscvpp_ncc enable row level security;
alter table vhjscvpp_ncc_danh_gia enable row level security;
alter table vhjscvpp_ncc_tep enable row level security;
