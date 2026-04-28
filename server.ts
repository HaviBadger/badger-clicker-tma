import { Bot, InlineKeyboard } from "grammy";
import { createClient } from "@supabase/supabase-js";
import express from "express";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const miniAppUrl = process.env.MINI_APP_URL || "https://t.me/BadgerReborn_Bot/app";
const PORT = process.env.PORT || 3000;

if (!token || !supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables!");
  process.exit(1);
}

// Initialize Bot
const bot = new Bot(token);
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Bot Logic ---

bot.command("start", async (ctx) => {
  const referralId = ctx.match;
  const userId = ctx.from?.id;
  const username = ctx.from?.username || "unknown";
  const firstName = ctx.from?.first_name || "Badger";

  try {
    console.log(`User ${userId} started the bot. Referral: ${referralId}`);
    await supabase.from("players").upsert({
      telegram_id: userId,
      username,
      first_name: firstName,
      last_active: new Date().toISOString()
    }, { onConflict: "telegram_id" });

    if (referralId && referralId.startsWith("ref_")) {
      const referrerId = referralId.replace("ref_", "");
      if (referrerId !== userId?.toString()) {
        await supabase.from("referrals").upsert({
          referrer_id: referrerId,
          referred_id: userId,
          created_at: new Date().toISOString()
        }, { onConflict: "referred_id" });
      }
    }
  } catch (err) {
    console.error("Supabase Error:", err);
  }

  const keyboard = new InlineKeyboard()
    .webApp("Play Badger Clicker 🦡", miniAppUrl)
    .row()
    .url("Join Channel 📢", "https://t.me/BadgerChannel")
    .url("Follow X 🕇", "https://x.com/BadgerAI");

  const photoUrl = "https://images.unsplash.com/photo-1581260466152-d2c0303e54f5?q=80&w=1000&auto=format&fit=crop"; 
  
  try {
    await ctx.replyWithPhoto(photoUrl, {
      caption: `<b>Welcome to the Sett, ${firstName}!</b> 🦡\n\nYou are now part of the most relentless clicker game on TON.\n\n💰 <b>Tap to Earn</b>\n🛠️ <b>Upgrade Your Claws</b>\n👥 <b>Grow Your Sett</b>\n\nStart harvesting $BADGER tokens now!`,
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (err) {
    await ctx.reply(`Welcome ${firstName}! Launch the app here: ${miniAppUrl}`);
  }
});

bot.command("set_menu", async (ctx) => {
  try {
    await bot.api.setChatMenuButton({
      menu_button: {
        type: "web_app",
        text: "Play Now 🦡",
        web_app: { url: miniAppUrl },
      },
    });
    await ctx.reply("Main menu button updated! 🚀");
  } catch (err) {
    await ctx.reply("Failed to update menu button.");
  }
});

bot.catch((err) => {
  console.error(`Error while handling update ${err.ctx.update.update_id}:`, err.error);
});

// Start Bot (Long Polling for simplicity, or use Webhooks for production efficiency)
bot.start();
console.log("GrammY Bot started.");

// --- Web Server Logic ---

const app = express();

// Serve static files from the 'dist' directory
const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));

// Fallback to index.html for SPA routing
app.use((req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
  console.log(`Serving static files from: ${distPath}`);
});
