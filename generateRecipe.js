
// routes/mealRoutes.js
const express = require('express');
const recipeRouter = express.Router();
const MealSuggestionService = require('./mealSuggestionService');

// Initialize meal service with API key from environment
const mealService = new MealSuggestionService(process.env.GEMINI_API_KEY);

/**
 * POST /api/meals/suggestions
 * Generate meal suggestions based on user preferences
 */
recipeRouter.post('/suggestions', async (req, res) => {
  try {
    const userData = {
        name: 'John Doe',
        age: 30,
        gender: 'Male',
        dietaryPreference: 'Vegetarian',
        spicinessLevel: 6,
        cuisinePreferences: 'North Indian,South Indian,',
        ingredientDislikes: 'mushrooms, bell peppers',
        cookName: 'Chef Maria',
        cookWhatsApp: '+1234567890',
        preferredLanguage: 'Kannada',
        userWhatsApp: '+0987654321',
        mealsPerDay: 3,
        breakfast: true,
        lunch: true,
        dinner: false
      };

    // Validate request body
    if (!userData) {
      return res.status(400).json({
        success: false,
        error: 'User data is required',
        code: 'MISSING_USER_DATA'
      });
    }

    // Validate user data
    const validation = mealService.validateUserData(userData);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: validation.errors,
        code: 'VALIDATION_ERROR'
      });
    }

    // Get selected meals from user data
    const selectedMeals = ['breakfast', 'lunch', 'dinner'].filter(meal => userData[meal]);

    if (selectedMeals.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one meal type must be selected',
        code: 'NO_MEALS_SELECTED'
      });
    }

    // Generate meal suggestions
    const suggestions = await mealService.generateMealSuggestions(userData, selectedMeals);

    if (suggestions.success) {
      res.status(200).json({
        ...suggestions,
        message: 'Meal suggestions generated successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: suggestions.error,
        code: 'GENERATION_ERROR'
      });
    }

  } catch (error) {
    console.error('Error in meal suggestions route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/meals/health
 * Health check endpoint
 */
recipeRouter.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Meal suggestion service is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

/**
 * POST /api/meals/validate-user
 * Validate user data without generating suggestions
 */
recipeRouter.post('/validate-user', (req, res) => {
  try {
    const { userData } = req.body;

    if (!userData) {
      return res.status(400).json({
        success: false,
        error: 'User data is required'
      });
    }

    const validation = mealService.validateUserData(userData);
    
    if (validation.isValid) {
      res.status(200).json({
        success: true,
        message: 'User data is valid',
        data: {
          validFields: Object.keys(userData),
          selectedMeals: ['breakfast', 'lunch', 'dinner'].filter(meal => userData[meal])
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: validation.errors,
        code: 'VALIDATION_ERROR'
      });
    }

  } catch (error) {
    console.error('Error in validate-user route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = recipeRouter;