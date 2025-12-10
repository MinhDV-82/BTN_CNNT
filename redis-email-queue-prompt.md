# Prompt: Bổ sung demo Redis Queue vào dự án Node.js hiện có (đang dùng RabbitMQ)

## 1. Bối cảnh dự án HIỆN TẠI

Dự án Node.js của tôi đã có sẵn phần code cho RabbitMQ và cấu trúc thư mục như sau (rút gọn):

```
.
|   .env
|   .gitignore
|   docker-compose.yaml
|   package.json
|   package-lock.json
|   README.md
|
+---src
|   |   server.js
|   |
|   +---config
|   |       rabbitmq.js
|   |       redis.js      <-- có thể trống hoặc mới tạo, cho phép sửa
|   |
|   +---consumers
|   |       orderConsumer.js   <-- đang dùng cho RabbitMQ
|   |
|   +---producer
|   |       orderProducer.js   <-- đang dùng cho RabbitMQ
|   |
|   +---redis
|   |       (thư mục này để bạn sử dụng cho Redis, nếu cần)
|   |
|   +---routers
|   |       rabbitmq.routes.js <-- router cho RabbitMQ
|   |       redis.routers.js   <-- router cho Redis (cho phép thêm/sửa)
|   |
|   +---services
|   |       orderService.js    <-- đang dùng RabbitMQ
|   |       queueService.js    <-- có thể dùng chung hoặc mở rộng cho Redis
|   |
|   \---Test
|           test-rabbitmq-load.js
|
+---views
    (template cho giao diện, có thể thêm file mới)
```

**YÊU CẦU QUAN TRỌNG:**

- KHÔNG được xoá hoặc làm hỏng logic hiện có của RabbitMQ.
- Chỉ **bổ sung** thêm phần demo dùng Redis cho xử lý bất đồng bộ.
- Có thể **tái sử dụng** cấu trúc hiện tại (config, routers, services) nhưng phải giữ nguyên behavior cũ.

---

## 2. Mục tiêu cần AI thực hiện

Bổ sung một **demo xử lý bất đồng bộ dùng Redis như một Message Queue** bên cạnh RabbitMQ, để có thể **so sánh RabbitMQ vs Redis** trong cùng một dự án.

Use case demo: **Đăng ký user → gửi email giả lập** (hoặc tạo “order” đơn giản) với 2 cách:

1. Dùng RabbitMQ (đã có)
2. Dùng Redis Queue (cần thêm)

---

## 3. Phạm vi chỉnh sửa / file được phép TẠO hoặc CẬP NHẬT

AI được phép:

1. **Giữ nguyên**:

   - `src/config/rabbitmq.js`
   - `src/producer/orderProducer.js`
   - `src/consumers/orderConsumer.js`
   - `src/routers/rabbitmq.routes.js`
   - `src/services/orderService.js`
   - `Test/test-rabbitmq-load.js`
   - Bất kỳ file nào liên quan RabbitMQ hiện có (chỉ đọc, không đổi behavior).

2. **Được phép tạo mới hoặc cập nhật (an toàn, không phá code cũ):**
   - `src/config/redis.js` (cấu hình kết nối Redis)
   - `src/redis/redisWorker.js` (consumer/worker cho Redis)
   - `src/redis/redisProducer.js` (producer riêng cho Redis nếu cần)
   - `src/routers/redis.routers.js`
   - `src/services/queueService.js` (mở rộng để hỗ trợ cả Redis)
   - `views/redis-demo.ejs` hoặc `views/redis-demo.html`
   - `docker-compose.yaml` (THÊM service Redis, KHÔNG xoá RabbitMQ)
   - Cập nhật `README.md` để thêm hướng dẫn chạy Redis demo
   - Cập nhật `server.js` chỉ ở mức:
     - Mount thêm router mới cho Redis (ví dụ `/redis`)
     - Không đổi behavior các router hiện có của RabbitMQ.

