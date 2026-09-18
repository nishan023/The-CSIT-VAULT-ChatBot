const { getGeminiResponse } = require("../services/geminiService");

/**
 * Handles incoming chatbot prompt requests.
 * @route POST /api/chatbot/ask
 * @param {Object} req.body - { prompt: string, history?: Array }
 */
const handleUserPrompt = async (req, res) => {
  try {
    const { prompt, history } = req.body;

    // Validate that prompt exists and is a non-empty string
    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Prompt is required and must be a non-empty string",
      });
    }

    console.log("Received prompt:", prompt);

    // Fetch response from Gemini service (with optional chat history)
    const reply = await getGeminiResponse(prompt, history);

    console.log("Generated response successfully for prompt:", prompt.substring(0, 50) + "...");

    return res.json({
      success: true,
      reply,
    });
  } catch (error) {
    console.error("Controller error:", error.message || error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
      reply: `⚠️ ${error.message || "Sorry, an error occurred while processing your request."}`,
    });
  }
};

module.exports = { handleUserPrompt };
