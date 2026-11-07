// Master Seth's Ebook Creative Publishing Lab — Backend (CommonJS for Render)
// PERPETUAL CORE — DO NOT REMOVE / DO NOT DILUTE
// UI may change, CORE NEVER CHANGES. Core lives HERE, not in UI.

const express = require("express");
const cors = require("cors");
require("dotenv").config();

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


// ============================================================
// AARLOOP — BACKEND ONLY, INVISIBLE TO USER
// User sees: CREATE -> Quality Book. No repair button. No problem.
// Backend: ANALYZE -> ASSESS -> REVISE -> TEST -> EVALUATE -> LOOP (max 3)
// ============================================================
function analyzeBook(data, parsedPageCount){
  const issues = [];
  if(!data) issues.push("No data returned");
  if(!data?.title) issues.push("Missing title");
  if(!data?.characters || !Array.isArray(data.characters) || data.characters.length===0) issues.push("Missing characters");
  if(!data?.pages || !Array.isArray(data.pages) || data.pages.length===0) issues.push("Missing pages");
  else {
    if(parsedPageCount!=="auto" && data.pages.length !== parseInt(parsedPageCount)) issues.push(`Page count mismatch: requested ${parsedPageCount}, got ${data.pages.length}`);
    data.pages.forEach((pg,i)=>{
      if(!pg.text || String(pg.text).trim().length < 10) issues.push(`Page ${pg.page||i+1}: text too short / missing`);
      if(!pg.illustration || String(pg.illustration).trim().length < 20) issues.push(`Page ${pg.page||i+1}: illustration prompt too short / missing`);
      const chars = (data.characters||[]).map(c=> String(c).split(" - ")[0].split(" ")[0].trim()).filter(Boolean);
      const hasChar = chars.some(name => name && pg.illustration && String(pg.illustration).toLowerCase().includes(name.toLowerCase()));
      if(chars.length>0 && !hasChar) issues.push(`Page ${pg.page||i+1}: illustration does not mention any character (${chars.join(", ")}) — consistency risk`);
      const leak = ["groq","story lab","prompt:","system prompt"].some(w => pg.text && String(pg.text).toLowerCase().includes(w));
      if(leak) issues.push(`Page ${pg.page||i+1}: possible prompt leakage in text`);
    });
  }
  if(!data?.moral || String(data.moral||"").trim().length < 10) issues.push("Missing / too short moral");
  return issues;
}
function assessScore(issues){ return Math.max(0, 100 - issues.length*10); }
function buildRevisePrompt(originalData, issues, style, additional, parsedPageCount){
  return `You are revising a book for Master Seth's Ebook Creative Publishing Lab. Do NOT start over. FIX ONLY the issues below. Keep everything else EXACTLY the same — same title, same characters, same story, same world.\n\nORIGINAL BOOK JSON:\n${JSON.stringify(originalData).slice(0,12000)}\n\nISSUES TO FIX (AARLOOP):\n${issues.map((x,i)=> (i+1)+". "+x).join("\n")}\n\nPERPETUAL CORE — OBEY:\n1. CHARACTER CONSISTENCY: Use EXACT same character description in every illustration prompt.\n2. FULL-BLEED: Every page is full-bleed illustration, text overlay only.\n3. STORY FIRST, MORAL GENTLE.\n4. PAGE COUNT: ${parsedPageCount==="auto" ? "Keep same page count as original" : "EXACTLY "+parsedPageCount+" pages"}\n5. STYLE: ${style || "warm, gentle, premium storybook watercolor"}\n6. NO LEAKAGE: Never mention Groq, AI, prompt, system in story text.\n7. ONE BOOK ONE LESSON. Additional: ${additional||""}\n\nReturn ONLY valid JSON in same format: {title, characters, pages:[{page, text, illustration}], moral, backCoverSynopsis}`;
}

