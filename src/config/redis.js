const redis = require("redis");
require("dotenv").config();

// Tạo Redis client
const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379,
  },
});

// Xử lý sự kiện kết nối thành công
redisClient.on("connect", () => {
  console.log(
    `[REDIS] Connected to Redis at ${process.env.REDIS_HOST || "localhost"}:${
      process.env.REDIS_PORT || 6379
    }`
  );
});

// Xử lý sự kiện lỗi
redisClient.on("error", (err) => {
  console.error("[REDIS] Redis connection error:", err.message);
});

// Hàm kết nối Redis
async function connectRedis() {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error("[REDIS] Failed to connect to Redis:", err.message);
    process.exit(1);
  }
}

module.exports = {
  redisClient,
  connectRedis,
};
