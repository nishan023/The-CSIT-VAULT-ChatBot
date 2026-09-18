const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const chatbotRoutes = require("./routes/chatbotRoutes");

dotenv.config();
const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Root welcome & API info endpoint
app.get("/", (req, res) => {
  res.json({
    service: "The CSIT Vault Chatbot API",
    status: "running",
    version: "1.0.0",
    author: "Nishan Dhakal",
    endpoints: {
      health: "/health",
      chatbotAsk: "POST /api/chatbot/ask"
    },
    documentation: "Send a POST request to /api/chatbot/ask with { prompt: 'your question' }"
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  const hasApiKey = Boolean(
    process.env.GEMINI_API_KEY && 
    !process.env.GEMINI_API_KEY.includes('your_') &&
    process.env.GEMINI_API_KEY.trim() !== ''
  );

  res.json({ 
    status: "OK", 
    service: "The CSIT Vault Chatbot Backend",
    apiKeyConfigured: hasApiKey,
    model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    timestamp: new Date().toISOString()
  });
});

// Chatbot routes
app.use("/api/chatbot", chatbotRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    availableEndpoints: ["GET /", "GET /health", "POST /api/chatbot/ask"]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message
  });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n==============================================`);
    console.log(`🚀 The CSIT Vault Chatbot API`);
    console.log(`🌐 Server running at: http://localhost:${PORT}`);
    console.log(`📡 Health check:     http://localhost:${PORT}/health`);
    console.log(`🤖 Chatbot API:      http://localhost:${PORT}/api/chatbot/ask`);
    console.log(`==============================================\n`);
  });
}

module.exports = app;
