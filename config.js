const path = require('node:path');
// Hosting environment variables take precedence over the local file.
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
function getGeminiConfig() {
  return {
    apiKey: (process.env.GEMINI_API_KEY || '').trim(),
    model: (process.env.GEMINI_MODEL || 'gemini-3.6-flash').trim(),
  };
}
module.exports = { getGeminiConfig };
