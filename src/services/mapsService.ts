interface MapImageOptions {
  width?: number;
  height?: number;
  zoom?: number;
  mapType?: 'roadmap' | 'satellite' | 'terrain' | 'hybrid';
  markers?: boolean;
}

interface MapResponse {
  success: boolean;
  mapUrl?: string;
  fallbackUrl?: string;
  error?: string;
  source: 'google_maps' | 'fallback';
}

class MapsService {
  private supabaseUrl: string;
  private supabaseAnonKey: string;
  private isConfigured: boolean;
  private cache: Map<string, string>;

  constructor() {
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    this.supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    this.isConfigured = !!this.supabaseUrl && !!this.supabaseAnonKey && this.supabaseUrl.includes('supabase.co');
    this.cache = new Map();
    
    console.log('🗺️ Maps Service Configuration (Backend):');
    console.log('- Supabase URL present:', !!this.supabaseUrl);
    console.log('- Supabase URL valid:', this.supabaseUrl.includes('supabase.co'));
    console.log('- Supabase Anon Key present:', !!this.supabaseAnonKey);
    console.log('- Is configured:', this.isConfigured);
    
    if (!this.isConfigured) {
      console.warn('⚠️ Supabase backend not configured for Maps API. Using fallback images.');
      console.warn('📝 Please configure Supabase URL and anonymous key in your .env file');
      console.warn('📝 Add GOOGLE_MAPS_API_KEY to Supabase Edge Functions environment variables');
    } else {
      console.log('✅ Maps Service ready with Supabase backend integration');
    }
  }

  isGoogleMapsConfigured(): boolean {
    return this.isConfigured;
  }

  async generateStaticMapUrl(location: string, title: string, options: MapImageOptions = {}): Promise<string> {
    console.log('🗺️ Generating map for:', { location, title, isConfigured: this.isConfigured });
    
    const cacheKey = `${location}-${title}-${JSON.stringify(options)}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    if (!this.isConfigured) {
      console.log('⚠️ Supabase backend not configured, using fallback');
      const fallbackUrl = this.getFallbackImage(title, location);
      this.cache.set(cacheKey, fallbackUrl);
      return fallbackUrl;
    }

    try {
      console.log('🗺️ Calling Supabase Edge Function for map:', title);
      
      const edgeFunctionUrl = `${this.supabaseUrl}/functions/v1/maps-static`;
      console.log('🔗 Maps Edge Function URL:', edgeFunctionUrl);

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location,
          title,
          ...options
        })
      });

      console.log('📡 Supabase maps response status:', response.status, response.ok ? 'OK' : 'Error');

      if (!response.ok) {
        throw new Error(`Supabase Maps Edge Function error: ${response.status}`);
      }

      // Check if response is JSON (error/fallback) or image blob (success)
      const contentType = response.headers.get('Content-Type') || '';
      
      if (contentType.includes('application/json')) {
        // Handle JSON response (error or fallback)
        const data: MapResponse = await response.json();
        console.log('📦 Supabase Maps JSON response:', data);
        
        const mapUrl = data.mapUrl || data.fallbackUrl || this.getFallbackImage(title, location);
        this.cache.set(cacheKey, mapUrl);
        return mapUrl;
      } else if (contentType.includes('image/')) {
        // Handle image blob response (success)
        const imageBlob = await response.blob();
        const blobUrl = URL.createObjectURL(imageBlob);
        console.log('✅ Successfully created blob URL for real map');
        this.cache.set(cacheKey, blobUrl);
        return blobUrl;
      } else {
        throw new Error('Unexpected response type');
      }

    } catch (error) {
      console.error('❌ Error calling Supabase Maps Edge Function:', error);
      const fallbackUrl = this.getFallbackImage(title, location);
      this.cache.set(cacheKey, fallbackUrl);
      return fallbackUrl;
    }
  }

  generateSearchUrl(location: string, title: string): string {
    const query = encodeURIComponent(`${title} ${location}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }

  private getFallbackImage(title: string, location: string): string {
    // Generate contextual fallback images based on activity type
    const titleLower = title.toLowerCase();
    const locationLower = location.toLowerCase();
    
    // Museum/Cultural activities
    if (titleLower.includes('museum') || titleLower.includes('art') || titleLower.includes('cultural') || titleLower.includes('heritage')) {
      return 'https://images.pexels.com/photos/1174732/pexels-photo-1174732.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop';
    }
    
    // Market/Shopping activities
    if (titleLower.includes('market') || titleLower.includes('shopping') || titleLower.includes('bazaar')) {
      return 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop';
    }
    
    // Food/Restaurant activities
    if (titleLower.includes('food') || titleLower.includes('restaurant') || titleLower.includes('dining') || titleLower.includes('cooking')) {
      return 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop';
    }
    
    // Nature/Outdoor activities
    if (titleLower.includes('park') || titleLower.includes('garden') || titleLower.includes('nature') || titleLower.includes('outdoor')) {
      return 'https://images.pexels.com/photos/1761279/pexels-photo-1761279.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop';
    }
    
    // Religious/Spiritual activities
    if (titleLower.includes('temple') || titleLower.includes('church') || titleLower.includes('mosque') || titleLower.includes('spiritual')) {
      return 'https://images.pexels.com/photos/1624496/pexels-photo-1624496.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop';
    }
    
    // Viewpoint/Scenic activities
    if (titleLower.includes('view') || titleLower.includes('sunset') || titleLower.includes('scenic') || titleLower.includes('lookout')) {
      return 'https://images.pexels.com/photos/1761279/pexels-photo-1761279.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop';
    }
    
    // Default based on popular destinations
    if (locationLower.includes('paris')) {
      return 'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop';
    } else if (locationLower.includes('tokyo') || locationLower.includes('japan')) {
      return 'https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop';
    } else if (locationLower.includes('london')) {
      return 'https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop';
    } else if (locationLower.includes('rome') || locationLower.includes('italy')) {
      return 'https://images.pexels.com/photos/2064827/pexels-photo-2064827.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop';
    } else if (locationLower.includes('new york')) {
      return 'https://images.pexels.com/photos/466685/pexels-photo-466685.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop';
    }
    
    // Default travel image
    return 'https://images.pexels.com/photos/1252814/pexels-photo-1252814.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop';
  }

  // Generate different map styles for variety
  async generateMapVariations(location: string, title: string): Promise<{
    roadmap: string;
    satellite: string;
    terrain: string;
  }> {
    return {
      roadmap: await this.generateStaticMapUrl(location, title, { mapType: 'roadmap', zoom: 15 }),
      satellite: await this.generateStaticMapUrl(location, title, { mapType: 'satellite', zoom: 16 }),
      terrain: await this.generateStaticMapUrl(location, title, { mapType: 'terrain', zoom: 14 })
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const mapsService = new MapsService();
export type { MapImageOptions };