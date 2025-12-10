# BTN_CNNT# 🚀 RabbitMQ & Redis Performance Comparison

Dự án so sánh hiệu năng và cách sử dụng giữa **RabbitMQ** (Message Queue) và **Redis** (Cache/Pub-Sub) trong hệ thống phân tán.

## 📋 Mục lục

- [Tổng quan](#tổng-quan)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cài đặt](#cài-đặt)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Chạy dự án](#chạy-dự-án)
- [API Endpoints](#api-endpoints)
- [Benchmark](#benchmark)
- [So sánh RabbitMQ vs Redis](#so-sánh-rabbitmq-vs-redis)

## 🎯 Tổng quan

Dự án này được xây dựng để:

- ✅ So sánh **hiệu năng** (throughput, latency) giữa RabbitMQ và Redis
- ✅ Nghiên cứu **use cases** phù hợp cho từng công nghệ
- ✅ Demo **Message Queue Pattern** vs **Pub-Sub Pattern**
- ✅ Thực hành **Microservices Architecture**

## 🛠️ Công nghệ sử dụng

| Công nghệ      | Version | Mục đích                |
| -------------- | ------- | ----------------------- |
| **Node.js**    | 18+     | Runtime environment     |
| **Express.js** | 5.x     | Web framework           |
| **RabbitMQ**   | 3.13    | Message broker          |
| **Redis**      | 7.x     | Cache & Pub-Sub         |
| **Docker**     | -       | Container orchestration |
| **amqplib**    | 0.10.9  | RabbitMQ client         |
| **redis**      | 5.10.0  | Redis client            |

## 📦 Cài đặt

### **Yêu cầu hệ thống:**

- Node.js >= 18.x
- Docker Desktop
- Git

### **Bước 1: Clone repository**

```bash
git clone https://github.com/YOUR_USERNAME/CNNT.git
cd CNNT
```

### **Bước 2: Cài đặt dependencies**

```bash
npm install
```

### **Bước 3: Tạo file `.env`**

```bash
# Copy từ file mẫu
cp .env.example .env
```

Nội dung `.env`:

```env
# Server
PORT=3000
NODE_ENV=development

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# Redis
REDIS_URL=redis://localhost:6379
```

### **Bước 4: Khởi động Docker containers**

```bash
docker-compose up -d
```

Kiểm tra containers đang chạy:

```bash
docker ps
```

## 📁 Cấu trúc dự án

```
CNNT/
├── src/
│   ├── config/              # Cấu hình kết nối
│   │   ├── rabbitmq.js     # RabbitMQ connection
│   │   └── redis.js        # Redis connection
│   ├── consumers/          # Message consumers
│   │   └── orderConsumer.js
│   ├── producer/           # Message publishers
│   │   └── orderProducer.js
│   ├── services/           # Business logic
│   │   ├── orderService.js
│   │   └── queueService.js
│   ├── routers/            # API routes
│   │   ├── rabbitmq.routes.js
│   │   └── redis.routers.js
│   └── server.js           # Entry point
├── docker-compose.yml      # Docker services
├── .env.example           # Environment template
├── .gitignore
├── package.json
└── README.md
```

## 🚀 Chạy dự án

### **Development mode:**

```bash
npm run dev
```

### **Production mode:**

```bash
npm start
```

### **Kiểm tra services:**

- **Server:** http://localhost:3000
- **Health check:** http://localhost:3000/health
- **RabbitMQ Management UI:** http://localhost:15672 (guest/guest)
- **Redis:** localhost:6379

## 🌐 API Endpoints

### **Health Check**

```bash
GET /health
```

Response:

```json
{
  "status": "OK",
  "timestamp": "2025-12-01T10:00:00.000Z",
  "services": {
    "rabbitmq": "connected",
    "redis": "connected"
  }
}
```

### **RabbitMQ Endpoints** (Coming soon)

```bash
POST /api/rabbitmq/send
POST /api/rabbitmq/send-multiple
GET  /api/rabbitmq/stats
```

### **Redis Endpoints** (Coming soon)

```bash
POST /api/redis/set
GET  /api/redis/get/:key
POST /api/redis/batch
GET  /api/redis/stats
```

## 📊 Benchmark

### **Test Throughput (Messages/second):**

```bash
# RabbitMQ
curl -X POST http://localhost:3000/api/benchmark/rabbitmq \
  -H "Content-Type: application/json" \
  -d '{"count": 10000}'

# Redis
curl -X POST http://localhost:3000/api/benchmark/redis \
  -H "Content-Type: application/json" \
  -d '{"count": 10000}'
```

### **Test Latency (Processing time):**

```bash
curl -X POST http://localhost:3000/api/benchmark/latency \
  -H "Content-Type: application/json" \
  -d '{"iterations": 1000}'
```

### **Compare Both:**

```bash
curl -X POST http://localhost:3000/api/benchmark/compare \
  -H "Content-Type: application/json" \
  -d '{"count": 5000}'
```

## ⚖️ So sánh RabbitMQ vs Redis

### **RabbitMQ - Message Queue**

#### ✅ **Ưu điểm:**

- **Reliability**: Message persistence, acknowledge mechanism
- **Complex routing**: Exchanges, bindings, routing keys
- **Load balancing**: Multiple consumers cho cùng queue
- **Message ordering**: FIFO guaranteed
- **Dead Letter Queues**: Xử lý failed messages

#### ⚠️ **Nhược điểm:**

- Latency cao hơn Redis (do persistence)
- Cấu hình phức tạp hơn
- Resource intensive hơn

#### 🎯 **Use Cases:**

- Task queues (send email, process images)
- Microservices communication
- Event-driven architecture
- Long-running background jobs

### **Redis - Cache & Pub-Sub**

#### ✅ **Ưu điểm:**

- **Ultra-fast**: In-memory, sub-millisecond latency
- **Simple**: Dễ setup và sử dụng
- **Versatile**: Cache, Pub-Sub, Session store
- **Data structures**: String, Hash, List, Set, Sorted Set

#### ⚠️ **Nhược điểm:**

- **No persistence guarantee** (Pub-Sub fire-and-forget)
- **No message acknowledgment**
- Limited message size
- Single-threaded

#### 🎯 **Use Cases:**

- Caching (session, API responses)
- Real-time features (chat, notifications)
- Rate limiting
- Leaderboards
- Pub-Sub for fast notifications

## 📈 Kết quả Benchmark (Expected)

| Metric          | RabbitMQ     | Redis         | Winner      |
| --------------- | ------------ | ------------- | ----------- |
| **Throughput**  | ~5,000 msg/s | ~50,000 ops/s | 🏆 Redis    |
| **Latency**     | ~2-5ms       | ~0.1-1ms      | 🏆 Redis    |
| **Reliability** | ⭐⭐⭐⭐⭐   | ⭐⭐⭐        | 🏆 RabbitMQ |
| **Persistence** | Yes          | Optional      | 🏆 RabbitMQ |
| **Complexity**  | Medium       | Low           | 🏆 Redis    |

## 🔧 Debugging

### **Xem logs RabbitMQ:**

```bash
docker logs rabbitmq
```

### **Xem logs Redis:**

```bash
docker logs redis
```

### **Connect vào Redis CLI:**

```bash
docker exec -it redis redis-cli

# Test
127.0.0.1:6379> PING
PONG
127.0.0.1:6379> KEYS *
```

### **RabbitMQ Management:**

Truy cập http://localhost:15672

- Username: `guest`
- Password: `guest`

## Demo Redis Queue

Phan nay bo sung demo su dung Redis lam Message Queue don gian de so sanh voi RabbitMQ.

### 1. Cai dat & Chay Redis

Dam bao ban da co Docker. Chay lenh sau de khoi dong Redis:

```bash
docker compose up -d redis
```

### 2. Chay Server (Producer)

```bash
npm start
# Server se lang nghe tai port mac dinh (vd: 3000)
```

### 3. Chay Worker (Consumer)

Mo mot terminal moi va chay worker rieng cho Redis:

```bash
node src/redis/redisWorker.js
```

### 4. Su dung Demo

Truy cap trinh duyet tai:
`http://localhost:3000/redis/demo` (thay 3000 bang port cua ban)

- Nhap thong tin va nhan "Gui vao Redis Queue".
- Quan sat log o terminal chay Worker de thay qua trinh xu ly bat dong bo.
- Quan sat dashboard tren web de thay so luong job trong queue va da xu ly.

## 🤝 Contributing

Pull requests are welcome! Để contribute:

1. Fork repo
2. Tạo branch: `git checkout -b feature/AmazingFeature`
3. Commit: `git commit -m 'Add some AmazingFeature'`
4. Push: `git push origin feature/AmazingFeature`
5. Tạo Pull Request

## 📝 License

MIT License

## 👨‍💻 Author

**Your Name**

- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com

## 🙏 Acknowledgments

- [RabbitMQ Documentation](https://www.rabbitmq.com/docs)
- [Redis Documentation](https://redis.io/docs/)
- [Express.js](https://expressjs.com/)

---

⭐ **Star this repo** nếu bạn thấy hữu ích!
