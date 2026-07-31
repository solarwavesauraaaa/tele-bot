module.exports = {
  apps: [
    {
      name: "mcq-app",
      script: "server.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      min_uptime: "30s",
      max_restarts: 20,
      restart_delay: 5000,
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      merge_logs: true,
      time: true,
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 5000,
        OLLAMA_MODEL: process.env.OLLAMA_MODEL || "qwen2.5:7b",
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
        TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID
      }
    }
  ]
};
