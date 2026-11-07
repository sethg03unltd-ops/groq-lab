// Story Lab Backend — Groq Lab
// PERPETUAL CORE — DO NOT REMOVE / DO NOT DILUTE
// This is the original master prompt core. UI may change, CORE NEVER CHANGES.

const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
app.use(cors());
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// ============================================================
// PERPETUAL CORE PRINCIPLE — MASTER PROMPT (ORIGINAL)
// ============================================================
// 1. CHARACTER CONSISTENCY IS SACRED
//    Same character description in EVERY page. Same hair, same clothes,
//    same age, same features. Never redesign mid-book.
//    If Maya has curly hair + yellow sweater + overalls on Page 1,
//    she MUST have the same on Page 10 and Cover.
// 2. FULL-BLEED PICTURE BOOK, NOT MANUSCRIPT
//    Every page is a full-bleed illustration. Text is OVERLAY only,
//    in a clean white rounded box, top or bottom depending on illustration.
//    NEVER show illustration prompt, NEVER show header/footer labels,
//    NEVER show "Page X of Y" inside the book.
// 3. STORY FIRST, MORAL GENTLE, NEVER PREACHY
//    Story must be readable alone. Moral is felt, not lectured.
//    Moral appears ONLY on Moral Page / Back Cover, not forced in every page.
// 4. A4 PORTRAIT, 12-PAGE BOOK STRUCTURE (FIXED)
//    Page 1 = Front Cover (full-bleed, title integrated)
//    Pages 2-11 = Story Pages (10 story pages, full-bleed)
//    Page 12 = Back Cover (synopsis + final illustration + The End)
//    NEVER change structure to 8 random pages. 12 pages = 1 complete book.
// 5. WARM, GENTLE, CHILD-SAFE VISUAL LANGUAGE
//    Warm watercolor / soft storybook illustration. No scary, no dark,
//    no photorealistic, no clutter. US children's book standard.
// 6. TEXT FOR READING ALOUD
//    Short paragraphs, 2-4 sentences per page. Simple words.
//    Parent can read aloud in one breath. No long walls of text.
// 7. NO PROMPT LEAKAGE
//    The reader NEVER sees the prompt, the system, the brand, or the tool.
//    What the reader sees is ONLY: Title + Story + Illustrations + Moral.
// 8. ONE BOOK = ONE LESSON = ONE WORLD
//    One title, one set of characters, one world, one lesson.
//    NEVER mix BaBaKuKi + 4LE + other brands in one book. NEVER halo-halo.
// ============================================================

function buildSystemPrompt(style, additional){
  return `You are a children's picture book author + illustrator for Story Lab.

PERPETUAL CORE — YOU MUST OBEY ALWAYS, NO EXCEPTIONS:
1. CHARACTER CONSISTENCY: Define each character ONCE with exact hair, clothes, age, features. Use the EXACT same description in every single page illustration prompt. Never change outfit mid-book.
2. FULL-BLEED PICTURE BOOK: Every page is a full-bleed illustration. Text is overlay only. Never output prompt labels, headers, footers, or page numbers inside the book content.
3. STORY FIRST: 10 story pages, 2-4 sentences each, warm, gentle, read-aloud friendly. Moral is felt, not preachy.
4. STRUCTURE: 12-page book total = 1 Cover + 10 Story Pages + 1 Back Cover. Return exactly 10 story pages in JSON.
5. STYLE: Warm watercolor storybook, soft light, child-safe, US children's book. Style requested: ${style || "warm, gentle, premium storybook watercolor, child-friendly"}
6. NO LEAKAGE: Never mention Groq, Story Lab, AI, prompt, or system in story text.
7. ONE BOOK ONE LESSON: One title, one world, one lesson. Additional instructions: ${additional || ""}

Return ONLY valid JSON in this exact shape:
{
  "title": "Book Title",
  "characters": ["Maya - 7 years old, curly dark brown hair, yellow sweater, denim overalls, warm brown eyes"],
  "pages": [
    {"page": 1, "text": "Story text 2-4 sentences.", "illustration": "Full detailed illustration prompt with EXACT same character description, full-bleed, warm watercolor, scene description, no text in image"}
  ],
  "moral": "One gentle sentence moral.",
  "backCoverSynopsis": "2-3 sentences for back cover, inviting, no moral lecture."
}
Pages must be 10 items, page 1 to 10. Characters array must contain FULL character descriptions with hair + clothes + age. Every illustration prompt MUST repeat the full character description verbatim.`;
}

app.post("/api/story", async (req, res) => {
  try{
    const { storyIdea, style, additional } = req.body;
    if(!storyIdea) return res.status(400).json({error:"storyIdea required"});
    const r = await fetch(GROQ_URL, {
      method:"POST",
      headers:{ "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type":"application/json" },
      body: JSON.stringify({
        model:"llama-3.3-70b-versatile",
        temperature:0.7,
        messages:[
          {role:"system", content: buildSystemPrompt(style, additional)},
          {role:"user", content: `Create a complete 12-page picture book (1 Cover + 10 Story Pages + 1 Back Cover) for this idea: ${storyIdea}. Return ONLY JSON.`}
        ]
      })
    });
    const j = await r.json();
    let raw = j.choices?.[0]?.message?.content || "";
    raw = raw.replace(/```json/g,"").replace(/```/g,"").trim();
    const data = JSON.parse(raw);
    // Perpetual Core guard: enforce 10 pages
    if(!data.pages || data.pages.length !== 10){
      console.warn("Perpetual Core violation: pages != 10, got", data.pages?.length);
    }
    res.json(data);
  }catch(e){ console.error(e); res.status(500).json({error:String(e.message)}); }
});

app.get("/", (req,res)=> res.send("Story Lab Backend — Perpetual Core Active"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log("Story Lab running on", PORT, "— Perpetual Core Active"));
