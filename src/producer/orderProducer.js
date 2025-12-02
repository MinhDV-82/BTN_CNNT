const { getChannel } = require("../config/rabbitmq");
const ORDER_QUEUE = "order_queue";

async function sendOrderToQueue(orderData) {
  try {
    const channel = await getChannel();
    await channel.assertQueue(ORDER_QUEUE, { durable: true });

    const message = JSON.stringify(orderData);
    await channel.sendToQueue(ORDER_QUEUE, Buffer.from(message), {
      persistent: true, // Message sẽ được lưu vào disk
    });

    console.log(`Đã gửi đơn hàng vào queue: ${orderData.orderId}`);

    return true;
  } catch (error) {
    console.error("Lỗi gửi đơn hàng vào queue:", error);
    throw error;
  }
}

module.exports = {
    sendOrderToQueue
};