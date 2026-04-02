require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/simplify', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'Text is required' });

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
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

        const result = await model.generateContent(prompt);
        const simplifiedText = await result.response.text();

        res.json({ success: true, simplifiedText });

    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: 'Failed to process text' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Saral AI Backend running on port ${PORT}`));