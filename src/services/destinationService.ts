interface DestinationSuggestion {
  name: string;
  country: string;
  region: string;
  description?: string;
  popular?: boolean;
}

interface AIDestinationResponse {
  suggestions: DestinationSuggestion[];
}

class DestinationService {
  private geminiApiKey: string;
  private geminiBaseUrl: string;
  private isConfigured: boolean;
  private cache: Map<string, DestinationSuggestion[]>;

  constructor() {
    this.geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    this.geminiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    this.isConfigured = !!this.geminiApiKey && 
                       this.geminiApiKey !== 'your_gemini_api_key_here' && 
                       this.geminiApiKey.length > 20;
    this.cache = new Map();
    
    console.log('🌍 Destination Service Configuration:');
    console.log('- AI Configured:', this.isConfigured);
    console.log('- Using mode:', this.isConfigured ? 'AI-Powered Search' : 'Static Search');
  }

  async searchDestinations(query: string): Promise<DestinationSuggestion[]> {
    if (query.length < 2) return [];

    const cacheKey = query.toLowerCase();
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      let suggestions: DestinationSuggestion[] = [];

      // Always try fallback first to avoid quota issues
      console.log('📋 Using fallback destination search:', query);
      suggestions = this.getFallbackDestinations(query);
      
      // Only try AI if fallback returns insufficient results and AI is configured
      if (suggestions.length < 3 && this.isConfigured) {
        try {
          console.log('🤖 Enhancing with AI destination search:', query);
          const aiSuggestions = await this.getAIDestinations(query);
          // Merge AI suggestions with fallback, removing duplicates
          const combined = [...suggestions];
          for (const aiSugg of aiSuggestions) {
            if (!combined.some(s => s.name.toLowerCase() === aiSugg.name.toLowerCase())) {
              combined.push(aiSugg);
            }
          }
          suggestions = combined.slice(0, 10);
        } catch (aiError) {
          console.warn('⚠️ AI destination search failed, using fallback only:', aiError);
          // Continue with fallback suggestions
        }
      }

      // Cache the results
      this.cache.set(cacheKey, suggestions);
      return suggestions;

    } catch (error) {
      console.error('Destination search error:', error);
      console.log('🔄 Falling back to static destination search');
      // Always fall back to static search on any error
      return this.getFallbackDestinations(query);
    }
  }

  private async getAIDestinations(query: string): Promise<DestinationSuggestion[]> {
    const systemPrompt = `You are a travel destination expert. Given a partial destination name or letters, suggest relevant travel destinations.

CRITICAL: Return your response as valid JSON in this exact format:
{
  "suggestions": [
    {
      "name": "City Name",
      "country": "Country Name",
      "region": "Region Name",
      "description": "Brief description",
      "popular": true/false
    }
  ]
}

Requirements:
- Suggest 8-10 destinations maximum
- Include popular tourist destinations that match the query
- Consider cities, countries, regions, and landmarks
- Prioritize well-known travel destinations
- Include both popular and hidden gem destinations
- Ensure all JSON is properly formatted and valid`;

    const userPrompt = `Suggest travel destinations that match or start with: "${query}"

Consider:
- Cities that start with these letters
- Countries that match
- Popular tourist regions
- Famous landmarks or areas
- Both international and domestic destinations

Provide diverse suggestions from different continents and regions.`;

    try {
      // Check if API key is properly configured
      if (!this.geminiApiKey || this.geminiApiKey === 'your_gemini_api_key_here' || this.geminiApiKey.length < 20) {
        console.warn('⚠️ Gemini API key not properly configured, using fallback');
        throw new Error('API key not configured');
      }

      // Use gemini-1.5-flash instead of gemini-2.0-flash-exp to avoid quota issues
      const response = await fetch(`${this.geminiBaseUrl}/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\nUser Query: ${userPrompt}`
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1500
          }
        })
      });

      if (!response.ok) {
        let errorMessage = `Gemini API error: ${response.status} ${response.statusText}`;
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('Gemini API Response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      if (!content) {
        throw new Error('No content received from API');
      }

      return this.parseAIResponse(content, query);
    } catch (error) {
      console.error('AI destination search error:', error);
      throw error;
    }
  }

  private parseAIResponse(content: string, query: string): DestinationSuggestion[] {
    try {
      // Clean the content - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed: AIDestinationResponse = JSON.parse(cleanContent);
      
      if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
        return parsed.suggestions.slice(0, 10); // Limit to 10 suggestions
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      // Fallback to extracting destinations from text
      return this.extractDestinationsFromText(content, query);
    }
  }

  private extractDestinationsFromText(content: string, query: string): DestinationSuggestion[] {
    const suggestions: DestinationSuggestion[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      // Look for patterns like "City, Country" or "City - Country"
      const cityCountryMatch = line.match(/([A-Za-z\s]+)[,\-]\s*([A-Za-z\s]+)/);
      if (cityCountryMatch) {
        const [, city, country] = cityCountryMatch;
        if (city.toLowerCase().includes(query.toLowerCase())) {
          suggestions.push({
            name: city.trim(),
            country: country.trim(),
            region: this.getRegionFromCountry(country.trim()),
            popular: this.isPopularDestination(city.trim())
          });
        }
      }
    }

    return suggestions.slice(0, 8);
  }

  private getFallbackDestinations(query: string): DestinationSuggestion[] {
    const fallbackDestinations: DestinationSuggestion[] = [
      // Popular destinations organized alphabetically
      { name: 'Amsterdam', country: 'Netherlands', region: 'Europe', popular: true },
      { name: 'Ankara', country: 'Turkey', region: 'Europe/Asia', popular: false },
      { name: 'Athens', country: 'Greece', region: 'Europe', popular: true },
      { name: 'Auckland', country: 'New Zealand', region: 'Oceania', popular: true },
      { name: 'Bangkok', country: 'Thailand', region: 'Asia', popular: true },
      { name: 'Barcelona', country: 'Spain', region: 'Europe', popular: true },
      { name: 'Beijing', country: 'China', region: 'Asia', popular: true },
      { name: 'Berlin', country: 'Germany', region: 'Europe', popular: true },
      { name: 'Bali', country: 'Indonesia', region: 'Asia', popular: true },
      { name: 'Buenos Aires', country: 'Argentina', region: 'South America', popular: true },
      { name: 'Cairo', country: 'Egypt', region: 'Africa', popular: true },
      { name: 'Cape Town', country: 'South Africa', region: 'Africa', popular: true },
      { name: 'Copenhagen', country: 'Denmark', region: 'Europe', popular: true },
      { name: 'Delhi', country: 'India', region: 'Asia', popular: true },
      { name: 'Dubai', country: 'UAE', region: 'Middle East', popular: true },
      { name: 'Dublin', country: 'Ireland', region: 'Europe', popular: true },
      { name: 'Edinburgh', country: 'Scotland', region: 'Europe', popular: true },
      { name: 'Florence', country: 'Italy', region: 'Europe', popular: true },
      { name: 'Geneva', country: 'Switzerland', region: 'Europe', popular: true },
      { name: 'Hong Kong', country: 'Hong Kong', region: 'Asia', popular: true },
      { name: 'Helsinki', country: 'Finland', region: 'Europe', popular: true },
      { name: 'Istanbul', country: 'Turkey', region: 'Europe/Asia', popular: true },
      { name: 'Jakarta', country: 'Indonesia', region: 'Asia', popular: true },
      { name: 'Kyoto', country: 'Japan', region: 'Asia', popular: true },
      { name: 'Kuala Lumpur', country: 'Malaysia', region: 'Asia', popular: true },
      { name: 'Lisbon', country: 'Portugal', region: 'Europe', popular: true },
      { name: 'London', country: 'UK', region: 'Europe', popular: true },
      { name: 'Los Angeles', country: 'USA', region: 'North America', popular: true },
      { name: 'Madrid', country: 'Spain', region: 'Europe', popular: true },
      { name: 'Melbourne', country: 'Australia', region: 'Oceania', popular: true },
      { name: 'Mexico City', country: 'Mexico', region: 'North America', popular: true },
      { name: 'Milan', country: 'Italy', region: 'Europe', popular: true },
      { name: 'Mumbai', country: 'India', region: 'Asia', popular: true },
      { name: 'Nairobi', country: 'Kenya', region: 'Africa', popular: true },
      { name: 'New York', country: 'USA', region: 'North America', popular: true },
      { name: 'Oslo', country: 'Norway', region: 'Europe', popular: true },
      { name: 'Paris', country: 'France', region: 'Europe', popular: true },
      { name: 'Prague', country: 'Czech Republic', region: 'Europe', popular: true },
      { name: 'Reykjavik', country: 'Iceland', region: 'Europe', popular: true },
      { name: 'Rome', country: 'Italy', region: 'Europe', popular: true },
      { name: 'San Francisco', country: 'USA', region: 'North America', popular: true },
      { name: 'Seoul', country: 'South Korea', region: 'Asia', popular: true },
      { name: 'Singapore', country: 'Singapore', region: 'Asia', popular: true },
      { name: 'Stockholm', country: 'Sweden', region: 'Europe', popular: true },
      { name: 'Sydney', country: 'Australia', region: 'Oceania', popular: true },
      { name: 'Tel Aviv', country: 'Israel', region: 'Middle East', popular: true },
      { name: 'Tokyo', country: 'Japan', region: 'Asia', popular: true },
      { name: 'Toronto', country: 'Canada', region: 'North America', popular: true },
      { name: 'Vancouver', country: 'Canada', region: 'North America', popular: true },
      { name: 'Vienna', country: 'Austria', region: 'Europe', popular: true },
      { name: 'Warsaw', country: 'Poland', region: 'Europe', popular: true },
      { name: 'Zurich', country: 'Switzerland', region: 'Europe', popular: true },
      // Add more destinations as needed
    ];

    return fallbackDestinations
      .filter(dest => 
        dest.name.toLowerCase().includes(query.toLowerCase()) ||
        dest.country.toLowerCase().includes(query.toLowerCase()) ||
        dest.region.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 10);
  }

  private getRegionFromCountry(country: string): string {
    const regionMap: { [key: string]: string } = {
      'France': 'Europe', 'Italy': 'Europe', 'Spain': 'Europe', 'UK': 'Europe',
      'Germany': 'Europe', 'Netherlands': 'Europe', 'Greece': 'Europe',
      'Japan': 'Asia', 'Thailand': 'Asia', 'India': 'Asia', 'Singapore': 'Asia',
      'USA': 'North America', 'Canada': 'North America',
      'Australia': 'Oceania', 'New Zealand': 'Oceania',
      'UAE': 'Middle East', 'Turkey': 'Europe/Asia',
      'Egypt': 'Africa', 'Morocco': 'Africa',
      'Brazil': 'South America', 'Argentina': 'South America'
    };

    for (const [countryKey, region] of Object.entries(regionMap)) {
      if (country.toLowerCase().includes(countryKey.toLowerCase())) {
        return region;
      }
    }

    return 'Other';
  }

  private isPopularDestination(city: string): boolean {
    const popularCities = [
      'paris', 'london', 'tokyo', 'new york', 'rome', 'barcelona', 'amsterdam',
      'dubai', 'bangkok', 'sydney', 'mumbai', 'berlin', 'prague', 'vienna'
    ];
    
    return popularCities.includes(city.toLowerCase());
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const destinationService = new DestinationService();
export type { DestinationSuggestion };