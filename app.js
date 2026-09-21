require("./config");
const express = require("express");
const path = require("node:path");
const cors = require("cors");
const chatbotRoutes = require("./routes/chatbotRoutes");
const { logger, requestLogger } = require("./utils/logger");

const { getStatus } = require("./services/geminiService");
const app = express();
app.disable("x-powered-by");

// Middlewares
app.use(cors());
app.use(requestLogger);
app.use(express.json({ limit: "384kb" }));

// Routes
app.use("/api/chatbot", chatbotRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Server is running",
    ...getStatus(),
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT;

// Only the frontend directory is public; never expose the server or .env.
app.use(express.static(path.join(__dirname, "../ChatBot-Frontend"), { dotfiles: "deny" }));
app.get("/", (req, res) => res.json({ status: "OK", service: "The CSIT Vault Chatbot" }));
app.use((error, req, res, next) => {
  const status = error.type === "entity.too.large" ? 413 : error.type === "entity.parse.failed" ? 400 : 500;
  res.status(status).json({ success: false, code: status === 500 ? "INTERNAL_ERROR" : "INVALID_BODY", error: status === 413 ? "This message is too large." : status === 400 ? "Send a valid JSON request." : "Something went wrong. Please try again.", retryable: false });
});

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
    logger.info(`Chatbot API:  http://localhost:${PORT}/api/chatbot/ask`);
  });
}

module.exports = app;
