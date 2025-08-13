export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Endpoint برای تست دستی
    if (url.pathname === "/test-cron") {
      await sendRanking(env);
      return new Response("Ranking sent manually!");
    }

    if (request.method === "POST") {
      const update = await request.json();
      console.log("Incoming update:", update);

      if (
        update.message &&
        update.message.chat &&
        (update.message.chat.type === "group" ||
          update.message.chat.type === "supergroup")
      ) {
        const userId = update.message.from.id.toString();
        const userName =
          update.message.from.first_name ||
          update.message.from.username ||
          "Unknown";

        // ابتدا از KV همه کاربران ثبت شده را بخوان
        let usersData = await env.MESSAGE_COUNT.get("USERS_LIST");
        let usersList = usersData ? JSON.parse(usersData) : {};

        // اگر کاربر جدید بود، آبجکت بساز
        if (!usersList[userId]) {
          usersList[userId] = { id: userId, name: userName, message_count: 0 };
        }

        // افزایش تعداد پیام
        usersList[userId].message_count++;

        // ذخیره در KV
        await env.MESSAGE_COUNT.put("USERS_LIST", JSON.stringify(usersList));

        console.log(
          `Updated count for ${userName}: ${usersList[userId].message_count}`
        );
      }

      return new Response("OK");
    }

    return new Response("Hello from Worker!");
  },

  async scheduled(controller, env) {
    console.log("Cron job triggered:", new Date().toISOString());
    await sendRanking(env);
  },
};

// تابع ارسال رتبه‌بندی
async function sendRanking(env) {
  const usersData = await env.MESSAGE_COUNT.get("USERS_LIST");
  const usersList = usersData ? JSON.parse(usersData) : {};

  // تبدیل به آرایه و رتبه‌بندی
  let users = Object.values(usersList);
  users.sort((a, b) => b.message_count - a.message_count);

  // ایجاد متن رتبه‌بندی حتی برای کسانی که 0 پیام فرستادن
  let ranking = users
    .map((u, i) => `${i + 1} - ${u.name} (${u.message_count})`)
    .join("\n");

  if (!ranking) ranking = "No messages recorded today.";

  const BOT_TOKEN = env.BOT_TOKEN;
  const GROUP_CHAT_ID = env.GROUP_CHAT_ID;

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: GROUP_CHAT_ID,
      text: `📊 Daily Ranking:\n${ranking}`,
    }),
  });

  // پاک کردن آمار روزانه (اما آبجکت اعضا نگه داشته می‌شه)
  let resetList = {};
  for (let userId in usersList) {
    resetList[userId] = { ...usersList[userId], message_count: 0 };
  }
  await env.MESSAGE_COUNT.put("USERS_LIST", JSON.stringify(resetList));

  console.log("Daily ranking sent and stats cleared.");
}
