// src/index.ts - UPDATED

import express, { Request, Response } from "express";
import "dotenv/config";
import { ExpressAuth } from "@auth/express";
import { authConfig } from "./src/auth"; // <-- CHANGE HERE: Import the config object
import { getSession } from "./src/middleware/auth";
import protectedRouter from "./src/routes/protected";
import authRouter from "./src/routes/auth";
import bodyParser from "body-parser";
import cors from "cors";
import TelegramBotModule from "node-telegram-bot-api";
import { sendVerifcationEmail } from "./src/services/telegramVerifcation";
import eventsRoute from "./src/routes/events";

const app = express();
const port = process.env.PORT || 3000;
app.use(bodyParser.json());
app.use(cors());

// Set up Auth.js as an Express middleware
// We pass the plain authConfig object to the ExpressAuth factory function.
app.use("/api/auth", ExpressAuth(authConfig)); // <-- CHANGE HERE: Pass the config object

// Mount local auth routes (register, etc.)
app.use("/api", authRouter);

// Mount protected routes
app.use("/api", getSession, protectedRouter);

app.use("/events", eventsRoute);

app.get("/", (req: Request, res: Response) => {
  res.send("This is the backend of CookMate App");
});
import { db } from "./src/db";
import { userPreferences } from "./src/db/schema";
import { sendToAllClients } from "./src/utils/sseManager";
import recipeRouter from "./generateRecipe";

app.post("/submit-preferences", async (req, res) => {
  try {
    const {
      userId,
      name,
      age,
      gender,
      dietaryPreference,
      spicinessLevel,
      cuisinePreferences,
      ingredientDislikes,
      cookName,
      cookWhatsApp,
      preferredLanguage,
      userWhatsApp,
      mealsPerDay,
      breakfast,
      lunch,
      dinner,
    } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const [preference] = await db
      .insert(userPreferences)
      .values({
        userId,
        name,
        age,
        gender,
        dietaryPreference,
        spicinessLevel,
        cuisinePreferences,
        ingredientDislikes,
        cookName,
        cookWhatsApp,
        preferredLanguage,
        userWhatsApp,
        mealsPerDay,
        breakfast,
        lunch,
        dinner,
      })
      .returning();

    console.log("✅ the data is saved to db, preference id:", preference.id);
    res.status(200).send({ message: "User Preferences Registered" });
    // 2️⃣ Call AI-based recipe generation with new userId
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Something went wrong" });
  }
});
app.post("/send-email", async (req: Request, res: Response) => {
  try {
    const email = req.body.email;
    const resp = await sendVerifcationEmail(email);

    if (resp.error) {
      console.error(resp.error, "the response");
      return res
        .status(400)
        .send({ message: "Failed to send email", error: resp.error });
    }

    console.log(resp, "the response");
    res
      .status(200)
      .send({ message: "Email sent successfully", info: resp.info });
  } catch (error) {
    console.log(error, "the error");
    res.status(500).json({ error });
  }
});

app.use("/generate", recipeRouter);
// Load environment variables from .env file

// Get the token from the environment variable
const token = process.env.TELEGRAM_BOT_TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const TelegramBot = (TelegramBotModule as any).default || TelegramBotModule;
const bot = new TelegramBot(token, { polling: true });

console.log("Bot has been started...");

// Listen for the /start command
bot.onText(/\/start/, (msg) => {
  console.log(msg, "the message");
  const chatId = msg.chat.id;
  const welcomeMessage =
    "Welcome to COOKMATE APP 🧑‍🍳\n\nClick the button below to generate personalized meal suggestions!";

  // Create inline keyboard with generate button
  const keyboard = {
    inline_keyboard: [
      [
        {
          text: "🍳 Generate Recipe Suggestions",
          callback_data: "generate_recipe",
        },
      ],
    ],
  };

  sendToAllClients({
    type: "TELEGRAM_VERIFIED",
    token,
    timestamp: new Date().toISOString(),
  });

  bot.sendMessage(chatId, welcomeMessage, {
    reply_markup: keyboard,
  });
});

