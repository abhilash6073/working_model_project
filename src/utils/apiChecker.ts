interface APIStatus {
  name: string;
  configured: boolean;
  valid: boolean;
  error?: string;
  functionality: string;
  setupUrl: string;
}

class APIChecker {
  private results: APIStatus[] = [];

  async checkAllAPIs(): Promise<APIStatus[]> {
    this.results = [];
    
    // Check Gemini API
    await this.checkGeminiAPI();
    
    // Check Google Places API
    await this.checkGooglePlacesAPI();
    
    // Check Google Maps API
    await this.checkGoogleMapsAPI();
    
    // Check Supabase
    this.checkSupabaseConfig();
    
    // Check Imagen API
    this.checkImagenAPI();
    
    return this.results;
  }

  private async checkGeminiAPI(): Promise<void> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const status: APIStatus = {
      name: 'Google Gemini AI',
      configured: !!apiKey && apiKey !== 'your_gemini_api_key_here' && apiKey.length > 20,
      valid: false,
      functionality: 'AI itinerary generation, chat assistance, destination search',
      setupUrl: 'https://makersuite.google.com/app/apikey'
    };

    if (!status.configured) {
      status.error = 'API key not configured or invalid format';
      this.results.push(status);
      return;
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello' }] }],
          generationConfig: { maxOutputTokens: 10 }
        })
      });

      if (response.ok) {
        status.valid = true;
      } else if (response.status === 403) {
        status.error = 'API key invalid or access denied';
      } else if (response.status === 429) {
        status.error = 'Quota exceeded - but key is valid';
        status.valid = true; // Key is valid, just quota issue
      } else {
        status.error = `API error: ${response.status}`;
      }
    } catch (error) {
      status.error = `Network error: ${error.message}`;
    }

    this.results.push(status);
  }

  private async checkGooglePlacesAPI(): Promise<void> {
    const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
    const status: APIStatus = {
      name: 'Google Places API',
      configured: !!apiKey && apiKey !== 'your_google_places_api_key_here' && apiKey.startsWith('AIza'),
      valid: false,
      functionality: 'Real photos of places and restaurants',
      setupUrl: 'https://console.cloud.google.com/apis/credentials'
    };

    if (!status.configured) {
      status.error = 'API key not configured or invalid format';
      this.results.push(status);
      return;
    }

    try {
      // Test with a simple place search
      const response = await fetch(`https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=restaurant&inputtype=textquery&fields=place_id&key=${apiKey}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'OK') {
          status.valid = true;
        } else if (data.status === 'REQUEST_DENIED') {
          status.error = 'API key invalid or Places API not enabled';
        } else if (data.status === 'OVER_QUERY_LIMIT') {
          status.error = 'Quota exceeded - but key is valid';
          status.valid = true;
        } else {
          status.error = `API status: ${data.status}`;
        }
      } else {
        status.error = `HTTP error: ${response.status}`;
      }
    } catch (error) {
      status.error = `Network error: ${error.message}`;
    }

    this.results.push(status);
  }

  private async checkGoogleMapsAPI(): Promise<void> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const status: APIStatus = {
      name: 'Google Maps Static API (via Supabase)',
      configured: !!supabaseUrl && !!supabaseAnonKey && supabaseUrl.includes('supabase.co'),
      valid: false,
      functionality: 'Static map images for locations via backend',
      setupUrl: 'https://supabase.com/dashboard'
    };

    if (!status.configured) {
      status.error = 'Supabase backend not configured';
      this.results.push(status);
      return;
    }

    try {
      // Test with the maps-static edge function
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/maps-static`;
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: 'Test Location',
          title: 'Test Map',
          width: 100,
          height: 100,
          zoom: 1
        })
      });
      
      if (response.ok) {
        const contentType = response.headers.get('Content-Type') || '';
        
        if (contentType.includes('image/') || contentType.includes('application/json')) {
          status.valid = true;
        } else {
          status.error = 'Unexpected response from backend';
        }
      } else if (response.status === 404) {
        status.error = 'Maps-static edge function not found';
      } else {
        status.error = `Backend error: ${response.status}`;
      }
    } catch (error) {
      status.error = `Network error: ${error.message}`;
    }

    this.results.push(status);
  }

  private checkSupabaseConfig(): void {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const status: APIStatus = {
      name: 'Supabase Backend',
      configured: !!url && !!key && url.includes('supabase.co'),
      valid: !!url && !!key && url.includes('supabase.co'),
      functionality: 'Database, authentication, edge functions for enhanced photo fetching',
      setupUrl: 'https://supabase.com/dashboard'
    };

    if (!status.configured) {
      status.error = 'Supabase URL or anonymous key not configured';
    }

    this.results.push(status);
  }

  private checkImagenAPI(): void {
    const apiKey = import.meta.env.VITE_IMAGEN_API_KEY;
    const status: APIStatus = {
      name: 'Google Imagen AI',
      configured: !!apiKey && apiKey !== 'your_imagen_api_key_here',
      valid: false, // Can't easily test without complex setup
      functionality: 'AI image generation (experimental)',
      setupUrl: 'https://console.cloud.google.com/vertex-ai'
    };

    if (!status.configured) {
      status.error = 'API key not configured (optional feature)';
    } else {
      status.error = 'Cannot validate without complex GCP setup';
    }

    this.results.push(status);
  }

  generateReport(): string {
    let report = '🔧 API Configuration Status Report\n\n';
    
    const configured = this.results.filter(r => r.configured).length;
    const valid = this.results.filter(r => r.valid).length;
    
    report += `📊 Summary: ${configured}/${this.results.length} configured, ${valid}/${this.results.length} validated\n\n`;
    
    this.results.forEach(api => {
      const status = api.valid ? '✅' : api.configured ? '⚠️' : '❌';
      report += `${status} ${api.name}\n`;
      report += `   Functionality: ${api.functionality}\n`;
      
      if (api.configured && api.valid) {
        report += `   Status: Fully functional\n`;
      } else if (api.configured && !api.valid) {
        report += `   Status: Configured but validation failed\n`;
        report += `   Error: ${api.error}\n`;
      } else {
        report += `   Status: Not configured\n`;
        report += `   Setup: ${api.setupUrl}\n`;
      }
      report += '\n';
    });

    return report;
  }
}

export const apiChecker = new APIChecker();
export type { APIStatus };