---

## 4. Yêu cầu chức năng cho phần REDIS

### 4.1. Redis config (`src/config/redis.js`)

- Export 1 Redis client (dùng thư viện `@redis/client` hoặc `redis` bản mới).
- Đọc cấu hình từ `.env`:
  - `REDIS_HOST=localhost`
  - `REDIS_PORT=6379`
- Khi connect thành công: log
  - `[REDIS] ✅ Connected to Redis at ${host}:${port}`
- Khi lỗi: log
  - `[REDIS] ❌ Redis connection error: ...`
- Hỗ trợ graceful shutdown cho tiến trình nào dùng nó (server, worker).

### 4.2. Demo Redis Queue – Use case

Use case: **User gửi “đơn hàng” hoặc “yêu cầu gửi email” → đưa vào Redis queue → worker xử lý bất đồng bộ**.

**Key Redis queue:** `redis:email:queue` (List)

**Message format (JSON string):**

```
{
  "id": "uuid-or-random-id",
  "email": "user@example.com",
  "name": "User Name",
  "createdAt": "2025-12-10T12:00:00.000Z"
}
```

### 4.3. API Router cho Redis (`src/routers/redis.routers.js`)

Tạo router Express mới, mount sau này dưới path `/redis`.

Các endpoint:

1. `POST /redis/enqueue`

   - Body: `{ "email": "...", "name": "..." }`
   - Validate đơn giản (email, name không rỗng).
   - Tạo message JSON như trên, `LPUSH` vào `redis:email:queue`.
   - Response:
     ```
     {
       "success": true,
       "message": "Đã đưa yêu cầu vào Redis queue",
       "data": { "id": "...", "email": "...", "name": "..." }
     }
     ```
   - Log:
     - `[REDIS-PRODUCER] 📨 Enqueued job ${id} for email=${email}`

2. `GET /redis/stats`

   - Trả về:
     ```
     {
       "queueLength": <LLEN redis:email:queue>,
       "processedCount": <GET redis:email:processed:count> (mặc định 0 nếu chưa có)
     }
     ```
   - Dùng để hiển thị dashboard đơn giản.

3. (Optional) `GET /redis/demo`
   - Trả về HTML demo (nếu sử dụng file view), với form gửi email + vùng hiển thị kết quả.

### 4.4. Redis Worker (`src/redis/redisWorker.js`)

- Kết nối Redis thông qua `src/config/redis.js`.
- Vòng lặp sử dụng `BRPOP redis:email:queue 0`:

  - Khi nhận message:
    - Parse JSON
    - Log:
      ```
      [REDIS-WORKER] 📩 Received job ${id} for ${email}
      [REDIS-WORKER] 📧 Simulating sending email to ${email}...
      ```
    - Giả lập xử lý: `setTimeout` ~2000ms.
    - Sau khi xong:
      - Tăng counter: `INCR redis:email:processed:count`
      - (Optional) Lưu lịch sử 10 job gần nhất vào list `redis:email:history`
      - Log:
        ```
        [REDIS-WORKER] ✅ Done job ${id} for ${email} (2.0s)
        [REDIS-WORKER] 👷 Waiting for next job...
        ```

- Xử lý lỗi:
  - Nếu JSON lỗi: log cảnh báo, bỏ qua message, không crash.

---

## 5. Cập nhật server chính (`src/server.js`)

- **Không thay đổi** các route liên quan RabbitMQ.
- Import và mount router Redis:

```
const redisRouter = require('./routers/redis.routers');
// ...
app.use('/redis', redisRouter);
```

- Log khi server start:
  - `[SERVER] 🚀 Server listening on port ${PORT}`
  - `[SERVER] 🛤  RabbitMQ routes mounted at /rabbitmq` (nếu có)
  - `[SERVER] 🛤  Redis routes mounted at /redis`

---

## 6. Views cho demo Redis (`views/redis-demo.ejs` hoặc `.html`)

