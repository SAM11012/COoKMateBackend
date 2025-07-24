const express = require("express");
const { PrismaClient } = require("@prisma/client");
const bodyParser = require("body-parser");
const suggestionRouter = require('./generateRecipe')
const cors = require("cors");
const prisma = new PrismaClient();
const app = express();
const PORT = 3001;

app.use(bodyParser.json());
app.use(cors());

app.post("/submit-preferences", async (req, res) => {
  try {
    const {
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

    const preference = await prisma.userPreference.create({
      data: {
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
      },
    });

    const userId = preference.id;
    console.log("✅ the data is saved to db");
    res.send({message:'User Preferences Registered'}).status(200);
    // 2️⃣ Call AI-based recipe generation with new userI
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Something went wrong" });
  }
});

// generate recipes
app.use('/recipe',suggestionRouter)
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
