-- Biến thể màu cho sản phẩm (VD bút "Xanh, đen, đỏ") + màu của từng dòng phiếu.
-- bien_the: danh sách màu có thể chọn (rỗng/null = sản phẩm không có biến thể).
-- mau (ở dòng phiếu): màu người dùng chọn cho dòng đó.

alter table vhjscvpp_san_pham
  add column if not exists bien_the text[];

alter table vhjscvpp_phieu_dong
  add column if not exists mau text;
