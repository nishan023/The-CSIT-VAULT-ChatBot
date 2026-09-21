const { getGeminiResponse } = require('../services/geminiService');
getGeminiResponse('Reply with just: Connection successful.').then(() => {
  console.log('Gemini connection successful. The configured key and model work.');
}).catch(error => {
  console.error(`Gemini check failed: ${error.code || 'UNKNOWN_ERROR'}`);
  if (/API_KEY/.test(error.code || '')) {
    console.error('Create a fresh key at https://aistudio.google.com/app/apikey and set GEMINI_API_KEY in the backend .env (local) or Render Environment (deployed). Restart the backend. Never put the key in Blogger or frontend code.');
  } else if (error.code === 'MODEL_UNAVAILABLE') {
    console.error('Set GEMINI_MODEL to a model available to your project, then restart.');
  } else console.error(error.message);
  process.exitCode = 1;
});
