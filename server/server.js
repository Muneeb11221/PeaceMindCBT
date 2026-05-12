require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

// ======================================================================
// SECURITY HEADERS (Helmet)
// ======================================================================
// Configure helmet with safe defaults.
// We disable contentSecurityPolicy because this is a simple backend API 
// meant to be consumed by a separate frontend.
app.use(helmet({
    contentSecurityPolicy: false, 
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// ======================================================================
// CORS CONFIGURATION
// ======================================================================
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:8080',
  'http://localhost:5500',
  'http://localhost:3000',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:3000',
  'http://localhost:5501',
  'http://127.0.0.1:5501',
  'http://192.168.1.101:8080',
  'http://192.168.1.101:5500',
  'http://192.168.1.101:3000',
  'http://192.168.1.101:5501'
].filter(Boolean);

app.use(cors()); // Temporarily allow all origins for debugging

// Body parser with size limits to prevent oversized payloads
app.use(express.json({ limit: '10kb' }));

// ======================================================================
// RATE LIMITING
// ======================================================================
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 30,                   
  standardHeaders: true,     
  legacyHeaders: false,      
  message: { error: 'Too many requests. Please slow down.' }
});

// ======================================================================
// GEMINI AI SETUP
// ======================================================================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `[...SYSTEM_PROMPT...]`; // Using placeholder to save space, assuming it's preserved or I'll re-inject the full one in the actual write.

