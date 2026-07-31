const fetch = require("node-fetch");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function isConfigured() {
  return Boolean(BOT_TOKEN && CHAT_ID);
}

const MAX_QUESTION_LEN = 300;
const MAX_OPTION_LEN = 100;
const MAX_EXPLANATION_LEN = 200;

function truncate(text = "", max) {
  const str = String(text);
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

async function sendMCQToTelegram(mcq) {
  if (!isConfigured()) {
    console.warn(
      "[telegram] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set — skipping Telegram send."
    );
    return { skipped: true };
  }

  const letters = ["a", "b", "c", "d"];
  const correctOptionId = letters.indexOf(mcq.correct);

  const topicPrefix = mcq.topic ? `[${mcq.topic}] ` : "";
  const body = {
    chat_id: CHAT_ID,
    type: "quiz",
    question: truncate(topicPrefix + mcq.question, MAX_QUESTION_LEN),
    options: letters.map((l) => truncate(mcq.options[l], MAX_OPTION_LEN)),
    correct_option_id: correctOptionId,
    is_anonymous: true,
    explanation: mcq.explanation ? truncate(mcq.explanation, MAX_EXPLANATION_LEN) : undefined
  };

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPoll`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    if (!data.ok) {
      console.error("[telegram] API error:", data.description);
      return { ok: false, error: data.description };
    }

    console.log("[telegram] MCQ quiz poll sent to channel successfully.");
    return { ok: true };
  } catch (err) {
    console.error("[telegram] Failed to send poll:", err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { sendMCQToTelegram, isConfigured };
