import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const GROQ_KEY = process.env.GROQ_API_KEY;

app.post("/api/story", async (req, res) => {
  const { storyIdea, style, additional } = req.body;

  const prompt = `You are a children's storybook writer.
Write an original 8-page storybook based on this idea:
Story Idea: ${storyIdea}
Style: ${style || "warm, gentle"}
Additional: ${additional || "none"}

Return ONLY valid JSON in this format:
{
  "title": "Title Here",
  "characters": ["Name - description"],
  "pages": [
    { "page": 1, "text": "story text...", "illustration": "describe illustration" }
  ],
  "moral": "moral here"
}
No markdown, no extra text, JSON only.`;

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    const data = await r.json();
    const content = data.choices[0].message.content;
    res.json(JSON.parse(content));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3001, () => console.log("Groq Lab running on http://localhost:3001"));