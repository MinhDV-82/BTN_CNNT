const { createClient } = require("redis");
require("dotenv").config();

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = process.env.REDIS_PORT || 6379;

// Tao client ket noi Redis
const client = createClient({
  url: `redis://${redisHost}:${redisPort}`,
});

client.on("error", (err) => console.log("[REDIS] Redis Client Error", err));
client.on("connect", () =>
  console.log(`[REDIS] Connected to Redis at ${redisHost}:${redisPort}`)
);

// Tu dong ket noi khi file duoc require
(async () => {
  if (!client.isOpen) {
    await client.connect();
  }
})();

module.exports = client;
