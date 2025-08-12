# 📊 Telegram Group Ranking Bot
A Telegram bot that tracks and ranks the most active members in a group every day.
Built with Node.js and deployed on Cloudflare Workers using KV storage for fast, global data persistence.

## ✨ Features
* Counts the number of messages sent by each member in a group.

* Sends an automatic ranking to the group at 23:00 IRST (UTC+3:30) every day.

* Supports the /rank command to view live rankings at any time.

* Uses Cloudflare KV for serverless, persistent storage.

* Fully free to run (Cloudflare Free Plan + Telegram Bot API).
...
## 🛠 Requirements
* A Telegram bot token from BotFather

* A Cloudflare account (Free plan is enough)

* Wrangler CLI installed for deployment
...
## 🚀 Deployment Guide
1. Clone the repository
* git clone https://github.com/<your-username>/<your-repo>.git
* cd <your-repo>
2. Create a Cloudflare KV Namespace
* Go to Cloudflare Dashboard → Workers & Pages → KV
* Create a namespace (e.g., MESSAGE_COUNT)
* Bind it to your Worker in wrangler.toml:
[[kv_namespaces]]
binding = "MESSAGE_COUNT"
id = "<your-namespace-id>"
3. Add environment variables
In your Worker settings (Cloudflare dashboard), add:

* BOT_TOKEN → Your Telegram bot token

4. Set up the Worker
Deploy the bot:

wrangler deploy
5. Configure the Cron Trigger
In the Worker settings, add:

* 30 19 * * *   # Runs every day at 19:30 UTC = 23:00 IRST
6. Set the Telegram Webhook
Replace <BOT_TOKEN> and <WORKER_URL> with your values:

curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=<WORKER_URL>"
📦 How It Works
Every incoming message triggers the Worker via Telegram’s webhook.

The bot stores { name, count } for each user in KV.

At 23:00 IRST daily, the Worker sends the top-ranked members to the group and resets the daily stats.

The /rank command shows the current ranking instantly.

📄 Example Ranking Output
🏆 Daily Ranking:
1 - Alice (52)
2 - Bob (46)
3 - Charlie (33)
🧩 Commands
Command	Description
/rank	Show current ranking

⚖️ License
This project is licensed under the MIT License.