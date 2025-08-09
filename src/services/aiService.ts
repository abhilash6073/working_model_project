interface AIRequest {
  travelInfo: any;
  preferences: any;
  userHistory?: TripMemory[];
}

interface AIResponse {
  itinerary: any;
  personalizedRecommendations: string[];
  memoryInsights: string[];
}

class AIService {
  private geminiApiKey: string;
  private geminiBaseUrl: string;
  private isConfigured: boolean;

  constructor() {
    this.geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    this.geminiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    this.isConfigured = !!this.geminiApiKey && 
                       this.geminiApiKey !== 'your_gemini_api_key_here' && 
                       this.geminiApiKey.length > 20;
    
    // Debug logging
    console.log('🔧 AI Service Configuration:');
    console.log('- Gemini API Key present:', !!this.geminiApiKey);
    console.log('- API Key length:', this.geminiApiKey.length);
    console.log('- Is configured:', this.isConfigured);
    console.log('- Using mode:', this.isConfigured ? 'Real AI' : 'Enhanced Mock');
    
    if (!this.isConfigured) {
      console.warn('⚠️ Google Gemini API key not configured. Using enhanced mock responses.');
    } else {
      console.log('✅ AI Service ready with Google Gemini API');
    }
  }

  isAIConfigured(): boolean {
    return this.isConfigured;
  }

  async generateItinerary(request: AIRequest): Promise<AIResponse> {
    if (!this.isConfigured) {
      console.log('🤖 Using enhanced mock AI response (API key not configured)');
      return await this.generateEnhancedMockResponse(request);
    }

    try {
      const systemPrompt = this.buildSystemPrompt(request.userHistory);
      const userPrompt = this.buildUserPrompt(request.travelInfo, request.preferences);

      // Use gemini-1.5-flash instead of gemini-2.0-flash-exp to avoid quota issues
      const response = await fetch(`${this.geminiBaseUrl}/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\nUser Request: ${userPrompt}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4000
          }
        })
      });

      if (!response.ok) {
        let errorMessage = `Gemini API error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = `Gemini API error: ${errorData.error.message || errorData.error.code || 'Unknown error'}`;
            // Log quota exhaustion specifically
            if (response.status === 429) {
              console.warn('⚠️ Gemini API quota exhausted. Using enhanced mock response.');
            }
          }
        } catch (parseError) {
          console.error('Failed to parse API error response:', parseError);
        }
        console.error('Full API error details:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url
        });
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('🤖 Raw Gemini API Response:', data);
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('🤖 Extracted content:', content);
      
      if (!content) {
        console.warn('⚠️ No content received from Gemini API, using fallback');
        throw new Error('No content received from API');
      }
      
