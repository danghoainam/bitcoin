# Bitcoin Telegram Financial Bot

Công cụ tự động tổng hợp giá, tâm lý thị trường và tin tức Bitcoin, sau đó gửi báo cáo dự báo về Telegram.

## Hướng dẫn Deploy lên Vercel

1. **Đưa code lên GitHub:** Hãy tạo một Repo mới trên GitHub và push thư mục này lên.
2. **Kết nối với Vercel:** 
   - Truy cập [Vercel](https://vercel.com/) và Import dự án từ GitHub.
3. **Cấu hình Biến môi trường (Environment Variables):**
   Tại tab **Settings > Environment Variables** trên Vercel, hãy thêm 3 biến sau:
   - `TELEGRAM_TOKEN`: Token của Bot (lấy từ @BotFather).
   - `CHAT_ID`: ID của bạn hoặc Group (Dùng @userinfobot để lấy ID).
   - `CRYPTOPANIC_API_KEY`: (Tùy chọn) Lấy tại [CryptoPanic](https://cryptopanic.com/developers/api/).
4. **Deploy:** Bấm Deploy.

## Cơ chế tự động (Cron Job)
- Tool được cấu hình chạy tự động mỗi 1 tiếng một lần (`0 * * * *`).
- Bạn có thể kiểm tra trạng thái chạy tại tab **Logs** trên Vercel.

## Tùy chỉnh dự báo
Bạn có thể mở file `api/cron.ts` để thay đổi logic dự báo dựa trên RSI hoặc các chỉ số khác nếu muốn chuyên sâu hơn.
