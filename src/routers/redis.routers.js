const express = require("express");
const router = express.Router();
const redisProducer = require("../producer/redisProducer");
const redisConsumer = require("../consumers/redisConsumer");
const streamService = require("../services/redisStreamService");

// Render Dashboard
router.get("/dashboard", (req, res) => {
  res.render("dashboard");
});

// API: Gửi đơn hàng ASYNC (Redis Stream) - Nhanh
router.post("/orders/async", async (req, res) => {
  const count = req.body.count || 1;
  const startTime = Date.now();

  for (let i = 0; i < count; i++) {
    const order = {
      orderId: `ORD-${Date.now()}-${i}`,
      customer: `User ${i}`,
      amount: Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
    };
    await redisProducer.sendOrderToStream(order);
  }

  res.json({
    success: true,
    message: `Sent ${count} orders to Redis Stream`,
    duration: Date.now() - startTime,
  });
});

// API: Gửi đơn hàng SYNC (Blocking) - Chậm
router.post("/orders/sync", async (req, res) => {
  const count = req.body.count || 1;
  const startTime = Date.now();

  for (let i = 0; i < count; i++) {
    const order = {
      orderId: `ORD-SYNC-${Date.now()}-${i}`,
      timestamp: new Date().toISOString(),
    };
    // Gọi trực tiếp hàm xử lý (Blocking)
    await redisConsumer.processOrderLogic(order, "SYNC");
  }

  res.json({
    success: true,
    message: `Processed ${count} orders Synchronously`,
    duration: Date.now() - startTime,
  });
});

// API: Control Consumer
router.post("/control", async (req, res) => {
  const { action } = req.body;
  if (action === "start") {
    redisConsumer.startRedisConsumer();
  } else if (action === "stop") {
    redisConsumer.stopRedisConsumer();
  } else if (action === "reset") {
    redisConsumer.resetStats();
  }
  res.json({ success: true });
});

// API: Get Stats for Dashboard
router.get("/stats", async (req, res) => {
  const consumerStats = redisConsumer.getStats();

  // Lấy độ dài hàng đợi thực tế từ Redis
  let queueLength = 0;
  let pendingCount = 0;
  try {
    const client = require("../config/redis").getRedisClient();
    queueLength = await client.xlen("orders_stream");
    const pendingInfo = await client.xpending(
      "orders_stream",
      "order_processors_group"
    );
    pendingCount = pendingInfo[0]; // Số lượng pending messages
  } catch (e) {}

  res.json({
    ...consumerStats,
    queueLength,
    pendingCount,
  });
});

module.exports = router;