- Form đơn giản:
  - Input: name, email
  - Button: “Gửi bằng Redis Queue”
- Dùng fetch API gọi `POST /redis/enqueue`.
- Hiển thị:
  - Kết quả enqueue (id, email, name).
  - Gọi `GET /redis/stats` định kỳ (1–2 giây) để hiển thị:
    - Số job đang nằm trong queue
    - Tổng số job đã xử lý
- Giao diện chỉ cần đơn giản, dễ hiểu, có thể dùng Bootstrap nếu muốn (hoặc HTML thuần).

---

## 7. Cập nhật `docker-compose.yaml`

Hiện tại file `docker-compose.yaml` đã có service cho RabbitMQ (và có thể có app).  
**Yêu cầu:**

- **Giữ nguyên** tất cả service hiện có (đặc biệt là RabbitMQ).
- THÊM service Redis:

```
services:
  redis:
    image: redis:latest
    container_name: btncnnt_redis
    ports:
      - "6379:6379"
    restart: unless-stopped
```

- Không cần thiết lập password cho môi trường dev.
- Nếu có network chung, join Redis vào network đó.

---

## 8. Cập nhật `README.md`

Thêm một mục mới: **“Demo Redis Queue”** gồm:

1. Cách chạy Redis:
   - `docker compose up -d redis`
2. Cách chạy app (nếu chưa có):
   - `npm start` hoặc lệnh tương ứng trong `package.json`
3. Chạy worker Redis:
   - Ví dụ: `node src/redis/redisWorker.js`
4. Truy cập demo:
   - Gọi API qua Postman:
     - `POST http://localhost:<port>/redis/enqueue`
     - `GET  http://localhost:<port>/redis/stats`
   - Hoặc mở trang HTML:
     - `http://localhost:<port>/redis/demo`
5. Giải thích ngắn:
   - Web/API là **Producer**, Redis list là **Queue**, `redisWorker.js` là **Consumer**.

---

## 9. Yêu cầu về code style & an toàn

- **KHÔNG** xoá hoặc đổi tên bất kỳ file nào hiện có trừ khi thật sự cần và không phá vỡ behavior cũ (ưu tiên giữ nguyên).
- Code mới phải:
  - Dùng CommonJS (`require/module.exports`) nếu dự án hiện tại đang dùng kiểu đó.
  - Có comment tiếng Việt giải thích ngắn gọn:
    - Producer, Consumer, Queue
    - Tại sao dùng `LPUSH` + `BRPOP`.
  - Log rõ ràng với prefix:
    - `[REDIS] ...`
    - `[REDIS-PRODUCER] ...`
    - `[REDIS-WORKER] ...`
- Không đưa thêm thư viện nặng/khó hiểu nếu không cần thiết.

---

## 10. Đầu ra mong muốn từ AI

AI hãy:

1. **Hiển thị đầy đủ nội dung code** cho các file (mới hoặc cập nhật):

   - `src/config/redis.js`
   - `src/redis/redisWorker.js`
   - `src/routers/redis.routers.js`
   - (Nếu cần) cập nhật `src/services/queueService.js` để thêm hàm dùng Redis
   - Cập nhật `src/server.js` để mount router Redis
   - Thêm `views/redis-demo.ejs` hoặc `views/redis-demo.html`
   - Cập nhật `docker-compose.yaml` để thêm service Redis
   - Cập nhật `README.md` với hướng dẫn sử dụng phần Redis

2. Đảm bảo:
   - Code dễ hiểu, có comment tiếng Việt.
   - Không làm hỏng phần RabbitMQ hiện có.
   - Có thể chạy được ngay sau khi:
     ```
     docker compose up -d redis
     node src/server.js   # hoặc npm start
     node src/redis/redisWorker.js
     ```
3. Nếu cần chỉnh `.env`, hãy ghi rõ cần thêm các biến gì (không xoá biến cũ).
