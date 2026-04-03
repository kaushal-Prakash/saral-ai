require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");
const rateLimit = require("express-rate-limit");

const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(limiter);

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

function buildPrompt(text, aggressive) {
  if (aggressive) {
    return `
You are Saral AI, an accessibility assistant for HIGH cognitive overload.

Rewrite the text into a very clean, simple, structured format.

Rules:
- Use ONLY plain text
- Use short lines
- Use "-" for bullets
- Keep sentences very short
- Use simple vocabulary
- Group related ideas together
- Do NOT use markdown
- Do NOT use HTML
- Do NOT explain your rules

Text:
${text}
`.trim();
  }

  return `
You are Saral AI, an accessibility assistant.

Rewrite the text into clean, structured plain text for easy reading.

Rules:
- Use ONLY plain text
- Use short paragraphs
- Use "-" for bullet points when useful
- Keep sentences short and direct
- Group related ideas together
- Preserve the meaning
- Do NOT use markdown
- Do NOT use HTML
- Do NOT explain your rules

Text:
${text}
`.trim();
}

app.post("/api/simplify/stream", async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  const aggressive = Boolean(req.body?.aggressive);

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  let aborted = false;
  const markAborted = () => {
    aborted = true;
  };

  req.on("close", markAborted);
  req.on("aborted", markAborted);

  try {
    if (!text) {
      res.write(`data: ${JSON.stringify({ error: "Text is required" })}\n\n`);
      return res.end();
    }

    const prompt = buildPrompt(text, aggressive);

    const responseStream = await genAI.models.generateContentStream({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
    });

    for await (const chunk of responseStream) {
      if (aborted) break;

      const piece = chunk?.text;
      if (piece) {
        res.write(`data: ${JSON.stringify({ text: piece })}\n\n`);
      }
    }

    if (!aborted) {
      res.write("data: [DONE]\n\n");
    }
    res.end();
  } catch (error) {
    const errorMessage =
      error?.status === 503
        ? "API is overloaded, please try again."
        : error?.message || "Unknown API error";

    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.end();
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Saral AI Backend running on port ${PORT}`);
});