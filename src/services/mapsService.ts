interface MapImageOptions {
  width?: number;
  height?: number;
  zoom?: number;
  mapType?: 'roadmap' | 'satellite' | 'terrain' | 'hybrid';
  markers?: boolean;
}

class MapsService {
  private apiKey: string;
  private isConfigured: boolean;
  private baseUrl: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    this.baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
    this.isConfigured = !!this.apiKey && 
                       this.apiKey !== 'your_actual_google_maps_api_key_here' && 
                       this.apiKey !== 'AIzaSyCmxSMfFvDyYqp6jKlc-gOMjJ-GoehhtWY' &&
                       this.apiKey.length > 20 &&
                       this.apiKey.startsWith('AIza');
    
    console.log('🗺️ Google Maps Service Configuration:');
    console.log('- API Key present:', !!this.apiKey);
    console.log('- API Key length:', this.apiKey.length);
    console.log('- API Key format valid:', this.apiKey.startsWith('AIza'));
    console.log('- Is configured:', this.isConfigured);
    
    if (!this.isConfigured) {
      console.warn('⚠️ Google Maps API key invalid or not configured. Using fallback images.');
      console.warn('📝 Please set a valid VITE_GOOGLE_MAPS_API_KEY in your .env file');
    } else {
      console.log('✅ Google Maps Static API ready');
    }
  }

  isGoogleMapsConfigured(): boolean {
    return this.isConfigured;
  }

  generateStaticMapUrl(location: string, title: string, options: MapImageOptions = {}): string {
    console.log('🗺️ Generating map for:', { location, title, isConfigured: this.isConfigured });
    
    if (!this.isConfigured) {
      console.log('⚠️ Google Maps not configured, using fallback');
      return this.getFallbackImage(title, location);
    }

    const {
      width = 600,
      height = 400,
      zoom = 15,
      mapType = 'roadmap',
      markers = true
    } = options;

    // Clean and encode the location
    const cleanLocation = this.cleanLocation(location, title);
    const encodedLocation = encodeURIComponent(cleanLocation);

    let url = `${this.baseUrl}?`;
    url += `center=${encodedLocation}`;
    url += `&zoom=${zoom}`;
    url += `&size=${width}x${height}`;
    url += `&maptype=${mapType}`;
    url += `&scale=2`; // High DPI for better quality
    
    if (markers) {
      url += `&markers=color:red%7Clabel:📍%7C${encodedLocation}`;
    }
    
    // Add styling for better appearance
    url += `&style=feature:poi%7Celement:labels%7Cvisibility:on`;
    url += `&style=feature:landscape%7Celement:geometry%7Csaturation:-100`;
    
    url += `&key=${this.apiKey}`;

    console.log('🗺️ Generated Maps URL:', url);
    return url;
  }

  generateSearchUrl(location: string, title: string): string {
    const query = encodeURIComponent(`${title} ${location}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }

  private cleanLocation(location: string, title: string): string {
    // Combine title and location for better search results
    let searchQuery = `${title}, ${location}`;
    
    // Remove common prefixes and clean up
    searchQuery = searchQuery
      .replace(/^(Visit|Explore|Discover)\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    return searchQuery;
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
  generateMapVariations(location: string, title: string): {
    roadmap: string;
    satellite: string;
    terrain: string;
  } {
    return {
      roadmap: this.generateStaticMapUrl(location, title, { mapType: 'roadmap', zoom: 15 }),
      satellite: this.generateStaticMapUrl(location, title, { mapType: 'satellite', zoom: 16 }),
      terrain: this.generateStaticMapUrl(location, title, { mapType: 'terrain', zoom: 14 })
    };
  }
}

export const mapsService = new MapsService();
export type { MapImageOptions };