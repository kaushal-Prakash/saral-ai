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
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false
});

const app = express();
app.use(cors());
app.use(express.json());
app.use(limiter);


const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/simplify', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'Text is required' });
        
        // Prompt Engineering for Cognitive Simplicity
        const prompt = `
        You are Saral AI, an accessibility assistant. Rewrite the following text to reduce cognitive load.
        - Use simple, direct language (5th-grade reading level).
        - Remove metaphors, idioms, and complex jargon.
        - Break up long, winding sentences into shorter ones.
        - Output ONLY the simplified text. Do not add conversational filler.
        
        Text to simplify:
        ${text}
        `;

        const result = await genAI.models.generateContent({
            model:"gemini-3-flash-preview",
            contents:prompt,
        });
        const simplifiedText = result.text;

        res.json({ success: true, simplifiedText });

    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: 'Failed to process text' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Saral AI Backend running on port ${PORT}`));