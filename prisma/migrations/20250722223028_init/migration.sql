-- CreateTable
CREATE TABLE "UserPreference" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "dietaryPreference" TEXT NOT NULL,
    "spicinessLevel" TEXT NOT NULL,
    "cuisinePreferences" TEXT[],
    "ingredientDislikes" TEXT[],
    "cookName" TEXT NOT NULL,
    "cookWhatsApp" TEXT NOT NULL,
    "preferredLanguage" TEXT NOT NULL,
    "userWhatsApp" TEXT NOT NULL,
    "mealsPerDay" INTEGER NOT NULL,
    "breakfast" BOOLEAN NOT NULL,
    "lunch" BOOLEAN NOT NULL,
    "dinner" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ingredients" TEXT[],
    "instructions" TEXT NOT NULL,
    "youtube" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "mealType" TEXT NOT NULL,
    "cuisine" TEXT NOT NULL,
    "dietaryRestriction" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRecipeSuggestion" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "recipeId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRecipeSuggestion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserRecipeSuggestion" ADD CONSTRAINT "UserRecipeSuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserPreference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRecipeSuggestion" ADD CONSTRAINT "UserRecipeSuggestion_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
