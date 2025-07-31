# CSIT Vault ChatBot Backend

A Node.js backend for a chatbot application using Gemini AI API.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the Backend directory with the following variables:

```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
PORT=5000
```

### 3. Get Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Replace `your_actual_gemini_api_key_here` in the `.env` file with your actual API key

### 4. Start the Server
```bash
npm start
# or
node app.js
# or with nodemon for development
nodemon app.js
```

## API Endpoints

### Health Check
- **GET** `/health`
- Returns server status

### Chatbot
- **POST** `/api/chatbot/ask`
- **Body**: `{ "prompt": "Your question here" }`
- **Response**: `{ "reply": "AI response" }`

## Troubleshooting

### Common Issues

1. **"Prompt is undefined"**
   - Make sure you're sending a JSON body with `prompt` field
   - Check Content-Type header is set to `application/json`

2. **"AI service authentication failed"**
   - Verify your GEMINI_API_KEY is correct
   - Make sure you've replaced the placeholder in `.env`

3. **"Sorry, an error occurred"**
   - Check console logs for detailed error messages
   - Verify all environment variables are set correctly

### Testing the API

Using curl:
```bash
curl -X POST http://localhost:5000/api/chatbot/ask \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, how are you?"}'
```

Using Postman:
- Method: POST
- URL: `http://localhost:5000/api/chatbot/ask`
- Headers: `Content-Type: application/json`
- Body (raw JSON): `{"prompt": "Hello, how are you?"}`

## Project Structure

```
Backend/
├── app.js                 # Main server file
├── .env                   # Environment variables
├── controllers/
│   └── chatbotController.js
├── routes/
│   └── chatbotRoutes.js
├── services/
│   └── geminiService.js
└── package.json
```

## Dependencies

- `express`: Web framework
- `cors`: Cross-origin resource sharing
- `dotenv`: Environment variable management
- `axios`: HTTP client for API calls 