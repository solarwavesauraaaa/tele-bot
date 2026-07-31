require("dotenv").config();

const express = require("express");
const cron = require("node-cron");
const path = require("path");
const { generateOne, loadHistory } = require("./generateMCQ");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Return current live question (without exposing correct answer to front-end)
app.get("/api/current-question", (req, res) => {
  const db = loadHistory();
  if (!db.current) return res.json({ question: null });

  const { correct, explanation, ...safe } = db.current;
  res.json(safe);
});

// Validate answer server-side
app.post("/api/check-answer", (req, res) => {
  const { id, answer } = req.body;
  const db = loadHistory();

  if (!db.current || db.current.id !== id) {
    return res.status(400).json({ error: "Question expired, fetch the latest one." });
  }

  const isCorrect = db.current.correct === answer;
  res.json({
    correct: isCorrect,
    correctAnswer: db.current.correct,
    explanation: db.current.explanation
  });
});

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`MCQ server running at http://0.0.0.0:${PORT}`);

  const db = loadHistory();
  if (!db.current) {
    console.log("No question found, generating first MCQ...");
    await generateOne();
  }

  // Cron schedule: triggers every 10 minutes
  cron.schedule("*/10 * * * *", async () => {
    console.log("Cron triggered: generating new MCQ...");
    await generateOne();
  });
});
