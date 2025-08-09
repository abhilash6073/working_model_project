interface PlacesAPIValidationResult {
  isValid: boolean;
  isConfigured: boolean;
  error?: string;
  quotaStatus?: 'ok' | 'exceeded' | 'unknown';
  enabledAPIs?: string[];
  suggestions?: string[];
}

class PlacesAPIValidator {
  private apiKey: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY || '';
  }

  async validateConfiguration(): Promise<PlacesAPIValidationResult> {
    console.log('🔍 Validating Google Places API configuration...');
    
    // Check if API key is configured
    if (!this.apiKey || this.apiKey === 'your_google_places_api_key_here') {
      return {
        isValid: false,
        isConfigured: false,
        error: 'Google Places API key not configured',
        suggestions: [
          'Add VITE_GOOGLE_PLACES_API_KEY to your .env file',
          'Get your API key from Google Cloud Console',
          'Enable Places API (New) in your Google Cloud project'
        ]
      };
    }

    // Check API key format
    if (!this.apiKey.startsWith('AIza')) {
      return {
        isValid: false,
        isConfigured: true,
        error: 'Invalid Google API key format (should start with "AIza")',
        suggestions: [
          'Verify you copied the complete API key',
          'Make sure it\'s a Google Cloud API key, not a different type'
        ]
      };
    }

    // Test API functionality
    try {
      console.log('🧪 Testing Places API with a simple query...');
      
      // Test with a simple place search
      const testUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=restaurant&inputtype=textquery&fields=place_id,name&key=${this.apiKey}`;
      
      const response = await fetch(testUrl);
      const data = await response.json();
      
      console.log('📡 Places API Response:', data);

      if (data.status === 'OK') {
        return {
          isValid: true,
          isConfigured: true,
          quotaStatus: 'ok',
          enabledAPIs: ['Places API (New)'],
          suggestions: [
            'Google Places API is working correctly!',
            'You can now get real photos of places and restaurants',
            'Consider enabling additional APIs like Maps Static API for full functionality'
          ]
        };
      } else if (data.status === 'REQUEST_DENIED') {
        return {
          isValid: false,
          isConfigured: true,
          error: 'Places API access denied - API not enabled or key restrictions',
          suggestions: [
            'Enable Places API (New) in Google Cloud Console',
            'Check API key restrictions (HTTP referrers, IP addresses)',
            'Verify billing is enabled for your Google Cloud project',
            'Make sure the API key has Places API permissions'
          ]
        };
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        return {
          isValid: true,
          isConfigured: true,
          error: 'API quota exceeded, but key is valid',
          quotaStatus: 'exceeded',
          suggestions: [
            'Your API key is valid but you\'ve exceeded the quota',
            'Check your usage in Google Cloud Console',
            'Consider upgrading your billing plan',
            'The app will use fallback images when quota is exceeded'
          ]
        };
      } else if (data.status === 'ZERO_RESULTS') {
        return {
          isValid: true,
          isConfigured: true,
          quotaStatus: 'ok',
          suggestions: [
            'API is working (no results for test query is normal)',
            'Places API is ready for use!'
          ]
        };
      } else {
        return {
          isValid: false,
          isConfigured: true,
          error: `Places API returned status: ${data.status}`,
          suggestions: [
            'Check Google Cloud Console for API status',
            'Verify your API key permissions',
            'Review Places API documentation'
          ]
        };
      }
    } catch (error) {
      console.error('❌ Places API validation error:', error);
      return {
        isValid: false,
        isConfigured: true,
        error: `Network error: ${error.message}`,
        suggestions: [
          'Check your internet connection',
          'Verify the API key is correct',
          'Try again in a few moments'
        ]
      };
    }
  }

  async testPhotoFetching(): Promise<{success: boolean, error?: string}> {
    if (!this.apiKey) {
      return { success: false, error: 'API key not configured' };
    }

    try {
      console.log('📸 Testing photo fetching capability...');
      
      // First, find a place
      const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=Eiffel Tower Paris&inputtype=textquery&fields=place_id&key=${this.apiKey}`;
      const findResponse = await fetch(findPlaceUrl);
      const findData = await findResponse.json();
      
      if (findData.status !== 'OK' || !findData.candidates?.length) {
        return { success: false, error: 'Could not find test location' };
      }
      
      const placeId = findData.candidates[0].place_id;
      
      // Get place details with photos
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photo&key=${this.apiKey}`;
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();
      
      if (detailsData.status === 'OK' && detailsData.result?.photos?.length > 0) {
        console.log('✅ Photo fetching test successful');
        return { success: true };
      } else {
        return { success: false, error: 'No photos available for test location' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getSetupInstructions(): string[] {
    return [
      '1. Go to Google Cloud Console (https://console.cloud.google.com/)',
      '2. Create a new project or select an existing one',
      '3. Enable billing for your project (required for Places API)',
      '4. Go to APIs & Services > Library',
      '5. Search for "Places API (New)" and enable it',
      '6. Go to APIs & Services > Credentials',
      '7. Click "Create Credentials" > "API Key"',
      '8. Copy the API key and add it to your .env file as VITE_GOOGLE_PLACES_API_KEY',
      '9. (Optional) Restrict the API key to specific APIs and domains for security',
      '10. Restart your development server'
    ];
  }

  getCurrentStatus(): {configured: boolean, keyFormat: string, keyLength: number} {
    return {
      configured: !!this.apiKey && this.apiKey !== 'your_google_places_api_key_here',
      keyFormat: this.apiKey ? (this.apiKey.startsWith('AIza') ? 'Valid format' : 'Invalid format') : 'Not set',
      keyLength: this.apiKey ? this.apiKey.length : 0
    };
  }
}

export const placesValidator = new PlacesAPIValidator();
export type { PlacesAPIValidationResult };