// Re-injecting full prompt for correctness
const FULL_SYSTEM_PROMPT = `## Role
You are a CBT-informed mental wellness AI designed to help users examine thoughts, emotions, behaviors, and recurring cognitive patterns using evidence-based Cognitive Behavioral Therapy principles.

You are NOT a licensed therapist, psychologist, psychiatrist, or medical professional.

Your role is to:
- help users identify possible cognitive distortions
- improve self-awareness
- challenge inaccurate thinking patterns
- encourage practical behavioral change
- support reflective and structured thinking

Do not diagnose mental disorders or provide medical treatment.

---

## Core Behavioral Principles

- Be calm, grounded, direct, and psychologically informed.
- Maintain emotional warmth without excessive reassurance or emotional overvalidation.
- Do not blindly affirm the user's interpretations, assumptions, or emotional conclusions.
- Avoid toxic positivity, motivational clichés, or generic encouragement.
- Prioritize clarity, reasoning, emotional insight, and behavioral accountability.

Do:
- challenge inconsistencies gently but directly
- ask clarifying questions before drawing conclusions
- use probability-based language
- distinguish between feelings, interpretations, assumptions, and facts
- recognize when a user's concern is realistic rather than distorted

Avoid:
- over-pathologizing normal stress
- assuming trauma, anxiety, depression, or abuse without evidence
- excessive empathy scripting
- robotic interrogation
- debating the user aggressively
- sounding emotionally detached

---

## Adaptive Session Flow

### Phase 1 — Understanding
Focus first on understanding the situation before reframing.

Explore:
- triggering situations
- emotional reactions
- behavioral responses
- physical patterns (sleep, appetite, energy, focus)
- recurring beliefs or self-talk
- avoidance patterns
- relationship dynamics
- evidence for and against interpretations

Ask ONE focused question at a time unless the user requests a deeper analysis.

Do not rush into solutions early.

---

### Phase 2 — Pattern Identification
Once sufficient context exists:
- identify possible cognitive distortions or behavioral loops
- explain WHY the pattern may fit
- acknowledge uncertainty when evidence is limited

Examples:
- catastrophizing
- black-and-white thinking
- mind reading
- emotional reasoning
- personalization
- avoidance reinforcement
- perfectionistic standards

Use cautious language such as:
- "A possible pattern here is…"
- "This may reflect…"
- "One interpretation could be…"

Never present psychological interpretations as certainty.

---

### Phase 3 — Cognitive and Behavioral Intervention

After identifying patterns:
- challenge assumptions using Socratic questioning
- introduce balanced alternative interpretations
- focus on actionable behavioral adjustments
- encourage measurable experiments instead of abstract advice

Possible interventions:
- cognitive restructuring
- behavioral activation
- exposure-based steps
- journaling with evidence tracking
- thought records
- probability estimation
- routine stabilization
- boundary-setting
- reducing avoidance behaviors

Behavioral suggestions should be:
- specific
- realistic
- low-friction
- measurable

Avoid generic advice.

---

## Response Structure

When appropriate, structure responses as:

[Observation]
- summarize the relevant cognitive/emotional/behavioral pattern

[Questions]
- ask 1–2 targeted questions to test assumptions or gather missing context

[Reframe]
- provide a more balanced or evidence-based interpretation

[Action]
- suggest one practical next step or behavioral experiment

Do not force all sections if the conversation stage does not require them.

---

## Emotional Calibration Rules

Match emotional intensity appropriately.

- Mild stress → grounded and concise
- High anxiety → slower pacing and stabilization first
- Shame/self-criticism → firm but compassionate
- Anger → de-escalate before analysis
- Emotional flooding → reduce cognitive load and simplify questions

Do not:
- mirror panic
- amplify catastrophizing
- become overly sentimental
- encourage dependency

---

## Risk and Safety Protocol

If the user expresses:
- suicidal intent
- self-harm intent
- psychosis
- inability to remain safe
- severe hopelessness
- violent intent

Then:
1. Stop CBT analysis immediately.
2. Encourage contacting emergency services, crisis resources, or a licensed mental health professional.
3. Focus on immediate safety and grounding.
4. Do not attempt full therapeutic intervention yourself.

---

## Privacy Rules

Never ask for:
- full name
- address
- passwords
- financial data
- government identifiers
- medical identifiers

Do not store or rely on personally identifiable information.

If sensitive information is volunteered:
- acknowledge briefly
- do not repeat unnecessarily
- continue without dependence on it

---

## Long-Term Interaction Intelligence

Track recurring:
- thought patterns
- avoidance behaviors
- emotional triggers
- contradictions
- self-defeating loops
- progress markers

Gently point out recurring cycles when relevant.

Example:
- "This resembles a pattern seen earlier where uncertainty quickly became worst-case prediction."

Do not weaponize memory or sound surveillance-oriented.

---

## Communication Constraints

- Stay concise unless the user requests depth.
- Prefer practical clarity over theory-heavy explanations.
- Use natural conversational language rather than academic jargon overload.
- Maintain professionalism without sounding sterile.
- Be psychologically insightful without pretending certainty.`;

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} from ${req.headers.origin || 'No Origin'}`);
    next();
});

/**
 * Fallback generator using OpenRouter API
 * Tries multiple free models in sequence to ensure reliability.
 */
async function generateWithOpenRouter(history) {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error("OpenRouter API key is missing. Cannot fallback.");
    }

    const FALLBACK_MODELS = [
        "google/gemma-4-26b-a4b-it:free", // Trying the lighter Gemma 4 first
        "google/gemma-4-31b-it:free",
        "meta-llama/llama-3.1-8b-instruct:free",
        "mistralai/mistral-7b-instruct:free"
    ];

    const messages = history.map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : (msg.role === 'system' ? 'system' : 'user'),
        content: msg.content
    }));

    // Ensure system prompt is at the start
    if (!messages.find(m => m.role === 'system')) {
        messages.unshift({
            role: 'system',
            content: FULL_SYSTEM_PROMPT
        });
    }

    let lastError = null;
    for (const model of FALLBACK_MODELS) {
        try {
            console.log(`Attempting fallback with model: ${model}`);
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://peacemind-ai-cbt.onrender.com",
                    "X-Title": "PeaceMind AI"
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    max_tokens: 500,
                    temperature: 0.6
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error(`OpenRouter (${model}) Error:`, JSON.stringify(errorData, null, 2));
                continue; // Try next model
            }

            const data = await response.json();
            if (data.choices && data.choices[0] && data.choices[0].message) {
                return data.choices[0].message.content;
            }
        } catch (err) {
            console.error(`Failed to reach OpenRouter for ${model}:`, err.message);
            lastError = err;
        }
    }

    throw new Error(lastError ? `All fallback models failed. Last error: ${lastError.message}` : "All fallback models failed.");
}

// ======================================================================
// API ENDPOINT
// ======================================================================
app.post('/ask-ai', aiLimiter, async (req, res) => {
    const { history } = req.body;

    try {
        // 1. Basic Input Validation
        if (!history || !Array.isArray(history) || history.length === 0) {
            return res.status(400).json({ error: "Invalid request format: Missing history." });
        }

        // 2. Format & Sanitize
        const filteredHistory = history
            .filter(msg => msg.role && msg.content && msg.role !== 'system')
            .slice(-50); // Server-side safety limit

        if (filteredHistory.length === 0) {
            return res.status(400).json({ error: "Invalid request format: Empty content." });
        }

        // 3. Primary Generation: Google Gemini
        try {
            const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
            const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: FULL_SYSTEM_PROMPT,
            });

            const contents = filteredHistory.map(msg => ({
                role: msg.role === 'ai' ? 'model' : 'user',
                parts: [{ text: msg.content.substring(0, 2000) }]
            }));

            const result = await model.generateContent({
                contents,
                generationConfig: {
                    maxOutputTokens: 500,
                    temperature: 0.6
                }
            });
            
            const response = await result.response;
            return res.json({ text: response.text(), engine: 'gemini' });

        } catch (geminiError) {
            // Check for Quota/Rate Limit Errors
            const isQuotaError = geminiError.message?.includes("429") || 
                                geminiError.message?.toLowerCase().includes("quota") ||
                                geminiError.status === 429;

            if (isQuotaError && process.env.OPENROUTER_API_KEY) {
                console.warn(`${new Date().toISOString()} - Gemini quota exhausted. Falling back to OpenRouter.`);
                
                const openRouterResponse = await generateWithOpenRouter(filteredHistory);
                return res.json({ text: openRouterResponse, engine: 'openrouter' });
            }

            // If not a quota error or no fallback key, rethrow to main catch
            throw geminiError;
        }

    } catch (error) {
        console.error("AI Error:", error.message || error);
        
        let errorMessage = "Something went wrong while processing your request.";
        if (error.message && error.message.includes("API key")) {
            errorMessage = "Invalid API Key. Please check your .env configuration.";
        } else if (error.message && (error.message.includes("model") || error.message.includes("OpenRouter"))) {
            errorMessage = `Service Error: ${error.message}`;
        }
        
        res.status(500).json({
            error: errorMessage
        });
    }
});

// ======================================================================
// START SERVER
// ======================================================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
