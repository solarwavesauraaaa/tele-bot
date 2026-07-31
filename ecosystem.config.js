module.exports = {
  apps: [
    {
      name: "mcq-app",
      script: "server.js",
      cwd: __dirname,

      // --- 24x7 reliability ---
      instances: 1,
      exec_mode: "fork",
      autorestart: true,          // restart on crash
      watch: false,                // don't restart on file edits in prod
      max_memory_restart: "300M", // restart if it ever leaks/balloons
      min_uptime: "30s",           // must stay up 30s to count as a "good" start
      max_restarts: 20,            // allow crash-loop retries...
      restart_delay: 5000,         // ...5s apart...
      exp_backoff_restart_delay: 100, // ...with exponential backoff on repeated failures

      // --- logging (so `pm2 logs` / files don't grow unbounded without rotation) ---
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      merge_logs: true,
      time: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 5000,
        OLLAMA_MODEL: process.env.OLLAMA_MODEL || "qwen2.5:7b",

        // --- Telegram (set via .env or real env vars before `pm2 start`) ---
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
        TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID
      }
    }
  ]
};
