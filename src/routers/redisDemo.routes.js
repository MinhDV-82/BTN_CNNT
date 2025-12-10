const express = require("express");
const router = express.Router();
const { redisClient } = require("../config/redis");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

// Hàm sleep giả lập các tác vụ mất thời gian
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * CÁCH 1: ĐỒNG BỘ - KHÔNG DÙNG QUEUE
 * User phải chờ đến khi TẤT CẢ công việc hoàn thành (lưu DB + gửi email)
 */
router.post("/sync/register", async (req, res) => {
  const startTime = Date.now();
  const { name, email } = req.body;

  console.log(`[SYNC] 📝 Nhận yêu cầu đăng ký từ ${email}`);

  try {
    // Bước 1: Giả lập lưu user vào DB (~100ms)
    console.log(`[SYNC] 💾 Đang lưu user vào DB...`);
    await sleep(100);
    console.log(`[SYNC] ✅ Đã lưu user vào DB`);

    // Bước 2: Giả lập gửi email (~2500ms) - User phải CHỜ ở đây
    console.log(`[SYNC] 📧 Đang gửi email chào mừng...`);
    await sleep(2500);
    console.log(`[SYNC] ✅ Đã gửi email cho ${email}`);

    const durationMs = Date.now() - startTime;

    res.json({
      success: true,
      mode: "sync",
      message: "Đăng ký thành công (SYNC) - Bạn đã phải chờ gửi email xong!",
      durationMs,
      user: { name, email },
    });

    console.log(`[SYNC] ⏱️ Tổng thời gian xử lý: ${durationMs}ms`);
  } catch (error) {
    console.error("[SYNC] ❌ Lỗi:", error.message);
    res.status(500).json({
      success: false,
      message: "Đăng ký thất bại: " + error.message,
    });
  }
});

/**
 * CÁCH 2: BẤT ĐỒNG BỘ - DÙNG REDIS QUEUE
 * User CHỈ chờ lưu DB, gửi email được xử lý background bởi Worker
 */
router.post("/redis/register", async (req, res) => {
  const startTime = Date.now();
  const { name, email } = req.body;

  console.log(`[REDIS-PRODUCER] 📝 Nhận yêu cầu đăng ký từ ${email}`);

  try {
    // Bước 1: Giả lập lưu user vào DB (~100ms)
    console.log(`[REDIS-PRODUCER] 💾 Đang lưu user vào DB...`);
    await sleep(100);
    console.log(`[REDIS-PRODUCER] ✅ Đã lưu user vào DB`);

    // Bước 2: Tạo job và đẩy vào Redis Queue (~1ms)
    // User KHÔNG phải chờ gửi email, vì Worker sẽ xử lý background
    const job = {
      id: uuidv4(),
      name,
      email,
      type: "SEND_WELCOME_EMAIL",
      createdAt: new Date().toISOString(),
    };

    const jobJson = JSON.stringify(job);
    await redisClient.lPush("email:queue", jobJson);

    console.log(
      `[REDIS-PRODUCER] 📨 Đã đẩy job ${job.id} vào queue email:queue cho ${email}`
    );

    const durationMs = Date.now() - startTime;

    res.json({
      success: true,
      mode: "redis-queue",
      message:
        "Đăng ký thành công (ASYNC qua Redis Queue)! Email sẽ được gửi trong giây lát.",
      durationMs,
      jobId: job.id,
      user: { name, email },
    });

    console.log(
      `[REDIS-PRODUCER] ⏱️ Thời gian xử lý (không chờ gửi email): ${durationMs}ms`
    );
  } catch (error) {
    console.error("[REDIS-PRODUCER] ❌ Lỗi:", error.message);
    res.status(500).json({
      success: false,
      message: "Đăng ký thất bại: " + error.message,
    });
  }
});

/**
 * API lấy thống kê Redis Queue
 */
router.get("/redis/stats", async (req, res) => {
  try {
    const queueLength = await redisClient.lLen("email:queue");
    const processedCountStr = await redisClient.get("email:processed:count");
    const processedCount = processedCountStr ? parseInt(processedCountStr) : 0;

    res.json({
      queueLength,
      processedCount,
    });
  } catch (error) {
    console.error("[REDIS-STATS] ❌ Lỗi:", error.message);
    res.status(500).json({
      success: false,
      message: "Lỗi lấy thống kê: " + error.message,
    });
  }
});

/**
 * Trang HTML demo
 */
router.get("/redis", (req, res) => {
  res.sendFile(path.join(__dirname, "../../views/redis-demo.html"));
});

module.exports = router;
