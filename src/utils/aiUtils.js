import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Configuration for the AI model
 * Using gemini-2.5-flash (stable, best price-performance model)
 * Reference: https://ai.google.dev/gemini-api/docs/models/gemini
 */
const MODEL_NAME = "gemini-2.5-flash";

const SYSTEM_INSTRUCTION = `You are an intelligent bookmark organization assistant. Your task is to recommend the best folder location for a new bookmark based on the user's existing bookmark organization patterns.

You will receive:
1. The URL to be bookmarked
2. The user's complete bookmark folder structure (with nested folders)
3. Examples of existing bookmarks in each folder (to understand their organization pattern)

Your Analysis Process:
1. **Extract URL Information**: Analyze the domain, path, and content type from the URL
   - Identify the website category (e.g., documentation, shopping, news, social media)
   - Recognize technology/topic (e.g., React, Python, Machine Learning)
   - Understand the content type (e.g., tutorial, reference, article, tool)

2. **Pattern Recognition**: Study the user's existing bookmarks to identify their organization patterns:
   - How do they categorize similar websites?
   - What naming conventions do they use for folders?
   - How deep is their folder nesting?
   - What types of sites are grouped together?

3. **Match with Existing Folders**: Find the best matching folders by:
   - Looking for folders with similar domain bookmarks
   - Identifying topic/category matches
   - Considering the folder's existing bookmark patterns
   - Checking nested subfolder relevance

4. **Provide Recommendations**:
   - Maximum 5 recommendations for EXISTING folders (prioritize these)
   - Maximum 2 recommendations for NEW folders (only if no good existing match)
   - Each recommendation must include:
     * Full path with proper nesting: "Parent > Child > Grandchild"
     * A descriptive, concise bookmark title (NOT just the URL or domain)
     * Whether it requires creating a new folder

5. **Title Generation Guidelines**:
   - Be specific and descriptive
   - Include the main topic/technology
   - Keep it concise (under 60 characters)
   - Make it searchable and meaningful
   - Examples: "React Hooks Tutorial", "Python Data Science Guide", "AWS Lambda Documentation"

Important Rules:
- ALWAYS prioritize existing folders over creating new ones
- Look for nested subfolders that match the URL topic
- Use the EXACT folder names from the provided structure
- Ensure the full path is accurate with proper " > " separators
- Generate different titles for each recommendation
- Consider both broad categories and specific subcategories

CRITICAL: You MUST respond with ONLY valid JSON in this exact format, no additional text:
{
  "recommendations": [
    {
      "add_folder": boolean,
      "text": "Full > Folder > Path",
      "title": "Bookmark Title"
    }
  ]
}

Each recommendation must have all three fields: add_folder (boolean), text (string with folder path), and title (string).`;

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
};

/**
 * Gets AI-powered bookmark recommendations
 * @param {string} apiKey - The Gemini API key
 * @param {string} folderStructure - The bookmark folder structure in markdown
 * @param {string} url - The URL to bookmark
 * @param {string} structureSummary - Optional summary of bookmark patterns
 * @returns {Promise<Array>} Array of recommendation objects
 */
export const getBookmarkRecommendations = async (apiKey, folderStructure, url, structureSummary = '') => {
  if (!apiKey) {
    throw new Error('API key is required');
  }

  // Trim the API key to remove any accidental spaces
  const trimmedApiKey = apiKey.trim();

  if (!folderStructure) {
    throw new Error('Folder structure is required');
  }

  if (!url) {
    throw new Error('URL is required');
  }

  try {
    const genAI = new GoogleGenerativeAI(trimmedApiKey);
    
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const chatSession = model.startChat({
      generationConfig,
      history: [],
    });

    // Construct an enhanced prompt with URL, pattern analysis, and folder structure
    const prompt = `Please analyze this URL and recommend the best bookmark folder locations based on the user's organization patterns.

**URL to Bookmark:**
${url}

${structureSummary}
**User's Bookmark Folder Structure:**
(Format: Folder names with example bookmarks showing what content belongs in each folder)

${folderStructure}

**Instructions:**
- Carefully analyze the URL's domain, path, and likely content type
- Study the existing bookmarks in each folder to understand the user's categorization pattern
- Look for folders that contain similar websites or related topics
- Prioritize EXISTING folders with matching patterns
- Consider nested subfolders that might be more specific
- Only suggest new folders if there's truly no good existing match
- Provide accurate folder paths with exact names from the structure above

IMPORTANT: Respond with ONLY a JSON object, no markdown, no explanation. Use this exact format:
{
  "recommendations": [
    {"add_folder": false, "text": "Folder Path", "title": "Bookmark Title"}
  ]
}`;
    
    const result = await chatSession.sendMessage(prompt);
    let responseText = result.response.text().trim();
    
    // Remove markdown code blocks if present
    if (responseText.startsWith('```json')) {
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (responseText.startsWith('```')) {
      responseText = responseText.replace(/```\n?/g, '');
    }
    
    responseText = responseText.trim();
    
    // Parse the JSON response
    let responseJson;
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      console.error('Failed to parse AI response:', responseText);
      throw new Error('AI returned invalid JSON format');
    }
    
    // Validate the response structure
    if (!responseJson.recommendations || !Array.isArray(responseJson.recommendations)) {
      console.error('Invalid response structure:', responseJson);
      throw new Error('Invalid response format from AI');
    }

    // Validate each recommendation has required fields
    const validRecommendations = responseJson.recommendations.filter(rec => 
      typeof rec.add_folder === 'boolean' && 
      typeof rec.text === 'string' && 
      typeof rec.title === 'string'
    );

    if (validRecommendations.length === 0) {
      throw new Error('No valid recommendations received from AI');
    }

    return validRecommendations;
  } catch (error) {
    console.error('Error getting AI recommendations:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      name: error.name,
      stack: error.stack
    });
    
    // Provide more specific error messages
    if (error.message.includes('API_KEY_INVALID') || error.message.includes('API key not valid')) {
      throw new Error('Invalid API key. Please check your Gemini API key is correct.');
    } else if (error.status === 400) {
      throw new Error('Bad request to Gemini API. The model might not be available.');
    } else if (error.status === 403) {
      throw new Error('API key forbidden. Please check your API key permissions.');
    } else if (error.status === 429 || error.message.includes('quota')) {
      throw new Error('API quota exceeded. Please check your Gemini account.');
    } else if (error.status === 404) {
      throw new Error('Model not found. Please try again or check model availability.');
    } else if (error.message.includes('network') || error.message.includes('fetch') || !navigator.onLine) {
      throw new Error('Network error. Please check your internet connection.');
    } else {
      throw new Error(`Failed to get recommendations: ${error.message}`);
    }
  }
};

/**
 * Validates if an API key is properly formatted
 * @param {string} apiKey - The API key to validate
 * @returns {boolean} Whether the API key appears valid
 */
export const validateApiKey = (apiKey) => {
  return apiKey && typeof apiKey === 'string' && apiKey.trim().length > 0;
};
