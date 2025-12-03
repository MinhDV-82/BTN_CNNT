const { getRedisClient } = require("../config/redis");

const STREAM_KEY = "orders_stream";
const GROUP_NAME = "order_processors_group";
const CONSUMER_NAME = "worker_1";

class RedisStreamService {
  constructor() {
    this.redis = getRedisClient();
  }

  // Khởi tạo Consumer Group
  async initGroup() {
    try {
      await this.redis.xgroup(
        "CREATE",
        STREAM_KEY,
        GROUP_NAME,
        "$",
        "MKSTREAM"
      );
      console.log(`✅ Created consumer group: ${GROUP_NAME}`);
    } catch (error) {
      if (!error.message.includes("BUSYGROUP")) {
        console.error("❌ Error creating group:", error);
      }
    }
  }

  // Thêm đơn hàng vào Stream (Producer)
  async addOrder(orderData) {
    // XADD key * field value
    return await this.redis.xadd(
      STREAM_KEY,
      "*",
      "order",
      JSON.stringify(orderData)
    );
  }

  // Đọc tin nhắn từ Stream (Consumer)
  async readGroup(count = 1, block = 2000) {
    // XREADGROUP GROUP group consumer BLOCK block_ms COUNT count STREAMS key >
    return await this.redis.xreadgroup(
      "GROUP",
      GROUP_NAME,
      CONSUMER_NAME,
      "BLOCK",
      block,
      "COUNT",
      count,
      "STREAMS",
      STREAM_KEY,
      ">"
    );
  }

  // Xác nhận đã xử lý xong (ACK)
  async ackOrder(id) {
    return await this.redis.xack(STREAM_KEY, GROUP_NAME, id);
  }

  // Kiểm tra các tin nhắn đang treo (Pending) - Dùng cho Crash Recovery
  async getPending(count = 100) {
    // XPENDING key group [[start end count] [consumer]]
    return await this.redis.xpending(STREAM_KEY, GROUP_NAME, "-", "+", count);
  }

  // Claim tin nhắn từ consumer chết về consumer hiện tại
  async claimOrder(id, idleTime = 10000) {
    return await this.redis.xclaim(
      STREAM_KEY,
      GROUP_NAME,
      CONSUMER_NAME,
      idleTime,
      id
    );
  }

  // Lấy thông tin chi tiết message theo ID (dùng khi claim)
  async getRange(id) {
    return await this.redis.xrange(STREAM_KEY, id, id);
  }
}

module.exports = new RedisStreamService();
