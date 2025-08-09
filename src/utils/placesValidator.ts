interface PlacesAPIValidationResult {
  isValid: boolean;
  isConfigured: boolean;
  error?: string;
  quotaStatus?: 'ok' | 'exceeded' | 'unknown';
  enabledAPIs?: string[];
  suggestions?: string[];
  backendConfigured?: boolean;
}

class PlacesAPIValidator {
  private supabaseUrl: string;
  private supabaseAnonKey: string;
  private isBackendConfigured: boolean;

  constructor() {
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    this.supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    this.isBackendConfigured = !!this.supabaseUrl && !!this.supabaseAnonKey && this.supabaseUrl.includes('supabase.co');
  }

  async validateConfiguration(): Promise<PlacesAPIValidationResult> {
    console.log('🔍 Validating Google Places API configuration via Supabase backend...');
    
    // Check if Supabase backend is configured
    if (!this.isBackendConfigured) {
      return {
        isValid: false,
        isConfigured: false,
        backendConfigured: false,
        error: 'Supabase backend not configured',
        suggestions: [
          'Supabase URL and anonymous key are required',
          'The Google Places API key should be configured in Supabase Edge Functions environment',
          'Backend handles API calls to avoid CORS issues'
        ]
      };
    }

    // Test backend API functionality
    try {
      console.log('🧪 Testing Places API via Supabase Edge Function...');
      
      // Test with the existing places-photos edge function
      const edgeFunctionUrl = `${this.supabaseUrl}/functions/v1/places-photos`;
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'test restaurant',
          activityTitle: 'Test Restaurant',
          location: 'Test City',
          photoType: 'restaurant'
        })
      });
      
      console.log('📡 Backend Response Status:', response.status, response.ok ? 'OK' : 'Error');

      if (response.ok) {
        // Check if response is JSON (error/fallback) or image blob (success)
        const contentType = response.headers.get('Content-Type') || '';
        
        if (contentType.includes('application/json')) {
          const data = await response.json();
          console.log('📦 Backend JSON response:', data);
          
          if (data.success) {
            return {
              isValid: true,
              isConfigured: true,
              backendConfigured: true,
              quotaStatus: 'ok',
              enabledAPIs: ['Places API (New) via Supabase'],
              suggestions: [
                'Google Places API is working correctly via Supabase backend!',
                'You can now get real photos of places and restaurants',
                'CORS issues are resolved by using the backend'
              ]
            };
          } else if (data.error && data.error.includes('GOOGLE_PLACES_API_KEY not found')) {
            return {
              isValid: false,
              isConfigured: false,
              backendConfigured: true,
              error: 'Google Places API key not configured in Supabase environment',
              suggestions: [
                'Add GOOGLE_PLACES_API_KEY to Supabase Edge Functions environment variables',
                'Go to Supabase Dashboard → Settings → Edge Functions → Environment Variables',
                'Get your API key from Google Cloud Console',
                'Enable Places API (New) in your Google Cloud project'
              ]
            };
          } else {
            return {
              isValid: false,
              isConfigured: true,
              backendConfigured: true,
              error: data.error || 'Backend API error',
              suggestions: [
                'Check Supabase Edge Function logs for details',
                'Verify Google Places API key in Supabase environment',
                'Ensure Places API (New) is enabled in Google Cloud'
              ]
            };
          }
        } else if (contentType.includes('image/')) {
          // Successfully got an image - API is working
          return {
            isValid: true,
            isConfigured: true,
            backendConfigured: true,
            quotaStatus: 'ok',
            enabledAPIs: ['Places API (New) via Supabase'],
            suggestions: [
              'Google Places API is working perfectly via Supabase backend!',
              'Real photos are being fetched successfully',
              'Full functionality is available'
            ]
          };
        } else {
          return {
            isValid: false,
            isConfigured: true,
            backendConfigured: true,
            error: 'Unexpected response type from backend',
            suggestions: [
              'Check Supabase Edge Function implementation',
              'Verify the places-photos function is working correctly'
            ]
          };
        }
      } else if (response.status === 404) {
        return {
          isValid: false,
          isConfigured: false,
          backendConfigured: true,
          error: 'Places-photos edge function not found',
          suggestions: [
            'The places-photos edge function may not be deployed',
            'Check Supabase Dashboard → Edge Functions',
            'Ensure the function is properly deployed'
          ]
        };
      } else {
        return {
          isValid: false,
          isConfigured: true,
          backendConfigured: true,
          error: `Backend error: ${response.status} ${response.statusText}`,
          suggestions: [
            'Check Supabase Edge Function logs',
            'Verify the places-photos function is working',
            'Check Google Places API configuration in Supabase environment'
          ]
        };
      }
    } catch (error) {
      console.error('❌ Backend validation error:', error);
      return {
        isValid: false,
        isConfigured: false,
        backendConfigured: this.isBackendConfigured,
        error: `Network error: ${error.message}`,
        suggestions: [
          'Check your internet connection',
          'Verify Supabase configuration is correct',
          'Try again in a few moments'
        ]
      };
    }
  }

  async testPhotoFetching(): Promise<{success: boolean, error?: string}> {
    if (!this.isBackendConfigured) {
      return { success: false, error: 'Supabase backend not configured' };
    }

    try {
      console.log('📸 Testing photo fetching capability via backend...');
      
      // Test with a well-known location
      const edgeFunctionUrl = `${this.supabaseUrl}/functions/v1/places-photos`;
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'Eiffel Tower Paris',
          activityTitle: 'Eiffel Tower',
          location: 'Paris',
          photoType: 'activity'
        })
      });
      
      if (response.ok) {
        const contentType = response.headers.get('Content-Type') || '';
        
        if (contentType.includes('image/')) {
          console.log('✅ Photo fetching test successful - got real image');
          return { success: true };
        } else if (contentType.includes('application/json')) {
          const data = await response.json();
          if (data.success && data.photoUrl) {
            console.log('✅ Photo fetching test successful - got photo URL');
            return { success: true };
          } else {
            return { success: false, error: data.error || 'No photos available for test location' };
          }
        } else {
          return { success: false, error: 'Unexpected response type' };
        }
      } else {
        return { success: false, error: `Backend error: ${response.status}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getSetupInstructions(): string[] {
    return [
      '1. Get Google Places API Key:',
      '   • Go to Google Cloud Console (https://console.cloud.google.com/)',
      '   • Create a new project or select an existing one',
      '   • Enable billing for your project (required for Places API)',
      '   • Go to APIs & Services > Library',
      '   • Search for "Places API (New)" and enable it',
      '   • Go to APIs & Services > Credentials',
      '   • Click "Create Credentials" > "API Key"',
      '2. Configure Supabase Backend:',
      '   • Go to Supabase Dashboard → Settings → Edge Functions',
      '   • Add Environment Variable: GOOGLE_PLACES_API_KEY',
      '   • Set the value to your Google Places API key',
      '   • The places-photos edge function will use this key',
      '3. Verify Configuration:',
      '   • Use the test button to verify everything works',
      '   • Backend handles all API calls to avoid CORS issues'
    ];
  }

  getCurrentStatus(): {backendConfigured: boolean, supabaseUrl: string, hasAnonKey: boolean} {
    return {
      backendConfigured: this.isBackendConfigured,
      supabaseUrl: this.supabaseUrl ? this.supabaseUrl.substring(0, 30) + '...' : 'Not configured',
      hasAnonKey: !!this.supabaseAnonKey
    };
  }
}

export const placesValidator = new PlacesAPIValidator();
export type { PlacesAPIValidationResult };