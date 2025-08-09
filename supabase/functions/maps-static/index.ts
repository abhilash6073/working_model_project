import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface MapRequest {
  location: string;
  title: string;
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('🗺️ Maps Static Edge Function called')
  console.log('📝 Request method:', req.method)
  console.log('🔑 Environment check - GOOGLE_MAPS_API_KEY present:', !!Deno.env.get('GOOGLE_MAPS_API_KEY'))

  try {
    const { 
      location, 
      title, 
      width = 600, 
      height = 400, 
      zoom = 15, 
      mapType = 'roadmap', 
      markers = true 
    }: MapRequest = await req.json()
    
    console.log('🔍 Processing map request:', { location, title, width, height, zoom, mapType, markers })

    // Get Google Maps API key from environment
    const mapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
    
    if (!mapsApiKey) {
      console.error('❌ GOOGLE_MAPS_API_KEY not found in Supabase environment variables')
      console.error('📋 Please add GOOGLE_MAPS_API_KEY in Supabase Dashboard → Settings → Edge Functions → Environment Variables')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Google Maps API key not configured in Supabase environment',
          fallbackUrl: getFallbackImage(title, location),
          source: 'fallback'
        } as MapResponse),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    try {
      // Clean and encode the location
      const cleanLocation = cleanLocationQuery(location, title)
      const encodedLocation = encodeURIComponent(cleanLocation)

      // Build Google Maps Static API URL
      let mapUrl = `https://maps.googleapis.com/maps/api/staticmap?`
      mapUrl += `center=${encodedLocation}`
      mapUrl += `&zoom=${zoom}`
      mapUrl += `&size=${width}x${height}`
      mapUrl += `&maptype=${mapType}`
      mapUrl += `&scale=2` // High DPI for better quality
      
      if (markers) {
        mapUrl += `&markers=color:red%7Clabel:📍%7C${encodedLocation}`
      }
      
      // Add styling for better appearance
      mapUrl += `&style=feature:poi%7Celement:labels%7Cvisibility:on`
      mapUrl += `&style=feature:landscape%7Celement:geometry%7Csaturation:-100`
      
      mapUrl += `&key=${mapsApiKey}`

      console.log('🗺️ Generated Maps URL (truncated):', mapUrl.substring(0, 100) + '...')

      // Test the URL by making a request
      const mapResponse = await fetch(mapUrl)
      
      if (!mapResponse.ok) {
        if (mapResponse.status === 403) {
          throw new Error('API key invalid or Maps Static API not enabled')
        } else if (mapResponse.status === 429) {
          throw new Error('Maps API quota exceeded')
        } else {
          throw new Error(`Maps API error: ${mapResponse.status}`)
        }
      }

      // Get the image data
      const imageBlob = await mapResponse.blob()
      console.log('✅ Successfully fetched map image for:', cleanLocation)
      
      // Return the raw image data with CORS headers
      return new Response(imageBlob, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': mapResponse.headers.get('Content-Type') || 'image/png',
        },
      })

    } catch (apiError) {
      console.error('🚨 Google Maps API error:', apiError)
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `Maps API Error: ${apiError.message}`,
          fallbackUrl: getFallbackImage(title, location),
          source: 'fallback'
        } as MapResponse),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

  } catch (error) {
    console.error('❌ Server error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Server error',
        fallbackUrl: getFallbackImage('', ''),
        source: 'fallback'
      } as MapResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

function cleanLocationQuery(location: string, title: string): string {
  // Combine title and location for better search results
  let searchQuery = `${title}, ${location}`
  
  // Remove common prefixes and clean up
  searchQuery = searchQuery
    .replace(/^(Visit|Explore|Discover)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  return searchQuery
}

function getFallbackImage(title: string, location: string): string {
  const titleLower = title.toLowerCase()
  const locationLower = location.toLowerCase()
  
  // Enhanced fallback images based on activity type
  if (titleLower.includes('museum') || titleLower.includes('art') || titleLower.includes('cultural') || titleLower.includes('heritage')) {
    return 'https://images.pexels.com/photos/1174732/pexels-photo-1174732.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop'
  }
  
  if (titleLower.includes('market') || titleLower.includes('shopping') || titleLower.includes('bazaar')) {
    return 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop'
  }
  
  if (titleLower.includes('food') || titleLower.includes('restaurant') || titleLower.includes('dining') || titleLower.includes('cooking')) {
    return 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop'
  }
  
  if (titleLower.includes('park') || titleLower.includes('garden') || titleLower.includes('nature') || titleLower.includes('outdoor')) {
    return 'https://images.pexels.com/photos/1761279/pexels-photo-1761279.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop'
  }
  
  if (titleLower.includes('temple') || titleLower.includes('church') || titleLower.includes('mosque') || titleLower.includes('spiritual')) {
    return 'https://images.pexels.com/photos/1624496/pexels-photo-1624496.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop'
  }
  
  if (titleLower.includes('view') || titleLower.includes('sunset') || titleLower.includes('scenic') || titleLower.includes('lookout')) {
    return 'https://images.pexels.com/photos/1761279/pexels-photo-1761279.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop'
  }
  
  // Default based on popular destinations
  if (locationLower.includes('paris')) {
    return 'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop'
  } else if (locationLower.includes('tokyo') || locationLower.includes('japan')) {
    return 'https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop'
  } else if (locationLower.includes('london')) {
    return 'https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop'
  } else if (locationLower.includes('rome') || locationLower.includes('italy')) {
    return 'https://images.pexels.com/photos/2064827/pexels-photo-2064827.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop'
  } else if (locationLower.includes('new york')) {
    return 'https://images.pexels.com/photos/466685/pexels-photo-466685.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop'
  }
  
  // Default travel image
  return 'https://images.pexels.com/photos/1252814/pexels-photo-1252814.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop'
}