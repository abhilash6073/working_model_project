interface PlacePhotoResponse {
  success: boolean;
  photoUrl?: string;
  fallbackUrl?: string;
  error?: string;
  source: 'google_places' | 'fallback';
}

class PlacesService {
  private supabaseUrl: string;
  private supabaseAnonKey: string;
  private isConfigured: boolean;
  private cache: Map<string, string>;

  constructor() {
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    this.supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    this.isConfigured = !!this.supabaseUrl && !!this.supabaseAnonKey;
    this.cache = new Map();
    
    console.log('🔧 Supabase Places Service Configuration:');
    console.log('- Supabase URL present:', !!this.supabaseUrl);
    console.log('- Supabase URL valid:', this.supabaseUrl.includes('supabase.co'));
    console.log('- Supabase URL value:', this.supabaseUrl ? this.supabaseUrl.substring(0, 30) + '...' : 'None');
    console.log('- Supabase Anon Key present:', !!this.supabaseAnonKey);
    console.log('- Backend integration:', this.isConfigured ? '✅ Enabled' : '❌ Disabled');
  }

  async getPlacePhoto(activityTitle: string, location: string): Promise<string> {
    const cacheKey = `${activityTitle}-${location}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    if (!this.isConfigured) {
      console.warn('⚠️ Supabase not configured, using fallback image');
      return this.getFallbackImage(activityTitle, location);
    }

    try {
      console.log('📸 Calling Supabase Edge Function for:', activityTitle);
      
      const edgeFunctionUrl = `${this.supabaseUrl}/functions/v1/places-photos`;
      console.log('🔗 Edge Function URL:', edgeFunctionUrl);

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `${activityTitle} ${location}`,
          activityTitle,
          location,
          photoType: 'activity',
          maxWidth: 800,
          maxHeight: 500
        })
      });

      console.log('📡 Supabase response status:', response.status, response.ok ? 'OK' : 'Error');

      if (!response.ok) {
        throw new Error(`Supabase Edge Function error: ${response.status}`);
      }

      // Check if response is JSON (error/fallback) or image blob (success)
      const contentType = response.headers.get('Content-Type') || '';
      
      if (contentType.includes('application/json')) {
        // Handle JSON response (error or fallback)
        const data: PlacePhotoResponse = await response.json();
        console.log('📦 Supabase JSON response:', data);
        
        if (data.success && data.photoUrl) {
          this.cache.set(cacheKey, data.photoUrl);
          return data.photoUrl;
        } else {
          const fallbackUrl = data.fallbackUrl || this.getFallbackImage(activityTitle, location);
          this.cache.set(cacheKey, fallbackUrl);
          return fallbackUrl;
        }
      } else if (contentType.includes('image/')) {
        // Handle image blob response (success)
        const imageBlob = await response.blob();
        const blobUrl = URL.createObjectURL(imageBlob);
        console.log('✅ Successfully created blob URL for real photo');
        this.cache.set(cacheKey, blobUrl);
        return blobUrl;
      } else {
        throw new Error('Unexpected response type');
      }


    } catch (error) {
      console.error('❌ Error calling Supabase Edge Function:', error);
      const fallbackUrl = this.getFallbackImage(activityTitle, location);
      this.cache.set(cacheKey, fallbackUrl);
      return fallbackUrl;
    }
  }

  async getRestaurantPhoto(restaurantName: string, location: string, cuisine: string): Promise<string> {
    const cacheKey = `restaurant-${restaurantName}-${location}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    if (!this.isConfigured) {
      console.warn('⚠️ Supabase not configured, using fallback restaurant image');
      return this.getRestaurantFallbackImage(cuisine);
    }

    try {
      console.log('🍽️ Calling Supabase Edge Function for restaurant:', restaurantName);
      
      const edgeFunctionUrl = `${this.supabaseUrl}/functions/v1/places-photos`;

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `${restaurantName} ${location}`,
          activityTitle: restaurantName,
          location,
          photoType: 'restaurant',
          maxWidth: 400,
          maxHeight: 200
        })
      });

      console.log('📡 Restaurant photo response status:', response.status, response.ok ? 'OK' : 'Error');

      if (!response.ok) {
        throw new Error(`Supabase Edge Function error: ${response.status}`);
      }

      // Check if response is JSON (error/fallback) or image blob (success)
      const contentType = response.headers.get('Content-Type') || '';
      
      if (contentType.includes('application/json')) {
        // Handle JSON response (error or fallback)
        const data: PlacePhotoResponse = await response.json();
        console.log('📦 Restaurant JSON response:', data);
        
        if (data.success && data.photoUrl) {
          this.cache.set(cacheKey, data.photoUrl);
          return data.photoUrl;
        } else {
          const fallbackUrl = data.fallbackUrl || this.getRestaurantFallbackImage(cuisine);
          this.cache.set(cacheKey, fallbackUrl);
          return fallbackUrl;
        }
      } else if (contentType.includes('image/')) {
        // Handle image blob response (success)
        const imageBlob = await response.blob();
        const blobUrl = URL.createObjectURL(imageBlob);
        console.log('✅ Successfully created blob URL for real restaurant photo');
        this.cache.set(cacheKey, blobUrl);
        return blobUrl;
      } else {
        throw new Error('Unexpected response type');
      }


    } catch (error) {
      console.error('❌ Error fetching restaurant photo:', error);
      const fallbackUrl = this.getRestaurantFallbackImage(cuisine);
      this.cache.set(cacheKey, fallbackUrl);
      return fallbackUrl;
    }
  }

  private getFallbackImage(activityTitle: string, location: string): string {
    const titleLower = activityTitle.toLowerCase();
    const locationLower = location.toLowerCase();
    
    // Museum/Cultural activities
    if (titleLower.includes('museum') || titleLower.includes('art') || titleLower.includes('cultural') || titleLower.includes('heritage')) {
      return 'https://images.pexels.com/photos/1174732/pexels-photo-1174732.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop';
    }
    
    // Market/Shopping activities
    if (titleLower.includes('market') || titleLower.includes('shopping') || titleLower.includes('bazaar')) {
      return 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop';
    }
    
    // Food/Restaurant activities
    if (titleLower.includes('food') || titleLower.includes('restaurant') || titleLower.includes('dining') || titleLower.includes('cooking')) {
      return 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop';
    }
    
    // Nature/Outdoor activities
    if (titleLower.includes('park') || titleLower.includes('garden') || titleLower.includes('nature') || titleLower.includes('outdoor')) {
      return 'https://images.pexels.com/photos/1761279/pexels-photo-1761279.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop';
    }
    
    // Religious/Spiritual activities
    if (titleLower.includes('temple') || titleLower.includes('church') || titleLower.includes('mosque') || titleLower.includes('spiritual')) {
      return 'https://images.pexels.com/photos/1624496/pexels-photo-1624496.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop';
    }
    
    // Viewpoint/Scenic activities
    if (titleLower.includes('view') || titleLower.includes('sunset') || titleLower.includes('scenic') || titleLower.includes('lookout')) {
      return 'https://images.pexels.com/photos/1761279/pexels-photo-1761279.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop';
    }
    
    // Default based on popular destinations
    if (locationLower.includes('paris')) {
      return 'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop';
    } else if (locationLower.includes('tokyo') || locationLower.includes('japan')) {
      return 'https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop';
    } else if (locationLower.includes('london')) {
      return 'https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop';
    } else if (locationLower.includes('rome') || locationLower.includes('italy')) {
      return 'https://images.pexels.com/photos/2064827/pexels-photo-2064827.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop';
    } else if (locationLower.includes('new york')) {
      return 'https://images.pexels.com/photos/466685/pexels-photo-466685.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop';
    }
    
    // Default travel image
    return 'https://images.pexels.com/photos/1252814/pexels-photo-1252814.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop';
  }

  private getRestaurantFallbackImage(cuisine: string): string {
    const cuisineLower = cuisine.toLowerCase();
    
    // Cuisine-specific fallback images
    if (cuisineLower.includes('indian')) {
      return 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400&h=200&fit=crop';
    }
    
    if (cuisineLower.includes('italian')) {
      return 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=400&h=200&fit=crop';
    }
    
    if (cuisineLower.includes('asian') || cuisineLower.includes('chinese') || cuisineLower.includes('japanese')) {
      return 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=400&h=200&fit=crop';
    }
    
    if (cuisineLower.includes('mediterranean')) {
      return 'https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=400&h=200&fit=crop';
    }
    
    if (cuisineLower.includes('american') || cuisineLower.includes('burger')) {
      return 'https://images.pexels.com/photos/70497/pexels-photo-70497.jpeg?auto=compress&cs=tinysrgb&w=400&h=200&fit=crop';
    }
    
    if (cuisineLower.includes('fine') || cuisineLower.includes('luxury')) {
      return 'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=400&h=200&fit=crop';
    }
    
    if (cuisineLower.includes('cafe') || cuisineLower.includes('coffee')) {
      return 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=400&h=200&fit=crop';
    }
    
    // Default restaurant image
    return 'https://images.pexels.com/photos/67468/pexels-photo-67468.jpeg?auto=compress&cs=tinysrgb&w=400&h=200&fit=crop';
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const placesService = new PlacesService();