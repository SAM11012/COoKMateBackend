# Cookmate Backend – Project Context & Summary

## Overview

Cookmate Backend is a Node.js/Express server that provides AI-powered personalized meal suggestions. It collects user preferences, stores them in a PostgreSQL database (via Prisma ORM), and generates meal plans using Google Gemini AI, enriched with YouTube recipe videos and Unsplash food images.

---

## Architecture

- **Express.js**: Main web server, handles API endpoints.
- **Prisma ORM**: Manages PostgreSQL database models and queries.
- **Google Gemini AI**: Generates meal suggestions based on user profile.
- **YouTube Data API**: Fetches relevant recipe videos for suggested meals.
- **Unsplash**: Provides food images for meal suggestions.

---

## Main Flows

### 1. User Preference Submission

- **Endpoint**: `POST /submit-preferences`
- **Process**:
  - Receives user profile and meal preferences (name, age, dietary needs, cuisine, dislikes, etc.).
  - Stores preferences in the `UserPreference` table via Prisma.
  - Responds with registration confirmation.

### 2. Meal Suggestion Generation

- **Endpoint**: `POST /recipe/suggestions`
- **Process**:
  - (Currently uses hardcoded user data; should use request body in production.)
  - Validates user data.
  - Calls `MealSuggestionService` to:
    - Build a structured prompt for Gemini AI.
    - Generate meal suggestions (breakfast/lunch/dinner) as JSON.
    - Parse and enhance suggestions with:
      - YouTube video links (using YouTube Data API, prioritizing likes, recency, and language).
      - Unsplash food images.
  - Returns structured meal suggestions with recipes, nutrition, and media.

### 3. User Data Validation

- **Endpoint**: `POST /recipe/validate-user`
- **Process**:
  - Validates user data structure and required fields.
  - Returns validation result.

### 4. Health Check

- **Endpoint**: `GET /recipe/health`
- **Process**:
  - Returns service status and version.

---

## Key Files

- **index.js**: Sets up Express server, connects to Prisma, defines `/submit-preferences` and `/recipe` routes.
- **generateRecipe.js**: Express router for meal suggestion endpoints (`/suggestions`, `/validate-user`, `/health`).
- **mealSuggestionService.js**: Core business logic for:
  - AI prompt building and response parsing.
  - YouTube and Unsplash media enrichment.
  - User data validation.
- **prisma/schema.prisma**: Database schema (UserPreference, Recipe, UserRecipeSuggestion).
- **.env**: Stores API keys and database connection string.

---

## Database Schema (Prisma)

- **UserPreference**
  - Stores user profile, dietary preferences, cuisine likes/dislikes, contact info, and meal selection.
  - Linked to suggested recipes.

- **Recipe**
  - Stores recipe details, ingredients, instructions, media links, meal type, and dietary restrictions.

- **UserRecipeSuggestion**
  - Links users to recipes with a timestamp (tracks which recipes were suggested to which users).

---

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string for Prisma.
- `GEMINI_API_KEY`: Google Gemini AI API key (for meal suggestion generation).
- `YOUTUBE_API_KEY`: YouTube Data API key (for recipe video enrichment).

---

## Integration & Extensibility

- Easily extendable to support more meal types, cuisines, or additional AI models.
- Can be integrated with a frontend or messaging platform (e.g., WhatsApp) for end-to-end meal planning.

---

## Notes

- The `/recipe/suggestions` endpoint currently uses hardcoded user data for testing. For production, update to use `req.body`.
- Ensure all API keys and database credentials are set in `.env` before deployment.
- Prisma migrations and schema updates should be managed via the `prisma` CLI.

---

## Authors & License

- Author: (Not specified)
- License: ISC
