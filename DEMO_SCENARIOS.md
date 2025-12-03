# 🎬 Kịch bản Demo & Giải thích Code Chi tiết

Tài liệu này giải thích cặn kẽ code và hướng dẫn từng bước demo các kịch bản (scenarios) trong đồ án.

## 📚 1. Giải thích Code (Code Walkthrough)

### **A. `src/services/redisStreamService.js` (Core Redis Logic)**

Đây là file quan trọng nhất, bao đóng các lệnh Redis Stream nguyên thủy:

- **`initGroup()`**: Tạo một "Consumer Group".
  - _Tại sao cần?_ Để Redis biết ai đang đọc tin nhắn. Nếu không có Group, tất cả consumer sẽ nhận được cùng một tin nhắn (Pub/Sub kiểu cũ). Với Group, tin nhắn được chia đều (Load Balancing).
- **`addOrder()` (`XADD`)**: Thêm tin nhắn vào Stream.
  - _Đặc điểm:_ Append-only log, rất nhanh, lưu trữ bền vững trên đĩa cứng.
- **`readGroup()` (`XREADGROUP`)**: Đọc tin nhắn chưa được xử lý.
  - _Tham số `>`_: Chỉ đọc tin nhắn **mới** chưa ai đọc.
  - _Tham số `BLOCK`_: Nếu không có tin nhắn, chờ X mili-giây rồi mới trả về (Long Polling), giúp giảm tải CPU.
- **`ackOrder()` (`XACK`)**: Xác nhận đã xử lý xong.
  - _Quan trọng:_ Nếu không ACK, tin nhắn vẫn nằm trong danh sách Pending (PEL) và sẽ được gửi lại khi crash recovery.

### **B. `src/consumers/redisConsumer.js` (The Worker)**

Worker mô phỏng quy trình xử lý đơn hàng thực tế:

1.  **`startRedisConsumer()`**:
    - Bước 1: Chạy `recoverMissingOrders()` để "quét dọn" các đơn hàng bị lỗi từ lần chạy trước.
    - Bước 2: Vào vòng lặp `while(isRunning)` để liên tục nhận đơn mới.
2.  **`processOrderLogic()`**:
    - Giả lập độ trễ (Latency) bằng `setTimeout`.
    - Mô phỏng các bước: Validate -> Inventory -> Payment -> ...
3.  **`recoverMissingOrders()` (Cơ chế phục hồi lỗi)**:
    - Kiểm tra `XPENDING`: Tìm các tin nhắn đã được giao cho consumer nhưng chưa có `XACK` (do consumer bị crash giữa chừng).
    - Dùng `XCLAIM`: Chiếm quyền sở hữu các tin nhắn đó về consumer hiện tại để xử lý lại.

---

## 🎭 2. Kịch bản Demo (Demo Scenarios)

Mở Dashboard tại: `http://localhost:3000/api/redis/dashboard`

### **Scenario 1: Hiệu năng Async vs Sync (Throughput)**

**Mục tiêu:** Chứng minh kiến trúc Message Queue giúp hệ thống phản hồi nhanh hơn và chịu tải tốt hơn.

1.  **Thử nghiệm Sync (Cách truyền thống):**

    - Nhấn nút **"50 Sync (Slow)"**.
    - **Quan sát:** Nút bấm bị đơ, giao diện không phản hồi cho đến khi server xử lý xong cả 50 đơn.
    - **Giải thích:** Server phải đợi xử lý xong đơn hàng A mới nhận đơn hàng B. Nếu có 1000 người mua cùng lúc, hệ thống sẽ sập (Blocking).

