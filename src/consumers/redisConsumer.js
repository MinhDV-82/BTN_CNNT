const streamService = require("../services/redisStreamService");

let isRunning = false;
let processedCount = 0;
let logs = [];

// Giả lập các bước xử lý tốn thời gian
const STEPS = [
  { name: "🔍 Validate", time: 10 },
  { name: "📦 Inventory", time: 20 },
  { name: "💳 Payment", time: 50 },
  { name: "🧾 Bill", time: 15 },
  { name: "📧 Email", time: 30 },
  { name: "🚚 Shipping", time: 25 },
];

function addLog(msg, type = "info") {
  const log = { time: new Date().toLocaleTimeString(), msg, type };
  logs.unshift(log);
  if (logs.length > 50) logs.pop();
}

async function processOrderLogic(orderData, msgId) {
  const startTime = Date.now();

  // Giả lập xử lý tuần tự qua 6 bước
  for (const step of STEPS) {
    await new Promise((resolve) => setTimeout(resolve, step.time));
  }

  const duration = Date.now() - startTime;
  processedCount++;
  addLog(`✅ Processed ${orderData.orderId} in ${duration}ms`, "success");
}

// 🔥 CRASH RECOVERY: Xử lý các đơn hàng bị treo do crash
async function recoverMissingOrders() {
  addLog("🚑 Checking for pending orders (Crash Recovery)...", "warning");

  const pending = await streamService.getPending();
  // pending format: [[msgId, consumer, idleTime, deliveryCount], ...]

  if (pending.length === 0) {
    addLog("✅ No pending orders found.", "success");
    return;
  }

  addLog(`⚠️ Found ${pending.length} pending orders! Recovering...`, "warning");

  for (const [msgId, consumer, idle, count] of pending) {
    // Claim message về consumer hiện tại
    const claimed = await streamService.claimOrder(msgId);

    // Lấy data chi tiết của message
    const messages = await streamService.getRange(msgId);

    if (messages && messages.length > 0) {
      const [id, fields] = messages[0];
      const orderDataStr = fields[1]; // fields: ['order', '{json}']
      const orderData = JSON.parse(orderDataStr);

      addLog(`♻️ RECOVERING: ${orderData.orderId}`, "warning");
      await processOrderLogic(orderData, msgId);
      await streamService.ackOrder(msgId);
    }
  }
  addLog("✅ Recovery complete!", "success");
}

async function startRedisConsumer() {
  if (isRunning) return;
  isRunning = true;

  await streamService.initGroup();

  // 1. Chạy recovery trước khi consume mới
  await recoverMissingOrders();

  addLog("🚀 Consumer started. Waiting for orders...", "info");

  // 2. Vòng lặp consume chính
  while (isRunning) {
    try {
      const response = await streamService.readGroup();

      if (response && response.length > 0) {
        const [stream, messages] = response[0];

        for (const message of messages) {
          const [msgId, fields] = message;
          const orderData = JSON.parse(fields[1]);

          // Xử lý đơn hàng
          await processOrderLogic(orderData, msgId);

          // ACK: Xác nhận đã xử lý xong -> Xóa khỏi Pending List
          await streamService.ackOrder(msgId);
        }
      }
    } catch (error) {
      console.error("Consumer error:", error);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

function stopRedisConsumer() {
  isRunning = false;
  addLog("🛑 Consumer stopped (Simulated Crash)", "error");
}

function getStats() {
  return { isRunning, processedCount, logs };
}

function resetStats() {
  processedCount = 0;
  logs = [];
}

module.exports = {
  startRedisConsumer,
  stopRedisConsumer,
  getStats,
  resetStats,
  processOrderLogic, // Export để dùng cho Sync mode
};
