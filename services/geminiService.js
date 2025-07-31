const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-1.5-flash-latest';

const getGeminiResponse = async (prompt) => {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not set in environment');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  try {
    const response = await axios.post(url, body, {
      headers: { 'Content-Type': 'application/json' }
    });

    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini';
  } catch (error) {
    if (error.response) {
      console.error('Gemini API error:', error.response.data);
      throw new Error(`Gemini API error: ${error.response.data.error?.message || error.response.statusText}`);
    } else {
      throw new Error('Failed to connect to Gemini API');
    }
  }
};



module.exports = {
  getGeminiResponse
};
