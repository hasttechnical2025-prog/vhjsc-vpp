-- Đóng băng TÊN HÀNG vào từng dòng phiếu để phiếu tự chứa đủ, độc lập với danh mục
-- về sau (admin sửa/tắt/xoá sản phẩm không làm đổi phiếu cũ).
-- san_pham_id vẫn được lưu và đóng vai trò MÃ HÀNG (SKU nội bộ) để đối chiếu.

alter table vhjscvpp_phieu_dong
  add column if not exists ten_hang text;

-- Lấp dữ liệu cho các phiếu đã có (nếu có): copy tên từ danh mục theo san_pham_id
update vhjscvpp_phieu_dong d
set ten_hang = coalesce(d.ten_hang, d.ten_tay, s.ten)
from vhjscvpp_san_pham s
where d.san_pham_id = s.id and d.ten_hang is null;

update vhjscvpp_phieu_dong
set ten_hang = ten_tay
where ten_hang is null and ten_tay is not null;
