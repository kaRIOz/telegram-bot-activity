const GROUP_CHAT_ID = "1002795712236";

export default {
  async fetch(request, env) {
    if (request.method === "POST") {
      const msg = await request.json();
      await handleMessage(msg, env);
      return new Response("OK");
    }
    return new Response("Hello from Telegram bot Worker");
  },

  async scheduled(event, env) {
    const ranking = await getRanking(env);

    if (ranking) {
      await sendMessage(
        env.BOT_TOKEN,
        GROUP_CHAT_ID,
        `📊 رتبه‌بندی امروز:\n${ranking}`
      );
    }

    // پاک کردن آمار روزانه (همه کلیدها به جز توکن و ثابت‌ها)
    const keys = await env.MESSAGE_COUNT.list();
    for (const key of keys.keys) {
      await env.MESSAGE_COUNT.delete(key.name);
    }
  },
};

async function handleMessage(msg, env) {
  if (
    !msg.message ||
    !msg.message.chat ||
    msg.message.chat.id.toString() !== GROUP_CHAT_ID
  )
    return;
  if (msg.message.chat.type !== "group") return;

  const userId = msg.message.from.id.toString();
  const userName =
    msg.message.from.first_name || msg.message.from.username || "ناشناس";

  const prev = await env.MESSAGE_COUNT.get(userId);
  let data = prev ? JSON.parse(prev) : { name: userName, count: 0 };
  data.name = userName; // آپدیت نام کاربر
  data.count += 1;

  await env.MESSAGE_COUNT.put(userId, JSON.stringify(data));
}

async function getRanking(env) {
  const keys = await env.MESSAGE_COUNT.list();
  const users = [];

  for (const key of keys.keys) {
    if (key.name === "BOT_TOKEN") continue; // اگه این کلید ذخیره شده بود ازش رد شو
    const data = JSON.parse(await env.MESSAGE_COUNT.get(key.name));
    users.push(data);
  }

  if (users.length === 0) return "هیچ پیامی ثبت نشده است.";

  users.sort((a, b) => b.count - a.count);
  return users
    .slice(0, 10)
    .map((u, i) => `${i + 1} - ${u.name} (${u.count})`)
    .join("\n");
}

async function sendMessage(token, chatId, text) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}
