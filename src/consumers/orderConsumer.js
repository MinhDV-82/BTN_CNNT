const { getChannel } = require('../config/rabbitmq');
const orderService = require('../services/orderService');
const QUEUE_NAME = process.env.QUEUE_NAME || 'order_queue';

async function startConsumer() {
  try {
    const channel = await getChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    // Chỉ xử lý 1 message tại một thời điểm
    channel.prefetch(1);
       console.log(`Đang lắng nghe queue: ${QUEUE_NAME}`);

       channel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                try {
                    const orderData = JSON.parse(msg.content.toString());
                    console.log(`Nhận đơn hàng: ${orderData.orderId}`);
                    
                    // Xử lý đơn hàng (validate, tính toán, lưu vào Redis)
                    await orderService.processOrder(orderData);
                    
                    // Acknowledge message đã xử lý thành công
                    channel.ack(msg);
                    console.log(`✅ Đã xử lý đơn hàng: ${orderData.orderId}`);
                    
                } catch (error) {
                    console.error('Lỗi xử lý đơn hàng:', error);
                    // Reject message và đưa lại vào queue
                    channel.nack(msg, false, true);
                }
            }
       });
  } catch (error) {
    console.error('Lỗi khởi động consumer đơn hàng:', error);
    throw error;
  }
}

module.exports = {
    startConsumer
};