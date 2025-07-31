const express = require("express");
const { handleUserPrompt } = require("../controllers/chatbotController");

const router = express.Router();

router.post("/ask", handleUserPrompt);

module.exports = router;