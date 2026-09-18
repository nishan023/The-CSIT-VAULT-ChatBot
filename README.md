# The CSIT Vault Chatbot Backend

A Node.js & Express backend API for **The CSIT Vault Chatbot**, powered by Google Gemini AI. Built to assist BSc. CSIT (Computer Science & Information Technology) students with curriculum questions, programming, lab reports, past exam questions, and academic guidance.

---

## Features

- **Google Gemini Integration**: Fast and reliable AI responses using `gemini-1.5-flash` or `gemini-2.0-flash`.
- **CSIT Vault Persona**: System instructions tuned specifically for BSc. CSIT students and computer science subjects.
- **Conversation Context**: Supports multi-turn dialogue history.
- **Resilient Fallback**: Automatic model fallback and 30-second request timeouts.
- **Helpful Error Reporting**: Detects revoked/leaked keys, quota limits, and gives clear diagnostic feedback.
- **CORS Enabled**: Ready to connect with the frontend widget.

---

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the project root (you can copy `.env.example`):

```bash
cp .env.example .env
```

Set your values in `.env`:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
PORT=5000
```

> [!IMPORTANT]
> **Getting a Free Gemini API Key:**
> 1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
> 2. Sign in with your Google account.
> 3. Click **"Create API key"**.
> 4. Copy the key and paste it as `GEMINI_API_KEY` in `.env`.
> 5. **Never commit `.env` to Git!** Keep it in `.gitignore`.

### 3. Run the Server

**Development Mode (with auto-reload):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

---

## API Endpoints

### 1. API Status
- **GET** `/`
- Returns service status and documentation links.

### 2. Health Check
- **GET** `/health`
- Returns server status, model configured, and whether `GEMINI_API_KEY` is present.

### 3. Ask Chatbot
- **POST** `/api/chatbot/ask`
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "prompt": "Explain Binary Search Trees in C++",
    "history": [
      { "role": "user", "text": "Hi" },
      { "role": "model", "text": "Hello! How can I help you with your CSIT studies?" }
    ]
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "reply": "A Binary Search Tree (BST) is a node-based binary tree data structure...",
    "timestamp": "2026-09-18T11:40:00.000Z"
  }
  ```

---

## Testing the API

### Using cURL:
```bash
curl -X POST http://localhost:5000/api/chatbot/ask \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What subjects are in BSc. CSIT 1st semester?"}'
```

### Using PowerShell:
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/chatbot/ask" -Method Post -ContentType "application/json" -Body '{"prompt": "Hello!"}'
```

---

## Project Structure

```
The-CSIT-VAULT-ChatBot/
├── .env.example              # Safe environment variable template
├── .gitignore                # Prevents secrets and dependencies from leaking
├── app.js                    # Express server initialization & routes
├── controllers/
│   └── chatbotController.js  # Request validation and controller logic
├── routes/
│   └── chatbotRoutes.js      # Express router for /api/chatbot
├── services/
│   └── geminiService.js      # Gemini API caller with system prompt and fallback
└── package.json              # Project scripts and dependencies
```

---

## Author

Created for **The CSIT Vault** by [Nishan Dhakal](https://www.dhakalnishan.com.np/).