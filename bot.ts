import { Bot, InlineKeyboard } from "grammy";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const miniAppUrl = process.env.MINI_APP_URL || "https://t.me/BadgerReborn_Bot/app";

if (!token || !supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables!");
  process.exit(1);
}

const bot = new Bot(token);
const supabase = createClient(supabaseUrl, supabaseKey);

// Welcome Message
bot.command("start", async (ctx) => {
  const referralId = ctx.match; // The 'ref_ID' part
  const userId = ctx.from?.id;
  const username = ctx.from?.username || "unknown";
  const firstName = ctx.from?.first_name || "Badger";

  try {
    console.log(`User ${userId} started the bot. Referral: ${referralId}`);

    // 1. Upsert Player
    const { error: playerError } = await supabase.from("players").upsert({
      telegram_id: userId,
      username,
      first_name: firstName,
      last_active: new Date().toISOString()
    }, { onConflict: "telegram_id" });

    if (playerError) {
      console.error("Supabase Player Error:", playerError);
    }

    // 2. Handle Referral
    if (referralId && referralId.startsWith("ref_")) {
      const referrerId = referralId.replace("ref_", "");
      if (referrerId !== userId.toString()) {
        const { error: refError } = await supabase.from("referrals").upsert({
          referrer_id: referrerId,
          referred_id: userId,
          created_at: new Date().toISOString()
        }, { onConflict: "referred_id" });
        
        if (refError) {
          console.error("Supabase Referral Error:", refError);
        } else {
          console.log(`Referral recorded: ${referrerId} invited ${userId}`);
        }
      }
    }
  } catch (err) {
    console.error("Internal Bot Error during /start:", err);
  }

  try {
    const keyboard = new InlineKeyboard()
      .webApp("Play Badger Clicker 🦡", miniAppUrl)
      .row()
      .url("Join Channel 📢", "https://t.me/BadgerChannel")
      .url("Follow X 🕇", "https://x.com/BadgerAI");

    // Using a reliable placeholder if the Supabase one isn't ready
    const photoUrl = "https://images.unsplash.com/photo-1581260466152-d2c0303e54f5?q=80&w=1000&auto=format&fit=crop"; 
    
    await ctx.replyWithPhoto(photoUrl, {
      caption: `<b>Welcome to the Sett, ${firstName}!</b> 🦡\n\nYou are now part of the most relentless clicker game on TON.\n\n💰 <b>Tap to Earn</b>\n🛠️ <b>Upgrade Your Claws</b>\n👥 <b>Grow Your Sett</b>\n\nStart harvesting $BADGER tokens now!`,
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (msgErr) {
    console.error("Failed to send welcome message:", msgErr);
    // Fallback to text only if photo fails
    await ctx.reply(`Welcome ${firstName}! Launch the app here: ${miniAppUrl}`);
  }
});

// Configure Bot Menu Button
bot.on("message", async (ctx) => {
  if (ctx.message.text === "/set_menu") {
    // This is a one-time setup command
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
      console.error(err);
      await ctx.reply("Failed to update menu button.");
    }
  }
});

// Error Handling
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  console.error(err.error);
});

console.log("Badger Bot is running...");
bot.start();
