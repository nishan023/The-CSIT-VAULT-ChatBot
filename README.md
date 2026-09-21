# The CSIT Vault Chatbot

Node.js/Express API for The CSIT Vault study assistant, powered by Gemini. Use Node.js 20 or newer.

## Run locally

```powershell
npm install
# Only if .env does not already exist:
Copy-Item .env.example .env
npm run check:gemini
npm start
```

Set GEMINI_API_KEY in the backend .env file before running the connection check. Keep the existing key if the check succeeds. The sample model is gemini-3.6-flash; GEMINI_MODEL can select another model supported by your project.

When the sibling ChatBot-Frontend folder is present, open http://localhost:5000 for the complete UI. If only the backend repository is deployed, / returns service information; host the frontend repository separately.

## Fixing the leaked/revoked key message

A key blocked by Google cannot be repaired in code. If **npm run check:gemini** reports API_KEY_REVOKED:

1. Create a replacement in [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Set GEMINI_API_KEY in the backend .env for local development.
3. For the deployed service, update **Render → your service → Environment → GEMINI_API_KEY** as well.
4. Restart the backend or redeploy Render. The running process loads configuration at startup.
5. Run npm run check:gemini again, then test a question.

Changing a laptop .env does not update Render. Hosting environment variables take precedence over .env. If the local check succeeds but an old process or the deployed app still reports a revoked key, restart/update that environment rather than repeatedly changing models.

Never put a Gemini key in HTML, browser JavaScript, Blogger gadgets, screenshots, or source control. .env and logs are ignored by Git. The API sends the key to Google in an HTTP header, not in the URL. No raw provider errors or student prompts are logged by the new chatbot code.

Reference: [Google's blocked-key troubleshooting](https://ai.google.dev/gemini-api/docs/troubleshooting#blocked-or-non-working-api-keys).

## Render deployment

- Deploy the backend repository.
- Build command: npm ci
- Start command: npm start
- Environment: GEMINI_API_KEY and optionally GEMINI_MODEL.
- Let Render supply PORT.
- Restart/redeploy after changing environment variables.
- Deploy frontend changes separately; its default public API URL is https://the-csit-vault-chatbot.onrender.com.

The backend has no compilation step. The previous recursive build script was removed.

## API

### GET /health

Reports server liveness and locally known AI state. It makes no paid Gemini request and never returns the key.

```json
{
  "status": "OK",
  "message": "Server is running",
  "apiKeyConfigured": true,
  "aiStatus": "not_checked",
  "timestamp": "..."
}
```

aiStatus is not_configured, not_checked, ready, degraded or unavailable. A configured key is not proof that it works; ready means a prior Gemini request succeeded in this process.

### POST /api/chatbot/ask

```json
{
  "prompt": "Explain binary search",
  "history": [
    { "role": "user", "text": "I am learning algorithms." },
    { "role": "model", "text": "What would you like to explore?" }
  ]
}
```

prompt must contain 1–4,000 characters. Optional history contains at most 10 alternating user/model messages (five completed exchanges), each at most 30,000 characters. Success returns { "success": true, "reply": "..." }.

Failures return { "success": false, "code": "...", "error": "visitor-safe message", "retryable": false }:

| Status | Examples |
| --- | --- |
| 400 | Invalid question, JSON or history |
| 413 | Request body exceeds 384 KB |
| 422 | Gemini blocked the answer |
| 429 | Gemini quota/rate limit; includes Retry-After |
| 502 | Empty response or rejected provider request |
| 503 | Missing/rejected key, unavailable model or provider |
| 504 | Gemini request timed out |

Rejected credentials are remembered in this server process so repeated questions do not repeatedly call Google with the same bad key. Restart after fixing credentials or permission settings. There are no automatic retries or surprise model substitutions. Transient failures can be retried explicitly; they do not block future requests.

## Checks

```powershell
npm test
npm run check:gemini
```

The test suite uses mocked Gemini responses and local HTTP requests, with no API usage. The connection check makes one small real Gemini request and prints a safe result without the credential.

## Blogger

The frontend includes an isolated floating widget (embed.js), compact iframe layout (?embed=1), and step-by-step installation instructions in the frontend README. Deploy the frontend over HTTPS before adding it to Blogger.

Created for The CSIT Vault by Nishan Dhakal.
