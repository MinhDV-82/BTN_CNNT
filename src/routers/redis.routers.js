const express = require("express");
const router = express.Router();
const queueService = require("../services/queueService");
const path = require("path");

// API: Them job vao queue
router.post("/enqueue", async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email || !name) {
      return res
        .status(400)
        .json({ success: false, message: "Thieu email hoac name" });
    }

    const data = await queueService.enqueueRedis(email, name);
    res.json({
      success: true,
      message: "Da dua yeu cau vao Redis queue",
      data,
    });
  } catch (error) {
    console.error("[REDIS-ROUTER] Error:", error);
    res.status(500).json({ success: false, message: "Loi server" });
  }
});

// API: Lay thong ke queue
router.get("/stats", async (req, res) => {
  try {
    const stats = await queueService.getRedisStats();
    res.json(stats);
  } catch (error) {
    console.error("[REDIS-ROUTER] Error:", error);
    res.status(500).json({ success: false, message: "Loi server" });
  }
});

// View: Trang demo HTML
router.get("/demo", (req, res) => {
  res.sendFile(path.join(__dirname, "../../views/redis-demo.html"));
});

module.exports = router;
