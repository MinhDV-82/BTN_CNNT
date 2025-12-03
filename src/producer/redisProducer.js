const streamService = require("../services/redisStreamService");

async function sendOrderToStream(orderData) {
  try {
    const messageId = await streamService.addOrder(orderData);
    // console.log(`📤 [Redis] Sent order ${orderData.orderId} (MsgID: ${messageId})`);
    return messageId;
  } catch (error) {
    console.error("❌ Error sending to Redis Stream:", error);
    throw error;
  }
}

module.exports = { sendOrderToStream };
