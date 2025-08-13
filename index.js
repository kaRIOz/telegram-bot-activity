export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // دستی تست کردن Cron
    if (url.pathname === "/test-cron") {
      await sendRanking(env);
      return new Response("Ranking sent manually!");
    }

    if (request.method === "POST") {
      const update = await request.json();

      if (
        update.message &&
        update.message.chat &&
        (update.message.chat.type === "group" ||
          update.message.chat.type === "supergroup")
      ) {
        const userId = update.message.from.id;
        const userName =
          update.message.from.first_name ||
          update.message.from.username ||
          "Unknown";

        let data = await env.MESSAGE_COUNT.get(userId.toString());
        let count = 0;

        if (data) {
          const parsed = JSON.parse(data);
          count = parsed.count;
        }

        count++;

        await env.MESSAGE_COUNT.put(
          userId.toString(),
          JSON.stringify({
            name: userName,
            count,
          })
        );
      }

      return new Response("OK");
    }

    return new Response("Hello from Worker!");
  },

  async scheduled(controller, env, ctx) {
    await sendRanking(env);
  },
};

// تابع ارسال رتبه‌بندی
async function sendRanking(env) {
  console.log("Cron job triggered:", new Date().toISOString());

  // صبر برای Sync شدن KV
  await new Promise((res) => setTimeout(res, 10000));

  const keys = await env.MESSAGE_COUNT.list();
  let users = [];

  for (let key of keys.keys) {
    const value = await env.MESSAGE_COUNT.get(key.name);
    if (value) {
      users.push(JSON.parse(value));
    }
  }

  let ranking = users
    .sort((a, b) => b.count - a.count)
    .map((u, i) => `${i + 1} - ${u.name} (${u.count})`)
    .join("\n");

  if (!ranking) ranking = "No messages recorded today.";

  const BOT_TOKEN = env.BOT_TOKEN;
  const GROUP_CHAT_ID = env.GROUP_CHAT_ID;

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: GROUP_CHAT_ID,
      text: `📊 Ranking for last 24 hours:\n${ranking}`,
    }),
  });

  // پاک کردن آمار روزانه
  for (let key of keys.keys) {
    await env.MESSAGE_COUNT.delete(key.name);
  }

  console.log("Ranking sent and stats cleared.");
}