app.post("/api/story", async (req, res) => {
  try{
    const { storyIdea, style, additional, pageCount } = req.body;
    if(!storyIdea) return res.status(400).json({error:"storyIdea required"});
    if(!GROQ_API_KEY) return res.status(500).json({error:"NO_GROQ_KEY: GROQ_API_KEY is missing in Render > Environment."});
    const parsedPageCount = (!pageCount || pageCount==="auto") ? "auto" : String(parseInt(pageCount) || "auto");
    async function callGroq(messages, label){
      const MODELS = ["openai/gpt-oss-120b", "llama-3.1-8b-instant", "llama-3.3-70b-versatile"];
      let lastErr = "";
      for (const model of MODELS) {
        console.log(`[${label}] Trying Groq model:`, model);
        const r = await fetch(GROQ_URL, {
          method:"POST",
          headers:{ "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type":"application/json" },
          body: JSON.stringify({ model, temperature:0.7, messages })
        });
        const j = await r.json();
        if (!j.error) return { r, j, model };
        lastErr = j.error?.message || JSON.stringify(j.error);
        console.log(`[${label}] Model failed:`, model, "status:", r.status, lastErr.slice(0,300));
        if (r.status !== 404 && !lastErr.toLowerCase().includes("does not exist")) break;
      }
      return { r: null, j: { error: { message: lastErr || "All Groq models failed" } }, model: "none" };
    }
    let { r, j } = await callGroq([
      {role:"system", content: buildSystemPrompt(style, additional, parsedPageCount)},
      {role:"user", content: `Create a complete book (1 Cover + N Story Pages + 1 Back Cover) for this idea: ${storyIdea}. Return ONLY JSON.`}
    ], "CREATE");
    if (j.error) return res.status(500).json({error: "GROQ_ERROR: " + (j.error.message || JSON.stringify(j.error)).slice(0,800)});
    let raw = j.choices?.[0]?.message?.content || "";
    console.log("GROQ raw length:", raw.length);
    raw = raw.replace(/```json/g,"").replace(/```/g,"").trim();
    if (!raw) return res.status(500).json({error: "GROQ_EMPTY: Groq returned empty content."});
    let data;
    try { data = JSON.parse(raw); } catch(e){ return res.status(500).json({error: "GROQ_BAD_JSON: " + raw.slice(0,500)}); }
    for (let loop = 1; loop <= 3; loop++) {
      const issues = analyzeBook(data, parsedPageCount);
      const score = assessScore(issues);
      console.log(`[AARLOOP ${loop}/3] ANALYZE: ${issues.length} issues, ASSESS score: ${score}/100`, issues.length ? JSON.stringify(issues).slice(0,800) : "CLEAN");
      if (issues.length === 0 || score >= 90) { console.log(`[AARLOOP] EVALUATE: PASS (${score}/100) — delivering to user.`); break; }
      if (loop === 3) { console.log(`[AARLOOP] EVALUATE: Best effort after 3 loops (${score}/100) — delivering best version.`); break; }
      console.log(`[AARLOOP ${loop}/3] REVISE: fixing ${issues.length} issues via Groq...`);
      const rev = await callGroq([
        {role:"system", content: "You are a book reviser for Master Seth's Lab. Fix ONLY the listed issues. Keep everything else exactly the same. Return ONLY JSON."},
        {role:"user", content: buildRevisePrompt(data, issues, style, additional, parsedPageCount)}
      ], `REVISE-${loop}`);
      if (rev.j.error) { console.log(`[AARLOOP ${loop}] REVISE failed:`, rev.j.error.message?.slice(0,300)); break; }
      let raw2 = rev.j.choices?.[0]?.message?.content || "";
      raw2 = raw2.replace(/```json/g,"").replace(/```/g,"").trim();
      if (!raw2) { console.log(`[AARLOOP ${loop}] REVISE returned empty, keeping previous version`); break; }
      try { data = JSON.parse(raw2); console.log(`[AARLOOP ${loop}] TEST: revised JSON parsed OK`); }
      catch(e){ console.log(`[AARLOOP ${loop}] TEST: revised JSON parse failed, keeping previous version`); break; }
    }
    res.json(data);
  }catch(e){ console.error(e); res.status(500).json({error:String(e.message)}); }
});

app.get("/", (req,res)=> res.send("Master Seth's Ebook Creative Publishing Lab Backend — Perpetual Core Active"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log("Running on", PORT, "— Perpetual Core Active, Dynamic Pages"));
