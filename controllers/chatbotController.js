const { getGeminiResponse, ChatServiceError } = require('../services/geminiService');
const { logger } = require('../utils/logger');

const handleUserPrompt = async (req, res) => {
  const { prompt, history = [] } = req.body || {};
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 4000) {
    return res.status(400).json({ success: false, code: 'INVALID_PROMPT', error: 'Enter a question between 1 and 4,000 characters.', retryable: false });
  }
  if (!Array.isArray(history) || history.length > 10 || history.length % 2 !== 0 || history.some((message, index) =>
    !message || message.role !== (index % 2 === 0 ? 'user' : 'model') || typeof message.text !== 'string' || !message.text.trim() || message.text.length > 30000
  )) {
    return res.status(400).json({ success: false, code: 'INVALID_HISTORY', error: 'The conversation context is invalid. Please start a new chat.', retryable: false });
  }
  try {
    const reply = await getGeminiResponse(prompt.trim(), history);
    return res.json({ success: true, reply });
  } catch (error) {
    const known = error instanceof ChatServiceError;
    if (!known) logger.error('Unexpected chatbot failure');
    if (known && error.code === 'RATE_LIMITED') res.set('Retry-After', '60');
    return res.status(known ? error.status : 500).json({
      success: false,
      code: known ? error.code : 'INTERNAL_ERROR',
      error: known ? error.message : 'Something went wrong. Please try again shortly.',
      retryable: known ? error.retryable : true,
    });
  }
};
module.exports = { handleUserPrompt };
