# SVG Painter

Mở **Dev Tools → SVG Painter**, hoặc truy cập `/svg-painter` sau khi đăng nhập.

Khổ mặc định là hình vuông **800 × 800px**. Có thể đổi rộng/cao trong **Khổ vẽ & nền**.

**Zoom**: dùng nút +/− hoặc thanh trượt, từ 12,5% đến 800%. **100%** hiển thị theo kích thước thật; **Vừa khung** tự thu để thấy toàn bộ bảng vẽ. Ctrl/⌘ + lăn chuột phóng tại con trỏ. Dùng **Tay kéo**, giữ Space hoặc giữ chuột giữa để kéo khung nhìn. Zoom và kéo chỉ thay đổi cách xem, không đổi tọa độ, độ dày nét hoặc kích thước file xuất.

**Nhập SVG**: dùng cùng nút **Nhập ảnh / SVG**. Với SVG cơ bản, công cụ giữ đường nét gốc, màu, phép biến đổi và `viewBox`, không cần đồ lại thành pixel. Có thể vẽ thêm, gôm, chọn màu áp dụng currentColor và hoàn tác lần nhập. SVG có mask/clip, gradient, chữ, hiệu ứng hoặc ảnh nhúng được hiển thị rồi chuyển lại thành các vùng vector theo số màu đã chọn; các hiệu ứng có thể được giản lược. File xuất vẫn không chứa thẻ image hay ảnh Base64. SVG dùng ảnh/tài nguyên bên ngoài cần được xuất thành file độc lập có ảnh nhúng trước khi nhập.

**Nhập ảnh → vector** hỗ trợ PNG, JPG, WebP, GIF, BMP và AVIF, tối đa 20 MB. Chọn số màu 16/32/64 trước khi nhập: nhiều màu giữ thêm chi tiết, ít màu tạo hình đơn giản hơn. Ảnh được căn giữa, giữ tỉ lệ và đặt vừa khổ vẽ hiện tại. Các nét có sẵn được giữ lại, ảnh nhập được đặt lên trên. Hoàn tác một lần để bỏ cả lần nhập; sau khi chuyển đổi có thể vẽ thêm, lấy màu, chọn vùng màu, dùng gôm và xuất SVG như bình thường.

Ảnh được xử lý trong trình duyệt, không tải lên máy chủ. Thư viện chuyển đổi được tải qua mạng khi cần; nếu tải lỗi có thể thử nhập lại. Ảnh chụp được giản lược thành các vùng màu vector; ảnh động chỉ dùng một khung hình tĩnh. Màu trắng và độ trong suốt được giữ trong kết quả chuyển đổi; màu có thể thay đổi nhẹ do giới hạn bảng màu. File xuất không nhúng ảnh gốc.

- **Cọ vẽ**: kéo để vẽ nét tự do; điều chỉnh màu, độ dày và độ đậm trước khi vẽ.
- **Vùng tự do**: vẽ đường bao, thả tay để đóng kín và tô màu.
- **Đường thẳng / chữ nhật / ellipse**: kéo từ điểm đầu đến điểm cuối. Có thể bật màu tô cho chữ nhật và ellipse.
- **Tô vùng kín**: chạm vào vùng cần tô. Đường bao phải kín; tăng dung sai để nhận các màu gần nhau, giảm để tránh tô lan. Công cụ tự bù các pixel làm mượt ở mép vùng để tránh chấm trắng. Dung sai 0 so màu chính xác và tắt bù mép.
- **Lấy màu**: lấy màu đang hiển thị ở điểm được chạm, bao gồm màu xem thử currentColor.
- **Chọn / di chuyển**: chạm để chọn, kéo để di chuyển; bảng thuộc tính cho phép đổi màu tô, viền, độ đậm và thứ tự đối tượng.
- **Xóa đối tượng**: xóa toàn bộ nét/hình được chạm. Có thể hoàn tác hoặc làm lại tối đa 80 bước.
- **Cục gôm**: kéo hoặc chạm để gôm một phần các nét/hình đang có; chỉnh kích thước từ 1–160px. Vòng tròn cho biết phạm vi gôm. Gôm xóa hoàn toàn phần đi qua, không phụ thuộc màu hay độ đậm cọ, giữ nguyên nền giấy. Có thể hoàn tác/làm lại và vẽ lại lên vùng đã gôm. Khi di chuyển đối tượng, phần gôm trên đối tượng cũng di chuyển theo. Phần gôm được lưu bằng SVG mask vector.

