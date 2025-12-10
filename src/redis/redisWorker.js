const { redisClient, connectRedis } = require("../config/redis");

// Hàm sleep giả lập gửi email
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * REDIS WORKER - XỬ LÝ BACKGROUND JOBS
 *
 * Worker này chạy độc lập (process riêng), liên tục:
 * 1. Lắng nghe jobs từ Redis Queue (BRPOP - blocking pop)
 * 2. Lấy job ra và xử lý (gửi email)
 * 3. Cập nhật số lượng job đã xử lý
 *
 * Lợi ích:
 * - API server không bị block bởi tác vụ chậm (gửi email)
 * - User có trải nghiệm nhanh hơn
 * - Có thể scale worker độc lập (chạy nhiều worker song song)
 */
async function startWorker() {
  console.log("[REDIS-WORKER] 🚀 Khởi động Redis Worker...");

  // Kết nối Redis
  await connectRedis();

  console.log("[REDIS-WORKER] 👷 Bắt đầu worker, chờ job trong email:queue...");
  console.log("[REDIS-WORKER] 💡 Mẹo: Để dừng worker, nhấn Ctrl+C\n");

  // Vòng lặp vô tận xử lý jobs
  while (true) {
    try {
      // BRPOP: Blocking Right Pop - chờ cho đến khi có job trong queue
      // Timeout = 0 nghĩa là chờ vô thời hạn
      const result = await redisClient.brPop("email:queue", 0);

      if (!result) {
        continue;
      }

      const jobJson = result.element;
      let job;

      try {
        job = JSON.parse(jobJson);
      } catch (parseErr) {
        console.error(
          "[REDIS-WORKER] ⚠️ Lỗi parse JSON job:",
          parseErr.message
        );
        continue;
      }

      console.log(
        `\n[REDIS-WORKER] 📩 Nhận job ${job.id} - gửi email cho ${job.email}`
      );
      console.log(`[REDIS-WORKER] 📧 Đang giả lập gửi email...`);

      // Giả lập gửi email mất 2.5 giây
      // Trong thực tế: gọi API SendGrid, AWS SES, hoặc SMTP server
      await sleep(2500);

      console.log(`[REDIS-WORKER] ✅ Đã gửi email chào mừng cho ${job.email}`);

      // Tăng counter số job đã xử lý
      await redisClient.incr("email:processed:count");

      const currentCount = await redisClient.get("email:processed:count");
      console.log(`[REDIS-WORKER] 📊 Tổng số email đã gửi: ${currentCount}`);
    } catch (err) {
      console.error("[REDIS-WORKER] ❌ Lỗi xử lý job:", err.message);
      // Không để worker crash, tiếp tục xử lý job tiếp theo
      await sleep(1000); // Chờ 1s trước khi thử lại
    }
  }
}

// Xử lý tín hiệu dừng worker (Ctrl+C)
process.on("SIGINT", async () => {
  console.log("\n[REDIS-WORKER] 🛑 Đang dừng worker...");
  await redisClient.quit();
  console.log("[REDIS-WORKER] 👋 Worker đã dừng");
  process.exit(0);
});

// Bắt đầu worker
startWorker().catch((err) => {
  console.error("[REDIS-WORKER] 💥 Lỗi khởi động worker:", err);
  process.exit(1);
});
