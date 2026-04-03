require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per window
    message: {
        success: false,
        error: "Too many requests, please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false
});

const app = express();
app.use(cors());
app.use(express.json());
app.use(limiter);

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/simplify', async (req, res) => {
    let text = req.body?.text;
    let aggressive = req.body?.aggressive || false; // NEW: Receive the CLS decision

    try {
        console.log(`Received request to simplify (Aggressive Mode: ${aggressive})`);
        if (!text) return res.status(400).json({ error: 'Text is required' });
        
        // --- NEW: Dynamic Prompt Engineering based on CLS ---
        let promptInstruction = `
            You are Saral AI, an accessibility assistant. Rewrite the following text to reduce cognitive load.
            - Use simple, direct language (5th-grade reading level).
            - Remove metaphors, idioms, and complex jargon.
            - Break up long, winding sentences into shorter ones.
        `;

        if (aggressive) {
            promptInstruction = `
                You are Saral AI, an accessibility assistant. The user is currently experiencing HIGH cognitive overload from visual clutter or complex text. 
                - Be EXTREMELY concise.
                - Use bullet points to summarize key ideas where possible.
                - Do not use words with more than 3 syllables.
                - Prioritize absolute clarity over preserving the original writing style.
            `;
        }

        const prompt = `
            ${promptInstruction}
            - Output ONLY the simplified text. Do not add conversational filler.
            
            Text to simplify:
            ${text}
        `;

        const result = await genAI.models.generateContent({
            model: "gemini-3.1-flash-lite-preview",
            contents: prompt,
        });
        
        const simplifiedText = result.text;
        res.json({ success: true, simplifiedText });

    } catch (error) {
        console.error("🚨 AI API Error Details:", error); 
        
        if(error.status == 503){
            console.log("API is overloaded");
            return res.json({ success: true, simplifiedText: text });
        }
        
        res.status(500).json({ 
            error: 'Failed to process text', 
            details: error.message || "Unknown API Error" 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Saral AI Backend running on port ${PORT}`));