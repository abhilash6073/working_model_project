import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface PlacePhotoRequest {
  query: string;
  activityTitle: string;
  location: string;
  photoType?: 'activity' | 'restaurant';
  maxWidth?: number;
  maxHeight?: number;
}

interface PlacePhotoResponse {
  success: boolean;
  photoUrl?: string;
  fallbackUrl?: string;
  error?: string;
  source: 'google_places' | 'fallback';
  searchQueries?: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('🚀 Places Photos Edge Function called')
  console.log('📝 Request method:', req.method)
  console.log('🔑 Environment check - GOOGLE_PLACES_API_KEY present:', !!Deno.env.get('GOOGLE_PLACES_API_KEY'))

  try {
    const { query, activityTitle, location, photoType = 'activity', maxWidth = 800, maxHeight = 500 }: PlacePhotoRequest = await req.json()
    
    console.log('🔍 Processing request:', { query, activityTitle, location, photoType, maxWidth, maxHeight })

    // Get Google Places API key from environment
    const placesApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
    
    if (!placesApiKey) {
      console.error('❌ GOOGLE_PLACES_API_KEY not found in Supabase environment variables')
      console.error('📋 Please add GOOGLE_PLACES_API_KEY in Supabase Dashboard → Settings → Edge Functions → Environment Variables')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Google Places API key not configured in Supabase environment',
          fallbackUrl: getFallbackImage(activityTitle, location),
          source: 'fallback'
        } as PlacePhotoResponse),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    try {
      // Step 1: Find place using Find Place API
      // Try multiple search strategies for better results
      const searchQueries = [
        query, // Original query
        `${activityTitle} ${location}`, // Activity + location
        activityTitle, // Just the activity title
        location // Just the location
      ]
      
      let placeId = null
      let placeName = null
      
      for (const searchQuery of searchQueries) {
        console.log('📍 Trying search query:', searchQuery)
        
        const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(searchQuery)}&inputtype=textquery&fields=place_id,name,formatted_address,types&key=${placesApiKey}`
      
        const findPlaceResponse = await fetch(findPlaceUrl)
        
        if (!findPlaceResponse.ok) {
          console.log('📍 API error for query:', searchQuery, 'Status:', findPlaceResponse.status)
          continue
        }
        
        const findPlaceData = await findPlaceResponse.json()
        console.log('📍 API response for query:', searchQuery, 'Candidates:', findPlaceData.candidates?.length || 0)
        
        if (findPlaceData.candidates && findPlaceData.candidates.length > 0) {
          placeId = findPlaceData.candidates[0].place_id
          placeName = findPlaceData.candidates[0].name
          console.log('📍 Found place:', placeName, 'ID:', placeId, 'Query:', searchQuery)
          break
        }
      }

      if (!placeId) {
        console.log('📍 No place found for any search query')
        return new Response(
          JSON.stringify({
            success: false,
            error: `No place found for "${activityTitle}" in "${location}"`,
            fallbackUrl: getFallbackImage(activityTitle, location),
            source: 'fallback',
            searchQueries: searchQueries
          } as PlacePhotoResponse),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      // Step 2: Get place details with photos
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photo&key=${placesApiKey}`
      
      const detailsResponse = await fetch(detailsUrl)
      
      if (!detailsResponse.ok) {
        throw new Error(`Place Details API error: ${detailsResponse.status}`)
      }
      
      const detailsData = await detailsResponse.json()
      
      if (!detailsData.result?.photos || detailsData.result.photos.length === 0) {
        console.log('📸 No photos available for place:', placeName)
        return new Response(
          JSON.stringify({
            success: false,
            error: 'No photos available',
            fallbackUrl: getFallbackImage(activityTitle, location),
            source: 'fallback'
          } as PlacePhotoResponse),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      // Step 3: Get photo URL
      const photoReference = detailsData.result.photos[0].photo_reference
      // Use larger dimensions and better cropping for main activity photos
      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&maxheight=${maxHeight}&photo_reference=${photoReference}&key=${placesApiKey}`
      
      console.log('📸 Fetching photo data for:', placeName)
      
      // Fetch the actual image data from Google to bypass CORS issues
      const imageResponse = await fetch(photoUrl)
      
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`)
      }
      
      const imageBlob = await imageResponse.blob()
      console.log('📸 Successfully fetched image blob for:', placeName)
      
      // Return the raw image data with CORS headers
      return new Response(imageBlob, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': imageResponse.headers.get('Content-Type') || 'image/jpeg',
        },
      })

    } catch (apiError) {
      console.error('🚨 Google Places API error:', apiError)
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `API Error: ${apiError.message}`,
          fallbackUrl: getFallbackImage(activityTitle, location),
          source: 'fallback'
        } as PlacePhotoResponse),
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
        fallbackUrl: 'https://images.pexels.com/photos/1252814/pexels-photo-1252814.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
        source: 'fallback'
      } as PlacePhotoResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