2.  **Thử nghiệm Async (Redis Stream):**
    - Nhấn nút **"100 Async"** hoặc **"1000 Flash Sale"**.
    - **Quan sát:**
      - Phản hồi "Sent..." hiện ra **ngay lập tức** (chỉ tốn vài mili-giây).
      - Biểu đồ **Queue Length** tăng vọt lên.
      - Số **Processed Orders** tăng dần dần theo tốc độ xử lý của Consumer.
    - **Giải thích:** Server chỉ việc ném đơn hàng vào Redis (mất ~1ms) rồi trả về cho khách hàng "Đã nhận đơn". Consumer sẽ từ từ xử lý sau (Asynchronous Processing). Trải nghiệm người dùng cực tốt.

### **Scenario 2: Backpressure & Queue Buildup**

**Mục tiêu:** Demo khả năng chịu tải khi tốc độ gửi tin nhắn nhanh hơn tốc độ xử lý.

1.  Nhấn liên tục nút **"100 Async"** (khoảng 5-10 lần).
2.  **Quan sát:**
    - **Queue Length** (đường màu xanh trên biểu đồ) dựng đứng lên.
    - Consumer vẫn xử lý đều đặn (không bị quá tải hay crash).
3.  **Giải thích:** Đây là tính năng **Decoupling**. Producer và Consumer hoạt động độc lập. Dù traffic đột biến (Flash Sale), hệ thống vẫn ổn định, chỉ là thời gian chờ nhận hàng của khách sẽ lâu hơn một chút, nhưng server không bao giờ chết.

### **Scenario 3: Service Crash & Persistence (Độ tin cậy)**

**Mục tiêu:** Chứng minh dữ liệu không bị mất khi hệ thống gặp sự cố (Crash).

1.  Nhấn nút **"Kill Consumer"** (Màu đỏ).
    - Trạng thái chuyển sang: `Stopped (Crashed)`.
    - Lúc này hệ thống mô phỏng việc Server xử lý đơn hàng bị sập.
2.  Nhấn nút **"100 Async"**.
    - **Quan sát:**
      - API vẫn trả về thành công (vì Producer vẫn chạy).
      - **Queue Length** tăng lên 100.
      - **Processed Orders** đứng yên (vì không có ai xử lý).
3.  Nhấn nút **"Restart & Recover"** (Màu xanh).
    - **Quan sát:**
      - Consumer khởi động lại.
      - Nó phát hiện 100 đơn hàng đang chờ trong Redis.
      - Nó bắt đầu xử lý và **Queue Length** giảm dần về 0.
4.  **Giải thích:** Nhờ Redis lưu trữ dữ liệu (Persistence), dù worker chết, đơn hàng của khách vẫn nằm an toàn trong Queue. Khi worker sống lại, nó tiếp tục công việc. Không mất đơn hàng.

### **Scenario 4: Crash Recovery (Pending Messages)**

**Mục tiêu:** Xử lý trường hợp "Khó" - Consumer chết **trong khi** đang xử lý dở dang một đơn hàng.

_Lưu ý: Kịch bản này khó demo bằng nút bấm trên web vì nó diễn ra rất nhanh (ms). Để demo rõ nhất, bạn có thể giải thích code `recoverMissingOrders`._

**Cách demo giả lập:**

1.  Trong code `redisConsumer.js`, phần `processOrderLogic`, hãy tăng thời gian sleep lên (ví dụ 5000ms).
2.  Gửi 1 đơn hàng.
3.  Ngay lập tức tắt server bằng `CTRL + C` (trong terminal) khi nó đang log "Processing...".
4.  Lúc này, đơn hàng đó đã được Redis đánh dấu là "Đang xử lý" nhưng chưa nhận được ACK. Nó rơi vào trạng thái **Pending**.
5.  Khởi động lại server (`npm run dev`).
6.  Nhìn log terminal, bạn sẽ thấy dòng: `⚠️ Found 1 pending orders! Recovering...`.
7.  **Giải thích:** Đây là cơ chế **At-least-once delivery**. Hệ thống đảm bảo không bao giờ mất đơn hàng kể cả khi sập điện ngay lúc đang trừ tiền.
