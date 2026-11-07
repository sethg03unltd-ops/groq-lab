// Master Seth's Ebook Creative Publishing Lab — Backend (ES Module)
// PERPETUAL CORE — DO NOT REMOVE / DO NOT DILUTE
// UI may change, CORE NEVER CHANGES. Core lives HERE, not in UI.

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// PERPETUAL CORE:
// 1. CHARACTER CONSISTENCY IS SACRED — same hair/clothes/age every page
// 2. FULL-BLEED PICTURE BOOK, NOT MANUSCRIPT — text overlay only, never show prompt/header/footer inside book
// 3. STORY FIRST, MORAL GENTLE — moral felt, not preachy
// 4. DYNAMIC PAGE COUNT — NO HARD LIMIT. If user says N, make N. If AUTO, AI decides how many needed to COMPLETE book. Completeness > fixed number. NEVER force 8 or 10.
// 5. WARM, GENTLE, CHILD-SAFE (or match category) — no scary, no clutter
// 6. TEXT FOR READING ALOUD — short paragraphs, 2-4 sentences per story page (longer for adult/teens/guide)
// 7. NO PROMPT LEAKAGE — reader sees ONLY Title + Story + Illustrations + Moral
// 8. ONE BOOK = ONE LESSON = ONE WORLD — never mix brands in one book

function buildSystemPrompt(style, additional, pageCount){
  const pageInstruction = (!pageCount || pageCount==="auto")
    ? `PAGE COUNT: AUTO. Decide how many story pages are needed to COMPLETE this book properly. Do NOT force 8 or 10. If story needs 12, make 12. If needs 18, make 18. If needs 6, make 6. Completeness > fixed number.`
    : `PAGE COUNT: EXACTLY ${pageCount} story pages. Do NOT make more, do NOT make less. User requested this count to complete the book.`;
  return `You are a children's / general book author + illustrator for Master Seth's Ebook Creative Publishing Lab.

PERPETUAL CORE — OBEY ALWAYS:
1. CHARACTER CONSISTENCY: Define each character ONCE with exact hair, clothes, age, features. Use EXACT same description in every page illustration prompt.
2. FULL-BLEED: Every story page is full-bleed illustration. Text overlay only. Never output prompt labels, headers, footers, page numbers inside book content.
3. STORY FIRST: Warm, gentle, read-aloud friendly. Moral felt, not preachy.
4. STRUCTURE: 1 Cover + N Story Pages + 1 Back Cover, N follows PAGE COUNT below. ${pageInstruction}
5. STYLE: ${style || "warm, gentle, premium storybook watercolor, child-friendly"}
6. NO LEAKAGE: Never mention Groq, Story Lab, AI, prompt, or system in story text.
7. ONE BOOK ONE LESSON: One title, one world, one lesson. Additional instructions: ${additional || ""}

Return ONLY valid JSON:
{
  "title": "Book Title",
  "characters": ["Maya - 7 years old, curly dark brown hair, yellow sweater, denim overalls"],
  "pages": [{"page": 1, "text": "Story text.", "illustration": "Full detailed illustration prompt with EXACT same character description, full-bleed, scene, no text in image"}],
  "moral": "One gentle sentence moral.",
  "backCoverSynopsis": "2-3 sentences for back cover, inviting."
}
Pages must be exactly N items, page 1 to N. Every illustration prompt MUST repeat full character description verbatim.`;
}

app.post("/api/story", async (req, res) => {
  try{
    const { storyIdea, style, additional, pageCount } = req.body;
    if(!storyIdea) return res.status(400).json({error:"storyIdea required"});
    const parsedPageCount = (!pageCount || pageCount==="auto") ? "auto" : String(parseInt(pageCount) || "auto");
    const r = await fetch(GROQ_URL, {
      method:"POST",
      headers:{ "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type":"application/json" },
      body: JSON.stringify({
        model:"llama-3.3-70b-versatile",
        temperature:0.7,
        messages:[
          {role:"system", content: buildSystemPrompt(style, additional, parsedPageCount)},
          {role:"user", content: `Create a complete book (1 Cover + N Story Pages + 1 Back Cover) for this idea: ${storyIdea}. Return ONLY JSON.`}
        ]
      })
    });
    const j = await r.json();
    let raw = j.choices?.[0]?.message?.content || "";
    raw = raw.replace(/```json/g,"").replace(/```/g,"").trim();
    const data = JSON.parse(raw);
    if(parsedPageCount!=="auto" && data.pages && data.pages.length !== parseInt(parsedPageCount)){
      console.warn("Page count mismatch: requested", parsedPageCount, "got", data.pages.length, "- keeping AI output, completeness wins");
    }
    res.json(data);
  }catch(e){ console.error(e); res.status(500).json({error:String(e.message)}); }
});

app.get("/", (req,res)=> res.send("Master Seth's Ebook Creative Publishing Lab Backend — Perpetual Core Active"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log("Running on", PORT, "— Perpetual Core Active, Dynamic Pages"));
