# PeaceMind AI: Privacy & Data Flow Analysis

I have completed a thorough analysis of the codebase (frontend and backend) to determine how data is stored and whether personal information is sent to the internet. Here are the final results:

## 1. Storage: Are chats stored locally?
**Yes, 100% locally.** 
- The application uses browser `localStorage` (in `js/storage.js`) to save your Chat History, Mood Logs, and CBT Homework.
- The `server.js` backend does **not** connect to any database (like MongoDB or PostgreSQL). It does not log or save user conversations to disk.

## 2. Transmission: Is data going to the internet?
**Yes, to process AI responses.**
- Because the AI model does not run locally on the user's physical device, the application must send the chat history to the internet to get a response.
- **Data Flow:** When a user sends a message, `js/ai.js` sends the chat history to your Node.js backend (`/ask-ai`). Your backend then forwards this text to **Google's Gemini API** (and optionally **OpenRouter** as a fallback) to generate the therapist's reply. 

## 3. Personal Information Risk
**There are no tracking scripts or telemetry.** 
- I checked for Google Analytics, Facebook Pixels, or secret background tracking. The app is clean.

> [!WARNING]
> **User Input Risk**
> Because chat histories are sent to Google/OpenRouter for processing, **if a user explicitly types their name, phone number, address, or medical information into the chat box, that information WILL be transmitted over the internet to those third-party AI providers.**

## 4. Current Safeguards in Place
Your `server.js` includes strong protective measures within the `SYSTEM_PROMPT`:
- The AI is explicitly told: *"Never ask for or store: full name, address, passwords, financial data..."*
- If the user volunteers sensitive info, the AI is instructed to ignore it, tell the user not to share it, and never repeat it back to them.

## Conclusion
The application perfectly adheres to the architectural design of a localized privacy app. Storage is completely local, and the backend is completely stateless. However, because you are using external APIs (Gemini/OpenRouter) instead of a local on-device LLM, the chat text itself must travel over the internet. You rely on Google and OpenRouter's enterprise privacy policies to ensure that data in transit is not misused.
