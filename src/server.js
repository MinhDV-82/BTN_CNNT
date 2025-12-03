// src/server.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const rabbitmq = require("./config/rabbitmq");
const redisClient = require("./config/redis");
const orderProducer = require("./producer/orderProducer");
const orderConsumer = require("./consumers/orderConsumer");
const orderService = require("./services/orderService");

// Import Redis Router & Consumer
const redisRouter = require("./routers/redis.routers");
const redisConsumerWorker = require("./consumers/redisConsumer");

const app = express();
app.use(express.json());

// Setup View Engine (EJS)
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Routes
app.use("/api/redis", redisRouter);

// API: Tạo đơn hàng mới
app.post("/api/orders", async (req, res) => {
  try {
    const orderData = {
      orderId: `ORD-${Date.now()}`,
      customerName: req.body.customerName,
      customerEmail: req.body.customerEmail,
      items: req.body.items, // [{ name, price, quantity }]
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    // Gửi đơn hàng vào queue để xử lý bất đồng bộ
    await orderProducer.sendOrderToQueue(orderData);

    res.status(202).json({
      success: true,
      message: "Đơn hàng đã được nhận và đang xử lý",
      orderId: orderData.orderId,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi tạo đơn hàng",
      error: error.message,
    });
  }
});

// API: Kiểm tra trạng thái đơn hàng
app.get("/api/orders/:orderId", async (req, res) => {
  try {
    const order = await orderService.getOrder(req.params.orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng hoặc đang xử lý",
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi lấy thông tin đơn hàng",
      error: error.message,
    });
  }
});

// API: Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// API: Kiểm tra trạng thái queue
app.get("/api/queue/status", async (req, res) => {
  try {
    const channel = await rabbitmq.getChannel();
    const queueName = process.env.QUEUE_NAME || "order_queue";

    // Kiểm tra queue info
    const queueInfo = await channel.checkQueue(queueName);

    res.json({
      success: true,
      queue: {
        name: queueName,
        messageCount: queueInfo.messageCount, // Số message chờ xử lý
        consumerCount: queueInfo.consumerCount, // Số consumer đang hoạt động
        isEmpty: queueInfo.messageCount === 0, // Queue đã rỗng chưa
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi kiểm tra queue",
      error: error.message,
    });
  }
});

// Khởi động server
async function startServer() {
  try {
    // Kết nối RabbitMQ và Redis
    await rabbitmq.connectRabbitMQ();

    // Khởi tạo Redis Client
    redisClient.getRedisClient();

    // Khởi động consumer RabbitMQ
    await orderConsumer.startConsumer();

    // Khởi động consumer Redis Stream
    redisConsumerWorker.startRedisConsumer();

    // Lắng nghe HTTP requests
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`\n🚀 Server đang chạy tại: http://localhost:${PORT}`);
      console.log(
        `📊 Redis Dashboard: http://localhost:${PORT}/api/redis/dashboard`
      );
      console.log(`📝 API tạo đơn: POST http://localhost:${PORT}/api/orders`);
    });
  } catch (error) {
    console.error("❌ Lỗi khởi động server:", error);
    process.exit(1);
  }
}

// Xử lý tắt ứng dụng
process.on("SIGINT", async () => {
  console.log("\n⚠️ Đang tắt server...");
  await rabbitmq.closeRabbitMQ();
  await redisClient.closeRedis();
  process.exit(0);
});

startServer();
