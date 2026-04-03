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

// CHANGED: Updated the route to indicate it's a stream
app.post('/api/simplify/stream', async (req, res) => {
    let text = req.body?.text;
    let aggressive = req.body?.aggressive || false;

    // --- 1. Set SSE Headers (Crucial for streaming) ---
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        console.log(`Received streaming request to simplify (Aggressive Mode: ${aggressive})`);
        
        if (!text) {
            res.write(`data: ${JSON.stringify({ error: 'Text is required' })}\n\n`);
            return res.end();
        }
        
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

        // --- 2. Use generateContentStream instead of generateContent ---
        const responseStream = await genAI.models.generateContentStream({
            model: "gemini-3.1-flash-lite-preview",
            contents: prompt,
        });
        
        // --- 3. Pipe the chunks to the client instantly ---
        for await (const chunk of responseStream) {
            if (chunk.text) {
                // SSE format requires "data: " followed by stringified JSON and exactly two newlines
                res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
            }
        }

        // --- 4. Close the stream ---
        res.write(`data: [DONE]\n\n`);
        res.end();

    } catch (error) {
        console.error("🚨 AI API Error Details:", error); 
        
        // Because headers are already sent, we must send the error as an SSE stream event
        const errorMessage = error.status == 503 
            ? "API is overloaded, please try again." 
            : (error.message || "Unknown API Error");
            
        res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
        res.end();
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Saral AI Backend running on port ${PORT}`));