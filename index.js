export default {
  async fetch(request, env, ctx) {
    if (request.method === "POST") {
      const update = await request.json();
      console.log("Incoming update:", update);

      if (
        update.message &&
        update.message.chat &&
        update.message.chat.type === "group"
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

        console.log(`Updated count for ${userName}: ${count}`);
      }

      return new Response("OK");
    }

    return new Response("Hello from Worker!");
  },

  async scheduled(controller, env, ctx) {
    console.log("Cron job triggered:", new Date().toISOString());

    // گرفتن همه آمارها
    const keys = await env.MESSAGE_COUNT.list();
    let users = [];

    for (let key of keys.keys) {
      const value = await env.MESSAGE_COUNT.get(key.name);
      if (value) {
        users.push(JSON.parse(value));
      }
    }

    // رتبه‌بندی
    let ranking = users
      .sort((a, b) => b.count - a.count)
      .map((u, i) => `${i + 1} - ${u.name} (${u.count})`)
      .join("\n");

    if (!ranking) ranking = "No messages recorded today.";

    // ارسال به تلگرام
    const BOT_TOKEN = env.BOT_TOKEN;
    const GROUP_CHAT_ID = env.GROUP_CHAT_ID; // -100xxxxxxxx

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: GROUP_CHAT_ID,
        text: `📊 Daily Ranking:\n${ranking}`,
      }),
    });

    // پاک کردن آمار روزانه
    for (let key of keys.keys) {
      await env.MESSAGE_COUNT.delete(key.name);
    }

    console.log("Daily ranking sent and stats cleared.");
  },
};
