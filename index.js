require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const schedule = require("node-schedule");
// توکن ربات که از BotFather میگیری
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// آبجکت برای ذخیره شمارش پیام‌ها
let messageCount = {};

// گرفتن پیام‌ها و شمارش
bot.on("message", (msg) => {
  if (!msg.chat || msg.chat.type !== "group") return;

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userName = msg.from.first_name || msg.from.username || "ناشناس";

  // شمارش پیام کاربر
  if (!messageCount[userId]) {
    messageCount[userId] = { name: userName, count: 0 };
  }
  messageCount[userId].count++;
});

// تابع رتبه‌بندی
function getRanking() {
  let ranking = Object.values(messageCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((user, index) => `${index + 1} - ${user.name} (${user.count})`)
    .join("\n");

  if (!ranking) ranking = "هیچ پیامی ثبت نشده است.";

  return ranking;
}

// ارسال رتبه‌بندی با دستور /rank
bot.onText(/\/rank/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "🏆 رتبه‌بندی:\n" + getRanking());
});

// ارسال خودکار ساعت ۲۳:۰۰ هر شب
schedule.scheduleJob("0 23 * * *", () => {
  // فرض: فقط روی همین گروه اجرا میشه
  // اگر چند گروه داری باید chatId رو ذخیره کنی
  const rankingMessage = "📊 رتبه‌بندی امروز:\n" + getRanking();
  bot.sendMessage(GROUP_CHAT_ID, rankingMessage);

  // پاک کردن آمار روزانه
  messageCount = {};
});
