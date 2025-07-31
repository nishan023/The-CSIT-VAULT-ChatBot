const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const chatbotRoutes = require("./routes/chatbotRoutes");

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/chatbot", chatbotRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Server is running",
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 Chatbot API: http://localhost:${PORT}/api/chatbot/ask`);
});
