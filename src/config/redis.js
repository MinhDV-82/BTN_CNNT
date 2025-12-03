const Redis = require("ioredis");

let redisClient = null;

function getRedisClient() {
  if (!redisClient) {
    const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

    redisClient = new Redis(REDIS_URL, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: null,
    });

    redisClient.on("connect", () =>
      console.log("✅ Redis connected successfully (ioredis)")
    );
    redisClient.on("error", (err) =>
      console.error("❌ Redis connection error:", err)
    );
  }
  return redisClient;
}

async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    console.log("✅ Redis connection closed");
  }
}

module.exports = {
  getRedisClient,
  closeRedis,
};