// Listen for the /generate command
bot.onText(/\/generate/, async (msg) => {
  console.log(msg, "generate command received");
  const chatId = msg.chat.id;

  try {
    // Send initial response
    await bot.sendMessage(
      chatId,
      "🍳 Generating your personalized meal suggestions... Please wait!"
    );

    // Call the recipe suggestion endpoint
    const response = await fetch(
      `${process.env.BASE_URL || "http://localhost:3000"}/generate/suggestions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // You can customize this data or get it from user preferences
          name: "User",
          age: 25,
          gender: "Not specified",
          dietaryPreference: "Vegetarian",
          spicinessLevel: 5,
          cuisinePreferences: "Indian,Italian,Chinese",
          ingredientDislikes: "none",
          cookName: "Chef",
          cookWhatsApp: "+1234567890",
          preferredLanguage: "English",
          userWhatsApp: "+0987654321",
          mealsPerDay: 3,
          breakfast: true,
          lunch: true,
          dinner: true,
        }),
      }
    );

    const result = await response.json();

    if (result.success && result.data) {
      let message = "🍽️ *Your Personalized Meal Suggestions:*\n\n";

      // Format the suggestions for Telegram
      Object.keys(result.data).forEach((mealType) => {
        const mealData = result.data[mealType];
        if (mealData.suggestions && mealData.suggestions.length > 0) {
          message += `*${mealType.toUpperCase()}* 🍳\n`;
          mealData.suggestions.forEach((suggestion, index) => {
            message += `${index + 1}. *${suggestion.name}*\n`;
            message += `   📝 ${suggestion.description}\n`;
            message += `   ⏱️ Prep: ${suggestion.recipe.prepTime}, Cook: ${suggestion.recipe.cookTime}\n`;
            message += `   👥 Serves: ${suggestion.recipe.servings}\n`;
            if (suggestion.media && suggestion.media.youtubeVideo) {
              message += `   📺 [Watch Recipe](${suggestion.media.youtubeVideo.url})\n`;
            }
            message += "\n";
          });
        }
      });

      // Send the formatted message
      await bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      });
    } else {
      await bot.sendMessage(
        chatId,
        "❌ Sorry, I couldn't generate meal suggestions at the moment. Please try again later."
      );
    }
  } catch (error) {
    console.error("Error generating meal suggestions:", error);
    await bot.sendMessage(
      chatId,
      "❌ An error occurred while generating meal suggestions. Please try again later."
    );
  }
});

// Handle button clicks (callback queries)
bot.on("callback_query", async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const data = callbackQuery.data;

  // Answer the callback query to remove loading state
  await bot.answerCallbackQuery(callbackQuery.id);

  if (data === "generate_recipe") {
    try {
      // Update the original message to show loading
      await bot.editMessageText(
        "🍳 Generating your personalized meal suggestions... Please wait!",
        {
          chat_id: chatId,
          message_id: messageId,
        }
      );

      // Call the recipe suggestion endpoint
      const response = await fetch(
        `${process.env.BASE_URL || "http://localhost:3000"}/generate/suggestions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // You can customize this data or get it from user preferences
            name: "User",
            age: 25,
            gender: "Not specified",
            dietaryPreference: "Vegetarian",
            spicinessLevel: 5,
            cuisinePreferences: "Indian,Italian,Chinese",
            ingredientDislikes: "none",
            cookName: "Chef",
            cookWhatsApp: "+1234567890",
            preferredLanguage: "English",
            userWhatsApp: "+0987654321",
            mealsPerDay: 3,
            breakfast: true,
            lunch: true,
            dinner: true,
          }),
        }
      );

      const result = await response.json();

      if (result.success && result.data) {
        let message = "🍽️ *Your Personalized Meal Suggestions:*\n\n";

        // Format the suggestions for Telegram
        Object.keys(result.data).forEach((mealType) => {
          const mealData = result.data[mealType];
          if (mealData.suggestions && mealData.suggestions.length > 0) {
            message += `*${mealType.toUpperCase()}* 🍳\n`;
            mealData.suggestions.forEach((suggestion, index) => {
              message += `${index + 1}. *${suggestion.name}*\n`;
              message += `   📝 ${suggestion.description}\n`;
              message += `   ⏱️ Prep: ${suggestion.recipe.prepTime}, Cook: ${suggestion.recipe.cookTime}\n`;
              message += `   👥 Serves: ${suggestion.recipe.servings}\n`;
              if (suggestion.media && suggestion.media.youtubeVideo) {
                message += `   📺 [Watch Recipe](${suggestion.media.youtubeVideo.url})\n`;
              }
              message += "\n";
            });
          }
        });

        // Add a button to generate more suggestions
        const keyboard = {
          inline_keyboard: [
            [
              {
                text: "🔄 Generate More Suggestions",
                callback_data: "generate_recipe",
              },
            ],
          ],
        };

        // Update the message with results and new button
        await bot.editMessageText(message, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
          reply_markup: keyboard,
        });
      } else {
        await bot.editMessageText(
          "❌ Sorry, I couldn't generate meal suggestions at the moment. Please try again later.",
          {
            chat_id: chatId,
            message_id: messageId,
          }
        );
      }
    } catch (error) {
      console.error("Error generating meal suggestions:", error);
      await bot.editMessageText(
        "❌ An error occurred while generating meal suggestions. Please try again later.",
        {
          chat_id: chatId,
          message_id: messageId,
        }
      );
    }
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
