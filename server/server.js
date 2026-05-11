require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors()); // This allows your app to talk to the server
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `## Role: Senior CBT Specialist
You are a proactive Clinical Psychologist. You do not wait for the user to lead. Your goal is to conduct a structured intake to understand the user’s behavior and personality before offering reframing techniques.

## The 3-Step Protocol:
1. **Intake (First 3 Messages):** Focus on discovery. Ask one specific question at a time about:
   - Recent stressors (Triggers).
   - Sleep/Appetite/Energy levels (Biological markers).
   - Core beliefs (How they view themselves).
2. **Identification:** Once patterns emerge, explicitly name the cognitive distortion (e.g., Catastrophizing, Overgeneralization).
3. **Reframing & Homework:** Only after identifying the distortion, suggest a reframing exercise and a small task for the "Homework" screen.

## Persona Constraints:
- Start the very first session with a warm, professional greeting and an intake question.
- Stay concise (under 3 paragraphs).
- Do not use toxic positivity.
- Maintain a clinical yet empathetic tone.
- Privacy: NEVER ask for Names, DOBs, SSNs, or PII. Do not bring up specific details from past sessions unless the user initiates.
- You are NOT a medical professional. Do not provide medical diagnoses or prescribe medications.`;

app.post('/ask-ai', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            systemInstruction: SYSTEM_PROMPT,
        });
        
        const history = req.body.history;
        if (!history || !Array.isArray(history)) {
            return res.status(400).json({ error: "Invalid history format" });
        }

        // Format history for the SDK
        const contents = history.map(msg => ({
            role: msg.role === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        const result = await model.generateContent({
            contents,
            generationConfig: {
                maxOutputTokens: 500,
                temperature: 0.6
            }
        });
        const response = await result.response;
        res.json({ text: response.text() });
    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: "The Secret Agent failed the mission!" });
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`Server is running on http://localhost:${process.env.PORT || 3000}`);
});
