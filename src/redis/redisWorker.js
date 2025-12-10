const redisClient = require("../config/redis");

const REDIS_QUEUE_KEY = "redis:email:queue";
const REDIS_PROCESSED_KEY = "redis:email:processed:count";

const processQueue = async () => {
  console.log("[REDIS-WORKER] Worker started, waiting for jobs...");

  while (true) {
    try {
      // BRPOP: Lay phan tu cuoi danh sach va xoa no.
      // Neu danh sach rong, no se block (cho) cho den khi co phan tu moi hoac timeout (0 = mai mai).
      const result = await redisClient.brPop(REDIS_QUEUE_KEY, 0);

      if (result) {
        // result co dang { key: '...', element: '...' }
        const messageStr = result.element;

        try {
          const message = JSON.parse(messageStr);
          const { id, email } = message;

          console.log(`[REDIS-WORKER] Received job ${id} for ${email}`);
          console.log(`[REDIS-WORKER] Simulating sending email to ${email}...`);

          // Gia lap xu ly mat 2 giay (vd: gui email thuc te)
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Tang counter so luong da xu ly
          await redisClient.incr(REDIS_PROCESSED_KEY);

          console.log(`[REDIS-WORKER] Done job ${id} for ${email} (2.0s)`);
          console.log(`[REDIS-WORKER] Waiting for next job...`);
        } catch (parseError) {
          console.error("[REDIS-WORKER] Error parsing JSON:", parseError);
        }
      }
    } catch (err) {
      console.error("[REDIS-WORKER] Redis error:", err);
      // Doi 5s truoc khi thu lai neu mat ket noi de tranh vong lap loi lien tuc
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};

// Khoi chay worker
processQueue();
