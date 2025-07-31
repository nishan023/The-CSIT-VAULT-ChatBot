const { getGeminiResponse } = require("../services/geminiService");

const handleUserPrompt = async (req, res) => {
  try {
    const { prompt } = req.body;
  
    // Validate that prompt exists
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return res.status(400).json({ 
        error: "Prompt is required and must be a non-empty string" 
      });
    }

    console.log("Received prompt:", prompt);

    const reply = await getGeminiResponse(prompt);

    console.log({
      question: prompt,
      answer: reply,
    });
    
    res.json({ reply });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({ 
      error: "Internal server error",
      reply: "Sorry, an error occurred." 
    });
  }
};

module.exports = { handleUserPrompt };
