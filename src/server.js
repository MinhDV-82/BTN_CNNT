// src/server.js
require('dotenv').config();
const express = require('express');
const rabbitmq = require('./config/rabbitmq');
const redisClient = require('./config/redis');
const orderProducer = require('./producer/orderProducer');
const orderConsumer = require('./consumers/orderConsumer');

const app = express();
app.use(express.json());

// API: Tạo đơn hàng mới
app.post('/api/orders', async (req, res) => {
  try {
    const orderData = {
      orderId: `ORD-${Date.now()}`,
      customerName: req.body.customerName,
      customerEmail: req.body.customerEmail,
      items: req.body.items, // [{ name, price, quantity }]
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Gửi đơn hàng vào queue để xử lý bất đồng bộ
    await orderProducer.sendOrderToQueue(orderData);

    res.status(202).json({
      success: true,
      message: 'Đơn hàng đã được nhận và đang xử lý',
      orderId: orderData.orderId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi tạo đơn hàng',
      error: error.message
    });
  }
});

// API: Kiểm tra trạng thái đơn hàng
app.get('/api/orders/:orderId', async (req, res) => {
  try {
    const order = await redisClient.getOrder(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng hoặc đang xử lý'
      });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy thông tin đơn hàng',
      error: error.message
    });
  }
});

// API: Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Khởi động server
async function startServer() {
  try {
    // Kết nối RabbitMQ và Redis
    // await rabbitmq.connect();
    // await redisClient.connect();

    // // Khởi động consumer
    // await orderConsumer.startConsumer();

    // Lắng nghe HTTP requests
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`\n🚀 Server đang chạy tại: http://localhost:${PORT}`);
      console.log(`📝 API tạo đơn: POST http://localhost:${PORT}/api/orders`);
      console.log(`🔍 API tra cứu: GET http://localhost:${PORT}/api/orders/:orderId\n`);
    });

  } catch (error) {
    console.error('❌ Lỗi khởi động server:', error);
    process.exit(1);
  }
}

// Xử lý tắt ứng dụng
process.on('SIGINT', async () => {
  console.log('\n⚠️ Đang tắt server...');
  await rabbitmq.close();
  await redisClient.close();
  process.exit(0);
});

startServer();