// Enhanced fallback function with better activity-specific images
function getFallbackImage(activityTitle: string, location: string): string {
  const titleLower = activityTitle.toLowerCase()
  const locationLower = location.toLowerCase()
  
  // Enhanced historical/heritage sites with better resolution
  // Historical/Heritage sites
  if (titleLower.includes('historical') || titleLower.includes('heritage') || titleLower.includes('monument') || 
      titleLower.includes('fort') || titleLower.includes('palace') || titleLower.includes('castle') ||
      titleLower.includes('gateway') || titleLower.includes('arch') || titleLower.includes('tomb')) {
    return 'https://images.pexels.com/photos/2064827/pexels-photo-2064827.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop'
  }
  
  // Enhanced museum images
  // Museums and Cultural sites
  if (titleLower.includes('museum') || titleLower.includes('art') || titleLower.includes('cultural') || 
      titleLower.includes('gallery') || titleLower.includes('exhibition')) {
    return 'https://images.pexels.com/photos/1174732/pexels-photo-1174732.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop'
  }
  
  // Enhanced market images
  // Markets and Shopping
  if (titleLower.includes('market') || titleLower.includes('shopping') || titleLower.includes('bazaar') || 
      titleLower.includes('causeway') || titleLower.includes('street') || titleLower.includes('souk')) {
    return 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop'
  }
  
  // Enhanced food images
  // Food and Dining
  if (titleLower.includes('food') || titleLower.includes('restaurant') || titleLower.includes('dining') || 
      titleLower.includes('cooking') || titleLower.includes('cafe') || titleLower.includes('kitchen')) {
    return 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop'
  }
  
  // Enhanced nature images
  // Nature and Parks
  if (titleLower.includes('park') || titleLower.includes('garden') || titleLower.includes('nature') || 
      titleLower.includes('outdoor') || titleLower.includes('beach') || titleLower.includes('lake')) {
    return 'https://images.pexels.com/photos/1761279/pexels-photo-1761279.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop'
  }
  
  // Enhanced religious site images
  // Religious sites
  if (titleLower.includes('temple') || titleLower.includes('church') || titleLower.includes('mosque') || 
      titleLower.includes('spiritual') || titleLower.includes('cathedral') || titleLower.includes('shrine')) {
    return 'https://images.pexels.com/photos/1624496/pexels-photo-1624496.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop'
  }
  
  // Enhanced viewpoint images
  // Viewpoints and Scenic spots
  if (titleLower.includes('view') || titleLower.includes('sunset') || titleLower.includes('scenic') || 
      titleLower.includes('lookout') || titleLower.includes('tower') || titleLower.includes('hill')) {
    return 'https://images.pexels.com/photos/1761279/pexels-photo-1761279.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop'
  }
  
  // Location-specific images
  if (locationLower.includes('mumbai') || locationLower.includes('bombay')) {
    if (titleLower.includes('gateway')) {
      return 'https://images.pexels.com/photos/3573382/pexels-photo-3573382.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop'
    }
    return 'https://images.pexels.com/photos/1007426/pexels-photo-1007426.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop'
  }
  
  if (locationLower.includes('delhi')) {
    return 'https://images.pexels.com/photos/789750/pexels-photo-789750.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop'
  }
  
  if (locationLower.includes('paris')) {
    return 'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop'
  }
  
  // Default travel image
  return 'https://images.pexels.com/photos/1252814/pexels-photo-1252814.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop'
}