Đánh dấu **Thay một màu bằng currentColor**, chọn mã màu đã dùng trong bản vẽ, hoặc dùng **Định sẵn màu nguồn** để chọn trước một màu khi chưa vẽ. Mọi màu tô/viền/nền trùng mã này sẽ được xuất thành `currentColor`; các màu khác và độ đậm giữ nguyên. **Màu xem thử** chỉ mô phỏng thuộc tính CSS `color` của nơi sử dụng SVG, không ghi vào file.

**Tải xuống .svg** lưu file vector, **Copy SVG** sao chép mã, **Xem mã SVG** hiển thị mã đã xuống dòng theo từng thẻ. Bản vẽ chỉ giữ trong phiên hiện tại; tải file xuống trước khi rời trang. Có thể nhập lại SVG để chỉnh sửa tiếp; SVG có hiệu ứng hoặc mask sẽ được chuyển lại thành các vùng vector.

SVG đầu ra dùng `svg`, `g`, `rect`, `path` và `defs`/`mask` khi dùng gôm; không có ảnh Base64, `image`, `foreignObject` hoặc canvas nhúng. Tô vùng dùng canvas tạm có độ phân giải gấp đôi mỗi chiều của khổ vẽ, sau đó chuyển đường biên sang path có `fill-rule="evenodd"`. Đường biên có bước 0,5px theo khổ vẽ. Với dung sai lớn hơn 0, công cụ nhận thêm mép bán trong suốt và dùng viền cùng màu rộng 1px (bù 0,5px mỗi phía) để các mép vector không tạo khe trắng khi hiển thị. Bù mép có thể làm các chi tiết nhỏ hơn 1px hẹp đi; đặt dung sai 0 khi cần tô chính xác từng màu. Nét cọ và hình học vẫn lưu trực tiếp dưới dạng vector.

Khổ vẽ hỗ trợ 32–1024px mỗi chiều. Đổi khổ giữ tọa độ và kích thước các nét, có thể làm phần nét bên ngoài khổ mới bị cắt khi hiển thị. Vùng trong suốt hiển thị nền caro; nền caro không được xuất.

Chạy kiểm thử thuật toán vùng tô và xuất SVG: `yarn test:svg-painter`.

Kiểm thử trình duyệt với bản vẽ 1.600 vùng vector: `yarn test:svg-painter:browser`. Mặc định dùng Chrome trên Windows; đặt biến `CHROME_BIN` nếu Chrome/Chromium ở đường dẫn khác. Kiểm thử xác nhận gôm chỉ tạo mask cho vùng bị chạm, giữ đúng phần hình còn lại, hoàn tác/làm lại, vẽ thêm sau gôm và di chuyển SVG có phép biến đổi.

Để thao tác trên bản vẽ nhiều chi tiết, lớp vector đã có được giữ ổn định khi rê chuột; nét đang vẽ và xem trước gôm được cập nhật riêng theo nhịp màn hình. Gôm chỉ lưu thay đổi trên các đối tượng có thể bị chạm, dùng mask giới hạn theo kích thước đối tượng và gộp các lượt gôm cùng kích thước/vị trí. Mã SVG chỉ được dựng khi xem mã, copy, tải xuống hoặc đọc vùng màu; các tối ưu này không làm giảm chi tiết của ảnh nhập.
