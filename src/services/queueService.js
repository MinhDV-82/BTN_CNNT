const redisClient = require("../config/redis");
const { v4: uuidv4 } = require("uuid");

const REDIS_QUEUE_KEY = "redis:email:queue";
const REDIS_PROCESSED_KEY = "redis:email:processed:count";

// Them task vao Redis Queue (Producer)
const enqueueRedis = async (email, name) => {
  const id = uuidv4();
  const message = {
    id,
    email,
    name,
    createdAt: new Date().toISOString(),
  };

  // LPUSH: Day message vao dau danh sach (List)
  await redisClient.lPush(REDIS_QUEUE_KEY, JSON.stringify(message));

  console.log(`[REDIS-PRODUCER] Enqueued job ${id} for email=${email}`);
  return message;
};

// Lay thong ke tu Redis
const getRedisStats = async () => {
  // LLEN: Lay do dai hien tai cua queue
  const queueLength = await redisClient.lLen(REDIS_QUEUE_KEY);
  // GET: Lay gia tri counter da xu ly
  const processedCount = (await redisClient.get(REDIS_PROCESSED_KEY)) || 0;

  return {
    queueLength,
    processedCount: parseInt(processedCount),
  };
};

module.exports = {
  enqueueRedis,
  getRedisStats,
};
