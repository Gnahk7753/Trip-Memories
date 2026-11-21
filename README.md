# 🌴 Kỷ niệm chuyến đi & Chia tiền (Trip Memories + Split Bill)

Stack: **Node.js (Express) + React (Vite) + Tailwind CSS**, database **Neon PostgreSQL**, host **Render**, lưu ảnh/video/QR trên **Cloudinary**.

## Cấu trúc thư mục
```
trip-memories/
├─ db/schema.sql          # Schema PostgreSQL (chạy tự động khi server khởi động)
├─ server/
│  ├─ index.js            # Express API + phục vụ file React build
│  ├─ db.js  migrate.js   # Kết nối Neon (SSL) + chạy schema
│  ├─ auth.js             # JWT cookie httpOnly
│  ├─ upload.js           # multer (RAM) -> Cloudinary
│  └─ debts.js            # Thuật toán cộng dồn / bù trừ công nợ
├─ src/                   # React: Auth, Home (timeline), NewTrip, Trip, Expenses, Profile
├─ render.yaml            # Render Blueprint
├─ .env.example
└─ package.json
```

## Chạy thử ở máy
```bash
npm install
cp .env.example .env        # điền DATABASE_URL, CLOUDINARY_URL, JWT_SECRET
npm run dev:server          # API tại http://localhost:3000 (tự tạo bảng)
npm run dev:client          # giao diện tại http://localhost:5173
```

## Bước 1 – Tạo database trên Neon
1. Vào https://console.neon.tech → **Create project** (chọn region gần Việt Nam, vd Singapore).
2. Ở Dashboard bấm **Connect** → bật **Pooled connection** → copy chuỗi dạng  
   `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require`
3. Đó chính là `DATABASE_URL`. Không cần tạo bảng thủ công: server tự chạy `db/schema.sql` mỗi lần khởi động
   (hoặc chạy tay `npm run migrate`, hoặc dán nội dung file vào **SQL Editor** của Neon).

## Bước 2 – Tạo Cloudinary (lưu ảnh/video/QR)
1. Đăng ký https://cloudinary.com (miễn phí) → **Dashboard → API Keys** → copy **API environment variable**:  
   `cloudinary://API_KEY:API_SECRET@CLOUD_NAME` → đó là `CLOUDINARY_URL`.

## Bước 3 – Deploy lên Render
1. Đẩy mã nguồn lên GitHub (`.env` và `node_modules` đã nằm trong `.gitignore`).
2. Render Dashboard → **New → Blueprint** → chọn repo (Render đọc `render.yaml`).  
   Hoặc **New → Web Service** và nhập tay:
   - Build Command: `npm install --include=dev && npm run build`
   - Start Command: `npm start`
   - Health Check Path: `/healthz`
3. Điền biến môi trường: `DATABASE_URL`, `CLOUDINARY_URL`, `JWT_SECRET` (Blueprint tự sinh), `INVITE_CODE` (tuỳ chọn – nếu đặt, chỉ người có mã mới đăng ký được).
4. Bấm Deploy. Xong mở URL `https://<tên>.onrender.com`, đăng ký tài khoản đầu tiên.

> Gói Free của Render sẽ "ngủ" sau ~15 phút không dùng (lần mở đầu chậm ~30s). Ảnh/video nằm trên Cloudinary và dữ liệu nằm ở Neon nên **không mất khi Render restart**.

## Cách tính công nợ
- Mỗi phần chia của người *không phải người trả* ⇒ người đó nợ người trả.
- Gộp mọi khoản cùng chiều giữa 2 người (100k ăn + 50k nước, đều do B trả ⇒ A trả B **150k**); nợ ngược chiều được bù trừ.
- A bấm **Thanh toán / Xem mã QR** → thấy QR của B → chuyển khoản → bấm **Tôi đã chuyển khoản** (trạng thái chờ).
- B chỉ thấy thẻ **Xác nhận đã nhận** sau khi A bấm *Tôi đã chuyển khoản*; B xác nhận → khoản nợ được trừ (payment `confirmed`).
- Chia đều: phần lẻ (không chia hết) được rải 1đ cho những người đầu danh sách. Chia theo người: bắt buộc tổng khớp hoá đơn.

## Giới hạn & mở rộng
- Không giới hạn số lượng ảnh/video: trình duyệt tự chia thành các đợt nhỏ (≤ 5 file hoặc ~60MB/đợt) để tải lên. Mỗi file ≤ 50MB (đi qua server Render). Nếu cần video lớn hơn, chuyển sang upload trực tiếp từ trình duyệt lên Cloudinary (signed upload).
- Chỉ thành viên của chuyến đi mới xem được ảnh, bình luận, chi phí và QR của chuyến đó.
