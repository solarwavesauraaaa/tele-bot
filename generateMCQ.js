const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const { sendMCQToTelegram } = require("./telegram");

const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b";
const DB_FILE = path.join(__dirname, "questions.json");
const HISTORY_LIMIT = 50; // avoid repeats, keep memory small

const TOPICS = [
  "Object Oriented Programming",
  "Data Structures",
  "Algorithms and Complexity",
  "Operating Systems",
  "Computer Networks",
  "Database Management Systems (SQL/NoSQL)",
  "Software Engineering Principles (SDLC, Agile)",
  "Design Patterns",
  "System Design basics",
  "Version Control (Git)",
  "Web Development (HTTP, REST APIs)",
  "Testing (Unit/Integration testing)",
  "Security basics (OWASP, auth)",
  "Cloud Computing basics",
  "General Computer Science fundamentals"
];

function loadHistory() {
  if (!fs.existsSync(DB_FILE)) return { current: null, history: [] };
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  } catch {
    return { current: null, history: [] };
  }
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function buildPrompt(topic, recentQuestions) {
  const avoidList = recentQuestions.length
    ? `Do NOT repeat or closely resemble any of these previous questions:\n${recentQuestions
        .map((q, i) => `${i + 1}. ${q}`)
        .join("\n")}\n\n`
    : "";

  return `You are a quiz generator for software engineers. Generate exactly ONE multiple choice question (MCQ) on the topic: "${topic}".

${avoidList}Rules:
- Return ONLY valid JSON, no markdown fences, no explanation, no extra text.
- JSON must match this exact shape:
{
  "question": "string, clear and concise, max 200 characters",
  "options": {
    "a": "string",
    "b": "string",
    "c": "string",
    "d": "string"
  },
  "correct": "a" | "b" | "c" | "d",
  "explanation": "one sentence explaining why the correct answer is correct",
  "topic": "${topic}"
}

Make sure exactly one option is correct, options are plausible and not trivially obvious, and the question is technically accurate. Output raw JSON only.`;
}

function extractJSON(text) {
  // Strip markdown fences if model adds them anyway, then find the first {...} block
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in model output");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function validateMCQ(mcq) {
  if (!mcq.question || typeof mcq.question !== "string") throw new Error("Invalid question");
  if (!mcq.options || !["a", "b", "c", "d"].every((k) => typeof mcq.options[k] === "string"))
    throw new Error("Invalid options");
  if (!["a", "b", "c", "d"].includes(mcq.correct)) throw new Error("Invalid correct answer");
  return true;
}

async function generateOne(retries = 3) {
  const db = loadHistory();
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  const recentQuestions = db.history.slice(-10).map((q) => q.question);
  const prompt = buildPrompt(topic, recentQuestions);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(OLLAMA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          prompt,
          stream: false,
          options: { temperature: 0.8 }
        })
      });

      if (!res.ok) throw new Error(`Ollama returned status ${res.status}`);
      const data = await res.json();
      const mcq = extractJSON(data.response);
      validateMCQ(mcq);

      mcq.id = Date.now();
      mcq.generatedAt = new Date().toISOString();

      const newDB = loadHistory();
      newDB.current = mcq;
      newDB.history.push({ question: mcq.question, id: mcq.id });
      if (newDB.history.length > HISTORY_LIMIT) {
        newDB.history = newDB.history.slice(-HISTORY_LIMIT);
      }
      saveDB(newDB);

      console.log(`[${new Date().toISOString()}] New MCQ generated (topic: ${topic}):`, mcq.question);

      // Fire-and-forget: don't let a Telegram outage block MCQ generation
      sendMCQToTelegram(mcq).catch((err) =>
        console.error("[generateMCQ] Telegram send threw:", err.message)
      );

      return mcq;
    } catch (err) {
      console.error(`[generateMCQ] Attempt ${attempt} failed:`, err.message);
      if (attempt === retries) {
        console.error("[generateMCQ] All attempts failed. Keeping previous question live.");
        return null;
      }
    }
  }
}

module.exports = { generateOne, loadHistory };
