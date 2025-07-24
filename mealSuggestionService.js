const { GoogleGenerativeAI } = require('@google/generative-ai');

class MealSuggestionService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Try different model names in order of preference
    this.modelNames = [
      "gemini-1.5-flash",
      "gemini-1.5-pro", 
      "gemini-pro",
      "gemini-1.0-pro"
    ];
    this.model = null;
    this.initializeModel();
  }

  async initializeModel() {
    for (const modelName of this.modelNames) {
      try {
        this.model = this.genAI.getGenerativeModel({ model: modelName });
        console.log(`✅ Successfully initialized with model: ${modelName}`);
        break;
      } catch (error) {
        console.warn(`⚠️ Failed to initialize model ${modelName}:`, error.message);
        continue;
      }
    }
    
    if (!this.model) {
      throw new Error('Failed to initialize any Gemini model. Please check your API key and model availability.');
    }
  }

  /**
   * Generate meal suggestions based on user preferences
   * @param {Object} userData - User preferences and data
   * @param {Array} selectedMeals - Array of meal types ['breakfast', 'lunch', 'dinner']
   * @returns {Promise<Object>} - Meal suggestions with recipes, ingredients, videos, and images
   */
  async generateMealSuggestions(userData, selectedMeals) {
    try {
      // Ensure model is initialized
      if (!this.model) {
        await this.initializeModel();
      }
      const suggestions = {};
      
      for (const mealType of selectedMeals) {
        if (!userData[mealType]) {
          console.warn(`${mealType} not selected by user, skipping...`);
          continue;
        }
        
        const prompt = this.buildPrompt(userData, mealType);
        
        try {
          const result = await this.model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          
          // Parse the structured response with preferred language
          suggestions[mealType] = await this.parseGeminiResponse(text, mealType, userData.preferredLanguage);
        } catch (modelError) {
          console.error(`Error generating ${mealType} suggestions:`, modelError);
          // Try to reinitialize model and retry once
          if (modelError.message.includes('not found') || modelError.message.includes('404')) {
            console.log('Attempting to reinitialize model...');
            await this.initializeModel();
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            suggestions[mealType] = await this.parseGeminiResponse(text, mealType, userData.preferredLanguage);
          } else {
            throw modelError;
          }
        }
      }
      
      return {
        success: true,
        data: suggestions,
        userInfo: {
          name: userData.name,
          cookName: userData.cookName,
          preferredLanguage: userData.preferredLanguage
        }
      };
      
    } catch (error) {
      console.error('Error generating meal suggestions:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate meal suggestions',
        data: null
      };
    }
  }

  /**
   * Build a structured prompt for Gemini API
   * @param {Object} userData - User data
   * @param {string} mealType - Type of meal (breakfast/lunch/dinner)
   * @returns {string} - Formatted prompt
   */
  buildPrompt(userData, mealType) {
    const {
      age,
      gender,
      dietaryPreference,
      spicinessLevel,
      cuisinePreferences,
      ingredientDislikes,
      preferredLanguage
    } = userData;
    const prompt = `
You are a professional chef assistant. Generate exactly 3 ${mealType} suggestions based on these user preferences:
USER PROFILE:
- Age: ${age}
- Gender: ${gender}
- Dietary Preference: ${dietaryPreference}
- Spiciness Level: ${spicinessLevel}/10
- Cuisine Preferences: ${cuisinePreferences}
- Ingredient Dislikes: ${ingredientDislikes}
- Preferred Language: ${preferredLanguage}
REQUIREMENTS:
1. Provide exactly 3 different ${mealType} options
2. Each suggestion must be suitable for ${dietaryPreference} diet
3. Respect the spiciness level of ${spicinessLevel}/10
4. Avoid ingredients: ${ingredientDislikes}
5. Focus on ${cuisinePreferences} cuisine styles
6. Consider age-appropriate portions and nutrition
FORMAT YOUR RESPONSE EXACTLY AS JSON:
{
  "suggestions": [
    {
      "name": "Dish Name in ${preferredLanguage}",
      "description": "Brief description in ${preferredLanguage}",
      "recipe": {
        "prepTime": "X minutes",
        "cookTime": "X minutes",
        "servings": X,
        "instructions": [
          "Step 1 in ${preferredLanguage}",
          "Step 2 in ${preferredLanguage}",
          "..."
        ]
      },
      "ingredients": [
        {
          "item": "ingredient name",
          "quantity": "amount",
          "unit": "measurement unit"
        }
      ],
      "nutrition": {
        "calories": "approximate calories",
        "protein": "protein content",
        "carbs": "carb content"
      },
      "searchTerms": {
        "youtube": "authentic Dish Name recipe tutorial in ${preferredLanguage} for ${dietaryPreference}",
        "image": "specific search term for food image"
      }
    }
  ]
}
Make sure the response is valid JSON and includes all required fields.
`;
    return prompt;
  }

  /**
   * Parse Gemini response and enhance with media links
   * @param {string} responseText - Raw response from Gemini
   * @param {string} mealType - Meal type for context
   * @param {string} preferredLanguage - User's preferred language
   * @returns {Object} - Parsed suggestions with media links
   */
  async parseGeminiResponse(responseText, mealType, preferredLanguage = 'English') {
    try {
      // Extract JSON from response (Gemini sometimes adds extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }
      
      const parsedResponse = JSON.parse(jsonMatch[0]);
      
      // Enhance each suggestion with working media links
      const enhancedSuggestions = await Promise.all(
        parsedResponse.suggestions.map(async (suggestion) => {
          // Get the best YouTube video
          const youtubeVideo = await this.getBestYouTubeVideo(
            suggestion.searchTerms.youtube, 
            preferredLanguage
          );
          
          return {
            ...suggestion,
            media: {
              youtubeVideo: youtubeVideo,
              imageUrl: this.generateImageLink(suggestion.searchTerms.image),
              fallbackImage: this.generateFallbackImage(suggestion.name)
            },
            mealType: mealType
          };
        })
      );
      return {
        suggestions: enhancedSuggestions,
        totalCount: enhancedSuggestions.length,
        generatedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      return {
        suggestions: [],
        error: 'Failed to parse AI response',
        rawResponse: responseText
      };
    }
  }

  /**
   * Get best YouTube video based on likes, language, and recency
   * @param {string} searchTerm - Search term for YouTube
   * @param {string} preferredLanguage - User's preferred language
   * @returns {Promise<Object>} - Best YouTube video details
   */
  async getBestYouTubeVideo(searchTerm, preferredLanguage = 'English') {
    try {
      // Use YouTube Data API v3 to search for videos
      const youtubeApiKey = process.env.YOUTUBE_API_KEY;
      
      if (!youtubeApiKey) {
        console.warn('YouTube API key not found, falling back to search link');
        return {
          type: 'search_link',
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerm + ' recipe cooking')}`,
          title: `Search: ${searchTerm} recipe`
        };
      }
      // Get language codes for search
      const languageCodes = this.getLanguageCodes(preferredLanguage);
      
      let bestVideo = null;
      let bestScore = -Infinity; // Initialize with negative infinity to ensure any video is better

      // Search in preferred language first, then fallback to English
      for (const langCode of languageCodes) {
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?` +
          `part=snippet&maxResults=10&q=${encodeURIComponent(searchTerm + ' recipe cooking')}` +
          `&type=video&order=relevance&relevanceLanguage=${langCode}&key=${youtubeApiKey}`;
        
        try {
          const response = await fetch(searchUrl);
          const data = await response.json();
          
          if (data.items && data.items.length > 0) {
            // Get detailed video statistics
            for (const item of data.items) {
              const videoDetails = await this.getVideoDetails(item.id.videoId, youtubeApiKey);
              if (videoDetails) {
                const score = this.calculateVideoScore(videoDetails, preferredLanguage, langCode);
                if (score > bestScore) {
                  bestScore = score;
                  bestVideo = {
                    type: 'direct_video',
                    videoId: item.id.videoId,
                    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                    title: item.snippet.title,
                    channelTitle: item.snippet.channelTitle,
                    publishedAt: item.snippet.publishedAt,
                    thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
                    description: item.snippet.description,
                    language: langCode,
                    statistics: videoDetails.statistics,
                    score: score
                  };
                }
              }
            }
          }
        } catch (error) {
          console.warn(`Error searching YouTube in language ${langCode}:`, error.message);
          continue;
        }
        
        // If we found a good video in preferred language, break (optional, depends on strictness)
        // If you want to absolutely pick the best across all languages, remove this break.
        // Given the goal of "most liked", it's better to iterate all to find the global best.
        // if (bestVideo && langCode === languageCodes[0]) break; 
      }
      
      // If no video found via API, return search link
      if (!bestVideo) {
        return {
          type: 'search_link',
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerm + ' recipe cooking')}`,
          title: `Search: ${searchTerm} recipe`,
          reason: 'No suitable videos found via API'
        };
      }
      
      return bestVideo;
      
    } catch (error) {
      console.error('Error getting YouTube video:', error);
      return {
        type: 'search_link',
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerm + ' recipe cooking')}`,
        title: `Search: ${searchTerm} recipe`,
        error: error.message
      };
    }
  }

  /**
   * Get detailed video statistics
   * @param {string} videoId - YouTube video ID
   * @param {string} apiKey - YouTube API key
   * @returns {Promise<Object>} - Video details with statistics
   */
  async getVideoDetails(videoId, apiKey) {
    try {
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?` +
        `part=statistics,snippet,contentDetails&id=${videoId}&key=${apiKey}`; // Added contentDetails for duration
      
      const response = await fetch(detailsUrl);
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        return data.items[0];
      }
      
      return null;
    } catch (error) {
      console.warn(`Error getting video details for ${videoId}:`, error.message);
      return null;
    }
  }

  /**
   * Calculate video score based on various factors, prioritizing likes.
   * @param {Object} videoData - Video data from YouTube API
   * @param {string} preferredLanguage - User's preferred language
   * @param {string} videoLanguage - Video's language code
   * @returns {number} - Calculated score
   */
  calculateVideoScore(videoData, preferredLanguage, videoLanguage) {
    let score = 0;
    const stats = videoData.statistics;
    const snippet = videoData.snippet;

    // --- High priority to Like count ---
    const likeCount = parseInt(stats.likeCount || 0);
    const viewCount = parseInt(stats.viewCount || 0); // Keep viewCount for like-to-view ratio

    // Give a very high weight to likeCount, possibly using a logarithmic scale
    // to handle large numbers and still differentiate between them.
    if (likeCount > 0) {
      score += Math.log10(likeCount) * 10; // Adjust the multiplier (10) as needed
    }

    // --- Secondary factors with less weight ---

    // View count (e.g., 15% of total influence)
    if (viewCount > 0) {
      score += Math.log10(viewCount) * 0.5; // Smaller multiplier than likes
    }

    // Recency (e.g., 10% of total influence) - Newer videos still get a boost
    const publishDate = new Date(snippet.publishedAt);
    const daysSincePublish = (Date.now() - publishDate.getTime()) / (1000 * 60 * 60 * 24);
    // Score decays over time, max score for recent, min for very old
    const recencyScore = Math.max(0, 100 - (daysSincePublish / 365) * 20); // Decays slower than before
    score += recencyScore * 0.1;

    // Language preference (e.g., 5% of total influence) - Important but not as much as likes
    const primaryLanguageCode = this.getLanguageCodes(preferredLanguage)[0];
    if (videoLanguage === primaryLanguageCode) {
      score += 5;
    }

    // Video duration preference (e.g., 5% of total influence) - Keep a minor preference for typical recipe lengths
    const duration = this.parseDuration(videoData.contentDetails?.duration);
    if (duration >= 300 && duration <= 1200) { // 5-20 minutes
      score += 5;
    } else if (duration >= 180 && duration <= 1800) { // 3-30 minutes
      score += 2;
    }

    return score;
  }

  /**
   * Parse ISO 8601 duration to seconds
   * @param {string} duration - ISO 8601 duration string
   * @returns {number} - Duration in seconds
   */
  parseDuration(duration) {
    if (!duration) return 0;
    
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Get language codes for Youtube
   * @param {string} language - Language name
   * @returns {Array<string>} - Array of language codes to try
   */
  getLanguageCodes(language) {
    const languageMap = {
      'English': ['en', 'en-US'],
      'Hindi': ['hi', 'hi-IN'],
      'Spanish': ['es', 'es-ES'],
      'French': ['fr', 'fr-FR'],
      'German': ['de', 'de-DE'],
      'Italian': ['it', 'it-IT'],
      'Portuguese': ['pt', 'pt-BR'],
      'Japanese': ['ja', 'ja-JP'],
      'Korean': ['ko', 'ko-KR'],
      'Chinese': ['zh', 'zh-CN'],
      'Arabic': ['ar', 'ar-SA'],
      'Russian': ['ru', 'ru-RU'],
      'Tamil': ['ta', 'ta-IN'],
      'Telugu': ['te', 'te-IN'],
      'Bengali': ['bn', 'bn-IN'],
      'Marathi': ['mr', 'mr-IN'],
      'Gujarati': ['gu', 'gu-IN'],
      'Kannada': ['kn', 'kn-IN'],
      'Malayalam': ['ml', 'ml-IN'],
      'Punjabi': ['pa', 'pa-IN']
    };
    
    const codes = languageMap[language] || ['en', 'en-US'];
    // Always fallback to English if not found
    if (!codes.includes('en')) {
      codes.push('en');
    }
    
    return codes;
  }

  /**
   * Generate working image link using Unsplash
   * @param {string} searchTerm - Search term for image
   * @returns {string} - Image URL
   */
  generateImageLink(searchTerm) {
    const encodedTerm = encodeURIComponent(searchTerm.replace(/\s+/g, '-').toLowerCase());
    return `https://source.unsplash.com/800x600/?${encodedTerm},food`;
  }

  /**
   * Generate fallback image if primary fails
   * @param {string} dishName - Name of the dish
   * @returns {string} - Fallback image URL
   */
  generateFallbackImage(dishName) {
    const encodedName = encodeURIComponent(dishName.replace(/\s+/g, '-').toLowerCase());
    return `https://via.placeholder.com/800x600/FF6B6B/FFFFFF?text=${encodedName}`;
  }

  /**
   * Validate user data before processing
   * @param {Object} userData - User data to validate
   * @returns {Object} - Validation result
   */
  validateUserData(userData) {
    const requiredFields = [
      'name', 'age', 'gender', 'dietaryPreference', 
      'spicinessLevel', 'cuisinePreferences', 'preferredLanguage'
    ];
    
    const missingFields = requiredFields.filter(field => !userData[field]);
    
    if (missingFields.length > 0) {
      return {
        isValid: false,
        errors: `Missing required fields: ${missingFields.join(', ')}`
      };
    }
    
    if (userData.spicinessLevel < 0 || userData.spicinessLevel > 10) {
      return {
        isValid: false,
        errors: 'Spiciness level must be between 0 and 10'
      };
    }
    
    return { isValid: true, errors: null };
  }
}

module.exports = MealSuggestionService;