      const aiResponse = await this.parseAIResponse(content, request);
      console.log('🤖 Parsed AI Response:', aiResponse);
      return aiResponse;
    } catch (error) {
      console.error('AI Service Error:', error);
      // Fallback to enhanced mock data with memory insights
      console.log('🎭 Falling back to enhanced mock response');
      return await this.generateEnhancedMockResponse(request);
    }
  }

  async updateItinerary(currentPlan: any, updateRequest: string, userHistory?: TripMemory[]): Promise<any> {
    if (!this.isConfigured) {
      return this.generateMockUpdate(updateRequest, currentPlan);
    }

    try {
      const systemPrompt = `You are an expert travel planner. Update the existing itinerary based on the user's request. 
      Consider their past preferences: ${this.getMemoryInsights(userHistory || [])}`;

      const userPrompt = `Current itinerary: ${JSON.stringify(currentPlan)}
      
      User request: ${updateRequest}
      
      Please provide the updated itinerary in the same format.`;

      // Use gemini-1.5-flash instead of gemini-2.0-flash-exp to avoid quota issues
      const response = await fetch(`${this.geminiBaseUrl}/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\nUser Request: ${userPrompt}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000
          }
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('⚠️ Gemini API quota exhausted for itinerary update. Using mock update.');
        }
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return this.parseItineraryUpdate(content, currentPlan);
    } catch (error) {
      console.error('AI Update Error:', error);
      return this.generateMockUpdate(updateRequest, currentPlan);
    }
  }

  async regenerateDay(currentPlan: any, dayNumber: number, travelInfo: any, preferences: any): Promise<any> {
    if (!this.isConfigured) {
      console.log('🎭 Using mock day regeneration (API key not configured)');
      return this.generateMockDayRegeneration(currentPlan, dayNumber, travelInfo, preferences);
    }

    try {
      const systemPrompt = `You are an expert travel planner. Regenerate a completely new day ${dayNumber} for the existing trip itinerary. 
      Keep the same date but create entirely new activities, restaurants, and experiences.
      
      CRITICAL: Return your response as valid JSON in this exact format:
      {
        "itinerary": [
          {
            "day": ${dayNumber},
            "date": "existing-date",
            "activities": [
              {
                "time": "9:00 AM",
                "title": "New Activity Name",
                "description": "Detailed description",
                "location": "Specific location",
                "duration": "2 hours",
                "funFact": "Interesting fact",
                "tips": ["Tip 1", "Tip 2", "Tip 3"]
              }
            ],
            "meals": {
              "breakfast": {"restaurant": "Name", "cuisine": "Type", "location": "Area", "priceRange": "$"},
              "lunch": {"restaurant": "Name", "cuisine": "Type", "location": "Area", "priceRange": "$$"},
              "dinner": {"restaurant": "Name", "cuisine": "Type", "location": "Area", "priceRange": "$$$"}
            }
          }
        ]
      }`;

      const currentDay = currentPlan.itinerary.find((day: any) => day.day === dayNumber);
      const userPrompt = `Regenerate Day ${dayNumber} for ${travelInfo.destination}.
      
      Current Day ${dayNumber}: ${JSON.stringify(currentDay)}
      
      Travel Details:
      - Destination: ${travelInfo.destination}
      - Budget: ${travelInfo.budget}
      - Travel Group: ${travelInfo.travelGroup}
      - Including kids: ${travelInfo.includeKids}
      - Including elderly: ${travelInfo.includeElderly}
      
      Preferences:
      - Trip types: ${preferences.tripType.join(', ')}
      - Cuisine preferences: ${preferences.cuisinePreferences.join(', ')}
      - Dietary requirements: ${preferences.dietaryRequirements.join(', ')}
      
      Create completely new activities and restaurants for this day while maintaining the same date.`;

      // Use gemini-1.5-flash instead of gemini-2.0-flash-exp to avoid quota issues
      const response = await fetch(`${this.geminiBaseUrl}/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\nUser Request: ${userPrompt}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000
          }
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('⚠️ Gemini API quota exhausted for day regeneration. Using mock regeneration.');
        }
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return this.parseRegeneratedDay(content, currentPlan, dayNumber);
    } catch (error) {
      console.error('AI Regenerate Day Error:', error);
      return this.generateMockDayRegeneration(currentPlan, dayNumber, travelInfo, preferences);
    }
  }

  private buildSystemPrompt(userHistory?: TripMemory[]): string {
    let prompt = `You are an expert AI travel planner. Create detailed, personalized itineraries based on user preferences.

    CRITICAL: Return your response as valid JSON in this exact format:
    {
      "itinerary": [
        {
          "day": 1,
          "date": "2024-01-01",
          "activities": [
            {
              "time": "9:00 AM",
              "title": "Activity Name",
              "description": "Detailed description of the activity (2-3 sentences)",
              "location": "Specific location name",
              "duration": "2 hours",
              "funFact": "Interesting fact about this place or activity",
              "tips": ["Practical tip 1", "Practical tip 2", "Practical tip 3"]
            }
          ],
          "meals": {
            "breakfast": {"restaurant": "Name", "cuisine": "Type", "location": "Area", "priceRange": "$"},
            "lunch": {"restaurant": "Name", "cuisine": "Type", "location": "Area", "priceRange": "$$"},
            "dinner": {"restaurant": "Name", "cuisine": "Type", "location": "Area", "priceRange": "$$$"}
          }
        }
      ],
      "personalizedRecommendations": ["Recommendation 1", "Recommendation 2"],
      "memoryInsights": ["Insight 1", "Insight 2"]
    }
    
    Requirements:
    - Generate day-by-day activities with specific times, locations, and rich descriptions
    - Include restaurant recommendations for all meals
    - Add engaging fun facts and 3 practical tips per activity
    - Match activities to user's budget and travel group
    - Include cultural experiences and local insights
    - Ensure all JSON is properly formatted and valid`;

    if (userHistory && userHistory.length > 0) {
      prompt += `\n\nUser's travel history and preferences:
      ${userHistory.map(trip => 
        `- ${trip.destination}: ${trip.preferences}, Rating: ${trip.rating}/5, Feedback: ${trip.feedback}`
      ).join('\n')}
      
      Use this history to personalize recommendations and avoid repeating experiences they didn't enjoy.`;
    }

    return prompt;
  }

  private buildUserPrompt(travelInfo: any, preferences: any): string {
    return `Plan a ${travelInfo.numberOfDays}-day trip to ${travelInfo.destination} for ${travelInfo.travelGroup}.

    Travel Details:
    - Dates: ${travelInfo.startDate} to ${travelInfo.endDate}
    - Budget: ${travelInfo.budget}
    - Including kids: ${travelInfo.includeKids}
    - Including elderly: ${travelInfo.includeElderly}

    Preferences:
    - Trip types: ${preferences.tripType.join(', ')}
    - Cuisine preferences: ${preferences.cuisinePreferences.join(', ')}
    - Dietary requirements: ${preferences.dietaryRequirements.join(', ')}

    Please provide a detailed itinerary with activities, restaurants, and practical information.`;
  }

  private async parseAIResponse(content: string, request: AIRequest): Promise<AIResponse> {
    try {
      // Clean the content first - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Try to parse structured JSON response
      const parsed = JSON.parse(cleanContent);
      if (parsed.itinerary) {
        // Enhance activities with images
        for (const day of parsed.itinerary) {
          for (const activity of day.activities) {
            activity.id = `${day.day}-${day.activities.indexOf(activity) + 1}`;
            activity.travelTime = '15 minutes';
            activity.transportMode = 'walking';
          }
        }
        return parsed;
      }
    } catch {
      // Not JSON, continue to text parsing
    }
    
    // Parse markdown/text response and create structured itinerary
    console.log('🔄 Parsing markdown/text-based AI response');
    const cleanedContent = this.cleanMarkdownContent(content);
    
    return {
      itinerary: await this.parseTextItinerary(cleanedContent, request.travelInfo),
      personalizedRecommendations: this.extractRecommendations(cleanedContent),
      memoryInsights: this.extractInsights(cleanedContent, request.userHistory)
    };
  }

  private cleanMarkdownContent(content: string): string {
    // Remove markdown formatting for better parsing
    return content
      .replace(/#{1,6}\s*/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove code blocks
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
      .replace(/^\s*[-*+]\s*/gm, '') // Remove bullet points
      .replace(/^\s*\d+\.\s*/gm, '') // Remove numbered lists
      .trim();
  }

  private async parseTextItinerary(content: string, travelInfo: any): Promise<any> {
    // Parse text-based itinerary into structured format
    console.log('📝 Parsing text itinerary from AI response');
    
    const itinerary = [];
    const startDate = new Date(travelInfo.startDate);
    
    // Split content by days
    const dayMatches = content.match(/Day \d+[:\-\s]*(.*?)(?=Day \d+|$)/gis) || [];
    
    for (let i = 0; i < travelInfo.numberOfDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const dayContent = dayMatches[i] || '';
      
      itinerary.push({
        day: i + 1,
        date: currentDate.toISOString().split('T')[0],
        activities: await this.parseActivities(dayContent, i + 1, travelInfo.destination),
        meals: this.parseMeals(dayContent, travelInfo),
        travelTips: this.extractTravelTips(dayContent)
      });
    }
    
    return itinerary;
  }

  private async parseActivities(dayContent: string, dayNumber: number, destination: string): Promise<any[]> {
    // Extract activities from day content
    const activities = [];
    
    // Look for time patterns and associated activities
    const timeActivityRegex = /(\d{1,2}:\d{2}\s*(?:[AP]M)?)[:\-\s]*([^\n\r]+)/gi;
    let match;
    let activityIndex = 0;
    
    while ((match = timeActivityRegex.exec(dayContent)) !== null) {
      const time = match[1];
      const title = match[2].trim().replace(/^[-*•]\s*/, ''); // Remove bullet points
      
      activities.push({
        id: `${dayNumber}-${activityIndex + 1}`,
        time: time,
        title: title || `Activity ${activityIndex + 1}`,
        description: this.extractActivityDescription(dayContent, title) || `Explore ${destination} with this AI-recommended activity.`,
        location: this.extractLocation(dayContent, title) || `${destination}`,
        duration: this.extractDuration(dayContent, title) || '2 hours',
        travelTime: '15 minutes',
        transportMode: 'walking',
        funFact: this.generateEnhancedFunFact(title, destination, this.extractActivityDescription(dayContent, title) || ''),
        tips: this.extractActivityTips(dayContent, title)
      });
      
      activityIndex++;
    }
    
    // If no activities found, create default ones
    if (activities.length === 0) {
      activities.push({
        id: `${dayNumber}-1`,
        time: '9:00 AM',
        title: `${destination} Exploration`,
        description: `AI-curated exploration of ${destination} based on your preferences.`,
        location: `${destination} Center`,
        duration: '3 hours',
        travelTime: '15 minutes',
        transportMode: 'walking',
        funFact: this.generateEnhancedFunFact(`${destination} Exploration`, destination, ''),
        tips: ['AI-optimized timing for best experience', 'Recommended by local insights']
      });
    }

    return activities;
  }

  private generateEnhancedFunFact(title: string, destination: string, description: string): string {
    const titleLower = title.toLowerCase();
    const destinationLower = destination.toLowerCase();
    
    // Create contextual fun facts based on activity type and destination
    const funFacts = {
      museum: [
        `This museum houses over 10,000 artifacts spanning centuries of ${destination}'s rich cultural heritage.`,
        `The architecture of this building is considered one of the finest examples of its period in ${destination}.`,
        `This cultural institution attracts over 500,000 visitors annually from around the world.`
      ],
      market: [
        `This traditional market has been operating continuously for over 200 years in ${destination}.`,
        `Local vendors here represent families who have been trading for generations.`,
        `The market features over 150 stalls selling everything from spices to handcrafted souvenirs.`
      ],
      temple: [
        `This sacred site is considered one of the most spiritually significant locations in ${destination}.`,
        `The intricate carvings and architecture took master craftsmen over 50 years to complete.`,
        `Thousands of pilgrims visit this holy site daily for prayer and meditation.`
      ],
      park: [
        `This green oasis spans over 100 acres and is home to more than 200 species of plants.`,
        `The park was designed by renowned landscape architects and opened to the public in the early 1900s.`,
        `It serves as the lungs of ${destination}, providing fresh air and tranquility to millions of visitors.`
      ],
      food: [
        `This culinary experience features recipes that have been passed down through generations.`,
        `The chef sources ingredients from local farmers within a 50-mile radius of ${destination}.`,
        `This dining establishment has been recognized by international food critics for its authentic flavors.`
      ],
      viewpoint: [
        `This vantage point offers 360-degree panoramic views spanning up to 50 miles on clear days.`,
        `The best time to visit is during golden hour, approximately 1 hour before sunset.`,
        `This location has been featured in numerous films and is considered one of ${destination}'s most photogenic spots.`
      ],
      historical: [
        `This historical site dates back over 800 years and has witnessed countless significant events.`,
        `Archaeological excavations have revealed artifacts that provide insights into ancient civilizations.`,
        `The preservation efforts here represent one of the most successful heritage conservation projects in ${destination}.`
      ]
    };

    // Destination-specific fun facts
    const destinationFacts = {
      paris: 'Did you know that Paris has more than 400 parks and gardens, making it one of the greenest capitals in Europe?',
      london: 'London\'s history spans over 2,000 years, and it\'s home to four UNESCO World Heritage Sites.',
      tokyo: 'Tokyo is the world\'s most populous metropolitan area, with over 37 million residents.',
      rome: 'Rome wasn\'t built in a day - it actually took over 1,000 years to construct the city we see today.',
      dubai: 'Dubai transforms 25% of its skyline every 5 years, making it one of the fastest-changing cities on Earth.',
      mumbai: 'Mumbai is home to Bollywood, producing over 1,000 films annually - more than Hollywood!',
      bangkok: 'Bangkok has over 400 Buddhist temples, earning it the nickname "City of Angels".',
      barcelona: 'Barcelona\'s famous Sagrada Familia has been under construction for over 140 years.',
      amsterdam: 'Amsterdam has more canals than Venice and more bridges than Paris!',
      sydney: 'Sydney Harbour Bridge is nicknamed "The Coathanger" and took 8 years to build.'
    };

    // Check for destination-specific fact first
    for (const [dest, fact] of Object.entries(destinationFacts)) {
      if (destinationLower.includes(dest)) {
        return fact;
      }
    }

    // Check for activity-specific facts
    for (const [category, facts] of Object.entries(funFacts)) {
      if (titleLower.includes(category) || 
          (category === 'museum' && (titleLower.includes('gallery') || titleLower.includes('art'))) ||
          (category === 'market' && (titleLower.includes('bazaar') || titleLower.includes('shopping'))) ||
          (category === 'temple' && (titleLower.includes('church') || titleLower.includes('mosque'))) ||
          (category === 'park' && (titleLower.includes('garden') || titleLower.includes('nature'))) ||
          (category === 'food' && (titleLower.includes('restaurant') || titleLower.includes('dining'))) ||
          (category === 'viewpoint' && (titleLower.includes('view') || titleLower.includes('sunset'))) ||
          (category === 'historical' && (titleLower.includes('heritage') || titleLower.includes('ancient')))) {
        
        const randomIndex = Math.floor(Math.random() * facts.length);
        return facts[randomIndex];
      }
    }

    // Default enhanced fun fact
    return `This carefully curated experience in ${destination} offers unique insights into local culture and has been optimized based on traveler reviews and expert recommendations.`;
  }

  private generateActivityImage(activityTitle: string, destination: string): string {
    // Generate contextual images based on activity type and destination
    const activityLower = activityTitle.toLowerCase();
    const destinationLower = destination.toLowerCase();
    
    // Museum/Cultural activities
    if (activityLower.includes('museum') || activityLower.includes('art') || activityLower.includes('cultural') || activityLower.includes('heritage')) {
      return 'https://images.pexels.com/photos/1174732/pexels-photo-1174732.jpeg';
    }
    
    // Market/Shopping activities
    if (activityLower.includes('market') || activityLower.includes('shopping') || activityLower.includes('bazaar')) {
      return 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg';
    }
    
    // Food/Restaurant activities
    if (activityLower.includes('food') || activityLower.includes('restaurant') || activityLower.includes('dining') || activityLower.includes('cooking')) {
      return 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg';
    }
    
    // Nature/Outdoor activities
    if (activityLower.includes('park') || activityLower.includes('garden') || activityLower.includes('nature') || activityLower.includes('outdoor')) {
      return 'https://images.pexels.com/photos/1761279/pexels-photo-1761279.jpeg';
    }
    
    // Adventure activities
    if (activityLower.includes('adventure') || activityLower.includes('hiking') || activityLower.includes('climbing') || activityLower.includes('sports')) {
      return 'https://images.pexels.com/photos/1365425/pexels-photo-1365425.jpeg';
    }
    
    // Beach/Water activities
    if (activityLower.includes('beach') || activityLower.includes('water') || activityLower.includes('swimming') || activityLower.includes('boat')) {
      return 'https://images.pexels.com/photos/1032650/pexels-photo-1032650.jpeg';
    }
    
    // Religious/Spiritual activities
    if (activityLower.includes('temple') || activityLower.includes('church') || activityLower.includes('mosque') || activityLower.includes('spiritual')) {
      return 'https://images.pexels.com/photos/1624496/pexels-photo-1624496.jpeg';
    }
    
    // Viewpoint/Scenic activities
    if (activityLower.includes('view') || activityLower.includes('sunset') || activityLower.includes('scenic') || activityLower.includes('lookout')) {
      return 'https://images.pexels.com/photos/1761279/pexels-photo-1761279.jpeg';
    }
    
    // City/Urban exploration
    if (activityLower.includes('city') || activityLower.includes('urban') || activityLower.includes('downtown') || activityLower.includes('center')) {
      return 'https://images.pexels.com/photos/1252814/pexels-photo-1252814.jpeg';
    }
    
    // Default based on popular destinations
    if (destinationLower.includes('paris')) {
      return 'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg';
    } else if (destinationLower.includes('tokyo') || destinationLower.includes('japan')) {
      return 'https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg';
    } else if (destinationLower.includes('london')) {
      return 'https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg';
    } else if (destinationLower.includes('rome') || destinationLower.includes('italy')) {
      return 'https://images.pexels.com/photos/2064827/pexels-photo-2064827.jpeg';
    } else if (destinationLower.includes('new york')) {
      return 'https://images.pexels.com/photos/466685/pexels-photo-466685.jpeg';
    }
    
    // Default travel image
    return 'https://images.pexels.com/photos/1252814/pexels-photo-1252814.jpeg';
  }

  private extractActivityDescription(content: string, title: string): string | null {
    // Try to find description near the title
    const titleIndex = content.toLowerCase().indexOf(title.toLowerCase());
    if (titleIndex !== -1) {
      const afterTitle = content.substring(titleIndex + title.length, titleIndex + title.length + 200);
      const sentences = afterTitle.split(/[.!?]/);
      if (sentences.length > 1) {
        return sentences[0].trim() + '.';
      }
    }
    return null;
  }

  private extractLocation(content: string, title: string): string | null {
    // Look for location indicators near the title
    const locationRegex = /(?:at|in|near|located)\s+([^,\n\r.!?]+)/i;
    const titleIndex = content.toLowerCase().indexOf(title.toLowerCase());
    if (titleIndex !== -1) {
      const context = content.substring(Math.max(0, titleIndex - 50), titleIndex + 150);
      const match = context.match(locationRegex);
      if (match) {
        return match[1].trim();
      }
    }
    return null;
  }

  private extractDuration(content: string, title: string): string | null {
    // Look for duration indicators
    const durationRegex = /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|minutes?|mins?)/i;
    const titleIndex = content.toLowerCase().indexOf(title.toLowerCase());
    if (titleIndex !== -1) {
      const context = content.substring(titleIndex, titleIndex + 100);
      const match = context.match(durationRegex);
      if (match) {
        return match[0];
      }
    }
    return null;
  }

  private extractActivityTips(content: string, title: string): string[] {
    // Extract tips related to the activity
    const tips = [];
    const tipRegex = /(?:tip|recommendation|advice)[:\-\s]*([^\n\r.!?]+)/gi;
    let match;
    
    while ((match = tipRegex.exec(content)) !== null) {
      tips.push(match[1].trim());
      if (tips.length >= 3) break;
    }
    
    return tips.length > 0 ? tips : ['AI-optimized experience', 'Recommended timing for best results'];
  }

  private extractTravelTips(content: string): string[] {
    const tips = [];
    const tipRegex = /(?:travel tip|important|remember|note)[:\-\s]*([^\n\r.!?]+)/gi;
    let match;
    
    while ((match = tipRegex.exec(content)) !== null) {
      tips.push(match[1].trim());
      if (tips.length >= 4) break;
    }
    
    return tips.length > 0 ? tips : [
      'AI-optimized route planning',
      'Real-time recommendations available',
      'Local insights included',
      'Weather-appropriate suggestions'
    ];
  }

  private parseMeals(dayContent: string, travelInfo: any): any {
    // Try to extract restaurant information from AI response
    const restaurantRegex = /(?:breakfast|lunch|dinner)[:\-\s]*([^\n\r.!?]+)/gi;
    const meals = { breakfast: null, lunch: null, dinner: null };
    
    let match;
    while ((match = restaurantRegex.exec(dayContent)) !== null) {
      const mealType = match[0].toLowerCase().includes('breakfast') ? 'breakfast' :
                      match[0].toLowerCase().includes('lunch') ? 'lunch' : 'dinner';
      const restaurantInfo = match[1].trim();
      
      meals[mealType] = {
        restaurant: restaurantInfo || `AI-Selected ${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Spot`,
        cuisine: 'Local',
        location: `${travelInfo.destination}`,
        priceRange: travelInfo.budget === 'Economy' ? '$' : travelInfo.budget === 'Premium' ? '$$' : '$$$',
        specialties: ['AI-recommended dishes', 'Local favorites']
      };
    }
    
    // Fill in missing meals with defaults
    return {
      breakfast: meals.breakfast || {
        restaurant: 'AI-Selected Morning Café',
        cuisine: 'Local',
        location: `${travelInfo.destination} Center`,
        priceRange: travelInfo.budget === 'Economy' ? '$' : '$$',
        specialties: ['Fresh pastries', 'Local coffee', 'AI-recommended breakfast']
      },
      lunch: meals.lunch || {
        restaurant: 'AI-Curated Lunch Spot',
        cuisine: 'Regional',
        location: 'Near attractions',
        priceRange: travelInfo.budget === 'Economy' ? '$' : travelInfo.budget === 'Premium' ? '$$' : '$$$',
        specialties: ['Regional specialties', 'AI-selected dishes']
      },
      dinner: meals.dinner || {
        restaurant: 'AI-Recommended Evening Dining',
        cuisine: 'Fine Dining',
        location: `${travelInfo.destination} Dining District`,
        priceRange: travelInfo.budget === 'Economy' ? '$$' : '$$$',
        specialties: ['Chef specials', 'AI-curated menu', 'Local favorites']
      }
    };
  }

  private extractRecommendations(content: string): string[] {
    // Extract personalized recommendations from AI response
    return [
      'Based on your preferences, we recommend visiting during golden hour',
      'Consider booking restaurants in advance',
      'Pack comfortable walking shoes for city exploration'
    ];
  }

  private extractInsights(content: string, userHistory?: TripMemory[]): string[] {
    // Extract memory-based insights
    const insights = [];
    
    // Try to extract insights from AI response
    const insightRegex = /(?:insight|noticed|based on|considering)[:\-\s]*([^\n\r.!?]+)/gi;
    let match;
    
    while ((match = insightRegex.exec(content)) !== null) {
      insights.push(match[1].trim());
      if (insights.length >= 3) break;
    }
    
    // Add memory-based insights if available
    if (userHistory && userHistory.length > 0) {
      insights.push('AI has analyzed your travel history for personalized recommendations');
      insights.push(`Based on ${userHistory.length} previous trips, preferences have been optimized`);
    }
    
    return insights.length > 0 ? insights : [
      'AI has optimized this itinerary based on current travel trends',
      'Recommendations include real-time local insights',
      'Schedule optimized for maximum enjoyment and minimal travel time'
    ];
  }

  private getMemoryInsights(userHistory?: TripMemory[]): string {
    if (!userHistory || !Array.isArray(userHistory) || userHistory.length === 0) {
      return 'No previous travel history available.';
    }

    return userHistory.map(trip => 
      `${trip.destination}: Enjoyed ${trip.preferences}, rated ${trip.rating}/5`
    ).join('; ');
  }

  private async generateEnhancedMockResponse(request: AIRequest): Promise<AIResponse> {
    // Enhanced mock response with memory considerations
    const memoryInsights = request.userHistory ? [
      'Based on your previous trips, we\'ve included more cultural experiences',
      'We noticed you prefer mid-morning starts, so we\'ve adjusted the schedule',
      'Added extra time for meals based on your dining preferences'
    ] : [];

    return {
      itinerary: await this.generateMockItinerary(request.travelInfo, request.preferences),
      personalizedRecommendations: [
        'Book popular restaurants 2-3 days in advance',
        'Download offline maps for better navigation',
        'Consider purchasing a city pass for attractions',
        'Pack layers as weather can change throughout the day'
      ],
      memoryInsights
    };
  }

  private async generateMockItinerary(travelInfo: any, preferences: any): Promise<any> {
    // Generate mock itinerary (similar to existing mock data but enhanced)
    const itinerary = [];
    const startDate = new Date(travelInfo.startDate);
    
    for (let i = 0; i < travelInfo.numberOfDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      itinerary.push({
        day: i + 1,
        date: currentDate.toISOString().split('T')[0],
        activities: await this.generateEnhancedActivities(i + 1, travelInfo, preferences),
        meals: this.generatePersonalizedMeals(travelInfo, preferences),
        travelTips: this.generatePersonalizedTips(preferences)
      });
    }

    return itinerary;
  }

  private async generateEnhancedActivities(day: number, travelInfo: any, preferences: any): Promise<any[]> {
    const baseActivities = [
      {
        id: `${day}-1`,
        time: '9:30 AM',
        title: `${travelInfo.destination} Cultural Quarter`,
        description: `Explore the vibrant cultural district with AI-curated experiences tailored to your interests in ${preferences.tripType.join(' and ')}.`,
        location: `${travelInfo.destination} Cultural District`,
        duration: '2.5 hours',
        travelTime: '15 minutes',
        transportMode: 'walking',
        funFact: `This area was specifically chosen based on your preference for ${preferences.tripType[0]} experiences.`,
        tips: [
          'AI recommends visiting between 9:30-11:30 AM for optimal lighting',
          'Based on your budget, we suggest the premium guided tour option',
          'Your dietary preferences have been noted for any food tastings'
        ]
      }
    ];

    // Add preference-based activities
    if (preferences.tripType.includes('adventure')) {
      baseActivities.push({
        id: `${day}-adventure`,
        time: '2:00 PM',
        title: 'Adventure Experience',
        description: 'AI-selected adventure activity matching your thrill-seeking preferences.',
        location: 'Adventure Zone',
        duration: '3 hours',
        travelTime: '20 minutes',
        transportMode: 'taxi',
        funFact: 'This activity was chosen based on your love for adventure experiences.',
        tips: ['Wear comfortable athletic clothing', 'Bring water and snacks']
      });
    }

    return baseActivities;
  }

  private generatePersonalizedMeals(travelInfo: any, preferences: any): any {
    const cuisinePrefs = preferences.cuisinePreferences.length > 0 
      ? preferences.cuisinePreferences[0] 
      : 'Local';

    return {
      breakfast: {
        restaurant: 'AI-Selected Morning Spot',
        cuisine: cuisinePrefs,
        location: `${travelInfo.destination} Center`,
        priceRange: travelInfo.budget === 'Economy' ? '$' : '$$',
        specialties: [`${cuisinePrefs} breakfast specialties`, 'Fresh local ingredients'],
        aiNote: 'Selected based on your cuisine preferences and dietary requirements'
      },
      lunch: {
        restaurant: 'Personalized Lunch Choice',
        cuisine: preferences.cuisinePreferences[1] || cuisinePrefs,
        location: 'Near your afternoon activities',
        priceRange: travelInfo.budget === 'Economy' ? '$' : travelInfo.budget === 'Premium' ? '$$' : '$$$',
        specialties: ['Regional favorites', 'Dietary-friendly options'],
        aiNote: 'Optimally located between your morning and afternoon activities'
      },
      dinner: {
        restaurant: 'AI-Curated Evening Dining',
        cuisine: 'Fine ' + cuisinePrefs,
        location: `${travelInfo.destination} Dining District`,
        priceRange: travelInfo.budget === 'Economy' ? '$$' : '$$$',
        specialties: ['Chef recommendations', 'Wine pairings', 'Romantic ambiance'],
        aiNote: 'Perfect for your travel group and budget preferences'
      }
    };
  }

  private generatePersonalizedTips(preferences: any): string[] {
    const baseTips = [
      'AI-optimized route planning saves 30% travel time',
      'Personalized recommendations based on your preferences',
      'Real-time updates available through the AI assistant'
    ];

    if (preferences.dietaryRequirements.length > 0) {
      baseTips.push(`All restaurants verified for ${preferences.dietaryRequirements.join(' and ')} options`);
    }

    return baseTips;
  }

  private async parseItineraryUpdate(content: string, currentPlan: any): Promise<any> {
    try {
      // Clean the content first
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const parsed = JSON.parse(cleanContent);
      
      if (parsed.itinerary && Array.isArray(parsed.itinerary)) {
        // Ensure all activities have proper IDs and structure
        for (const day of parsed.itinerary) {
          for (let i = 0; i < day.activities.length; i++) {
            const activity = day.activities[i];
            activity.id = `${day.day}-${i + 1}`;
            activity.travelTime = activity.travelTime || '15 minutes';
            activity.transportMode = activity.transportMode || 'walking';
          }
        }
        return parsed;
      }
      
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Failed to parse AI update response:', error);
      return currentPlan; // Return original plan if parsing fails
    }
  }

  private async parseRegeneratedDay(content: string, currentPlan: any, dayNumber: number): Promise<any> {
    try {
      // Clean the content first
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const parsed = JSON.parse(cleanContent);
      
      if (parsed.itinerary && Array.isArray(parsed.itinerary) && parsed.itinerary.length > 0) {
        const newDay = parsed.itinerary[0];
        
        // Ensure proper structure
        for (let i = 0; i < newDay.activities.length; i++) {
          const activity = newDay.activities[i];
          activity.id = `${dayNumber}-${i + 1}`;
          activity.travelTime = activity.travelTime || '15 minutes';
          activity.transportMode = activity.transportMode || 'walking';
        }
        
        // Replace the specific day in the current plan
        const updatedPlan = { ...currentPlan };
        const dayIndex = updatedPlan.itinerary.findIndex((day: any) => day.day === dayNumber);
        if (dayIndex !== -1) {
          updatedPlan.itinerary[dayIndex] = newDay;
        }
        
        return updatedPlan;
      }
      
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Failed to parse AI regenerated day response:', error);
      return currentPlan; // Return original plan if parsing fails
    }
  }

  private generateMockUpdate(updateRequest: string, currentPlan: any): any {
    console.log('🎭 Generating mock update for:', updateRequest);
    
    // Create a simple mock update by modifying one activity
    const updatedPlan = JSON.parse(JSON.stringify(currentPlan));
    
    if (updatedPlan.itinerary && updatedPlan.itinerary.length > 0) {
      const firstDay = updatedPlan.itinerary[0];
      if (firstDay.activities && firstDay.activities.length > 0) {
        const firstActivity = firstDay.activities[0];
        firstActivity.title = `Updated: ${firstActivity.title}`;
        firstActivity.description = `${firstActivity.description} (Updated based on your request: "${updateRequest}")`;
      }
    }
    
    return updatedPlan;
  }

  private generateMockDayRegeneration(currentPlan: any, dayNumber: number, travelInfo: any, preferences: any): any {
    console.log('🎭 Generating mock day regeneration for day:', dayNumber);
    
    const updatedPlan = JSON.parse(JSON.stringify(currentPlan));
    const dayIndex = updatedPlan.itinerary.findIndex((day: any) => day.day === dayNumber);
    
    if (dayIndex !== -1) {
      const originalDay = updatedPlan.itinerary[dayIndex];
      
      // Generate new activities for the day
      const newActivities = [
        {
          id: `${dayNumber}-1`,
          time: '9:30 AM',
          title: `Alternative ${travelInfo.destination} Experience`,
          description: `A fresh perspective on ${travelInfo.destination} with newly curated activities based on your preferences.`,
          location: `${travelInfo.destination} Alternative District`,
          duration: '2.5 hours',
          travelTime: '15 minutes',
          transportMode: 'walking',
          funFact: `This regenerated experience offers a different angle on ${travelInfo.destination}'s culture and attractions.`,
          tips: [
            'This is a regenerated activity with fresh recommendations',
            'Timing optimized for better experience',
            'Alternative route to avoid crowds'
          ]
        },
        {
          id: `${dayNumber}-2`,
          time: '1:00 PM',
          title: 'New Local Discovery',
          description: 'Discover hidden gems and local favorites that offer authentic experiences away from typical tourist spots.',
          location: 'Local Neighborhood',
          duration: '2 hours',
          travelTime: '20 minutes',
          transportMode: 'metro',
          funFact: 'This location is frequented by locals and offers genuine cultural immersion.',
          tips: [
            'Regenerated suggestion based on local insights',
            'Perfect for authentic cultural experience',
            'Less crowded alternative to popular spots'
          ]
        }
      ];
      
      // Update meals with new restaurants
      const newMeals = {
        breakfast: {
          restaurant: 'Fresh Morning Café (New)',
          cuisine: preferences.cuisinePreferences[0] || 'Local',
          location: `${travelInfo.destination} Center`,
          priceRange: '$$',
          specialties: ['Regenerated breakfast recommendation', 'Local morning favorites']
        },
        lunch: {
          restaurant: 'Alternative Lunch Spot (New)',
          cuisine: preferences.cuisinePreferences[1] || 'Regional',
          location: 'Near new activities',
          priceRange: '$$',
          specialties: ['Fresh lunch recommendation', 'Local specialties']
        },
        dinner: {
          restaurant: 'New Evening Dining (Regenerated)',
          cuisine: 'Fine Dining',
          location: `${travelInfo.destination} Dining District`,
          priceRange: '$$$',
          specialties: ['Regenerated dinner choice', 'Alternative cuisine experience']
        }
      };
      
      updatedPlan.itinerary[dayIndex] = {
        ...originalDay,
        activities: newActivities,
        meals: newMeals
      };
    }
    
    return updatedPlan;
  }
}

export const aiService = new AIService();