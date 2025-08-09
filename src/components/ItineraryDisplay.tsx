import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Edit3, 
  Trash2, 
  Plus, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  Search,
  X,
  Star,
  Utensils,
  Bed,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { placesService } from '../services/placesService';
import { aiService } from '../services/aiService';
import { mapsService } from '../services/mapsService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { TripPlan, Activity } from '../types';

interface ItineraryDisplayProps {
  tripPlan: TripPlan;
  onEditTrip: () => void;
  onRegenerateDay: (dayNumber: number) => void;
  onDeleteActivity: (dayNumber: number, activityId: string) => void;
  onModifyActivity: (dayNumber: number, activityId: string, newActivity: any) => void;
  onAddActivity: (dayNumber: number, newActivity: any) => void;
  isRegenerating: boolean;
}

interface SearchResult {
  name: string;
  description: string;
  location: string;
  duration: string;
  budgetRange: string;
  funFact: string;
  tips: string[];
}

interface Hotel {
  name: string;
  rating: number;
  pricePerNight: string;
  amenities: string[];
  location: string;
  address: string;
  description: string;
}

const ItineraryDisplay: React.FC<ItineraryDisplayProps> = ({
  tripPlan,
  onEditTrip,
  onRegenerateDay,
  onDeleteActivity,
  onModifyActivity,
  onAddActivity,
  isRegenerating
}) => {
  const [expandedFunFacts, setExpandedFunFacts] = useState<Set<string>>(new Set());
  const [expandedTips, setExpandedTips] = useState<Set<string>>(new Set());
  const [activityImages, setActivityImages] = useState<{ [key: string]: string }>({});
  const [restaurantImages, setRestaurantImages] = useState<{ [key: string]: string }>({});
  const [hotelImages, setHotelImages] = useState<{ [key: string]: string }>({});
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [modifyingActivity, setModifyingActivity] = useState<{ dayNumber: number; activityId: string } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addToDay, setAddToDay] = useState<number>(1);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [currentHotelSet, setCurrentHotelSet] = useState(0);

  // Auto-rotate hotels every 4 seconds
  useEffect(() => {
    if (hotels.length > 3) {
      const interval = setInterval(() => {
        setCurrentHotelSet(prev => (prev + 1) % Math.ceil(hotels.length / 3));
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [hotels.length]);

  // Generate AI hotel recommendations
  useEffect(() => {
    const generateHotels = async () => {
      if (!tripPlan?.travelInfo?.destination) return;

      try {
        const aiHotels = await generateAIHotels(
          tripPlan.travelInfo.destination,
          tripPlan.travelInfo.budget,
          tripPlan.travelInfo.travelGroup
        );
        setHotels(aiHotels);

        // Load hotel images
        aiHotels.forEach(async (hotel) => {
          const imageKey = `hotel-${hotel.name}`;
          if (!hotelImages[imageKey]) {
            setLoadingImages(prev => new Set([...prev, imageKey]));
            try {
              const imageUrl = await placesService.getPlacePhoto(hotel.name, tripPlan.travelInfo.destination);
              setHotelImages(prev => ({ ...prev, [imageKey]: imageUrl }));
            } catch (error) {
              console.error('Failed to load hotel image:', error);
              setHotelImages(prev => ({ 
                ...prev, 
                [imageKey]: 'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop'
              }));
            } finally {
              setLoadingImages(prev => {
                const newSet = new Set(prev);
                newSet.delete(imageKey);
                return newSet;
              });
            }
          }
        });
      } catch (error) {
        console.error('Failed to generate hotels:', error);
      }
    };

    generateHotels();
  }, [tripPlan?.travelInfo?.destination, tripPlan?.travelInfo?.budget]);

  const generateAIHotels = async (destination: string, budget: string, travelGroup: string): Promise<Hotel[]> => {
    if (!aiService.isAIConfigured()) {
      return getFallbackHotels(destination, budget);
    }

    try {
      const systemPrompt = `You are a hotel recommendation expert. Suggest the best hotels in the destination based on budget and travel group.

CRITICAL: Return your response as valid JSON in this exact format:
{
  "hotels": [
    {
      "name": "Hotel Name",
      "rating": 4.5,
      "pricePerNight": "$120-180",
      "amenities": ["WiFi", "Pool", "Gym", "Restaurant"],
      "location": "City Center",
      "address": "123 Main Street, City",
      "description": "Brief description of the hotel"
    }
  ]
}

Requirements:
- Suggest 6 hotels total
- Include mix of budget-appropriate options
- All hotels should be real, well-reviewed properties
- Include accurate pricing in USD
- Focus on highly-rated hotels (4+ stars)
- Consider location convenience for tourists`;

      const userPrompt = `Recommend the best hotels in ${destination} for:
- Budget: ${budget}
- Travel Group: ${travelGroup}
- Looking for: Well-reviewed, convenient location, good amenities
- Need: 6 hotel recommendations with accurate details`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
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
            temperature: 0.3,
            maxOutputTokens: 2000
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      if (content) {
        try {
          let cleanContent = content.trim();
          if (cleanContent.startsWith('```json')) {
            cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (cleanContent.startsWith('```')) {
            cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }
          
          const parsed = JSON.parse(cleanContent);
          if (parsed.hotels && Array.isArray(parsed.hotels)) {
            return parsed.hotels.map(hotel => ({
              ...hotel,
              pricePerNight: convertToINR(hotel.pricePerNight, budget)
            }));
          }
        } catch (parseError) {
          console.error('Failed to parse AI hotel response:', parseError);
        }
      }
      
      throw new Error('Invalid AI response');
    } catch (error) {
      console.error('AI hotel generation failed:', error);
      return getFallbackHotels(destination, budget);
    }
  };

  const getFallbackHotels = (destination: string, budget: string): Hotel[] => {
    const budgetMultiplier = budget === 'Economy' ? 0.7 : budget === 'Luxury' ? 1.8 : 1.2;
    
    return [
      {
        name: `Grand ${destination} Hotel`,
        rating: 4.5,
        pricePerNight: `$${Math.round(120 * budgetMultiplier)}-${Math.round(180 * budgetMultiplier)} (₹${Math.round(120 * budgetMultiplier * 83)}-${Math.round(180 * budgetMultiplier * 83)})`,
        amenities: ['Free WiFi', 'Pool', 'Gym', 'Restaurant', 'Spa'],
        location: 'City Center',
        address: `123 Main Street, ${destination}`,
        description: `Luxury hotel in the heart of ${destination} with excellent amenities and service.`
      },
      {
        name: `${destination} Plaza`,
        rating: 4.2,
        pricePerNight: `$${Math.round(90 * budgetMultiplier)}-${Math.round(140 * budgetMultiplier)} (₹${Math.round(90 * budgetMultiplier * 83)}-${Math.round(140 * budgetMultiplier * 83)})`,
        amenities: ['Free WiFi', 'Restaurant', 'Room Service', 'Concierge'],
        location: 'Downtown',
        address: `456 Central Ave, ${destination}`,
        description: `Modern hotel with great location and comfortable accommodations.`
      },
      {
        name: `Heritage ${destination}`,
        rating: 4.7,
        pricePerNight: `$${Math.round(150 * budgetMultiplier)}-${Math.round(220 * budgetMultiplier)} (₹${Math.round(150 * budgetMultiplier * 83)}-${Math.round(220 * budgetMultiplier * 83)})`,
        amenities: ['Free WiFi', 'Pool', 'Spa', 'Fine Dining', 'Butler Service'],
        location: 'Historic District',
        address: `789 Heritage Lane, ${destination}`,
        description: `Historic luxury hotel with traditional architecture and modern amenities.`
      },
      {
        name: `${destination} Business Hotel`,
        rating: 4.0,
        pricePerNight: `$${Math.round(80 * budgetMultiplier)}-${Math.round(120 * budgetMultiplier)} (₹${Math.round(80 * budgetMultiplier * 83)}-${Math.round(120 * budgetMultiplier * 83)})`,
        amenities: ['Free WiFi', 'Business Center', 'Gym', 'Restaurant'],
        location: 'Business District',
        address: `321 Business Blvd, ${destination}`,
        description: `Perfect for business travelers with modern facilities and convenient location.`
      },
      {
        name: `${destination} Boutique`,
        rating: 4.3,
        pricePerNight: `$${Math.round(110 * budgetMultiplier)}-${Math.round(160 * budgetMultiplier)} (₹${Math.round(110 * budgetMultiplier * 83)}-${Math.round(160 * budgetMultiplier * 83)})`,
        amenities: ['Free WiFi', 'Rooftop Bar', 'Restaurant', 'Concierge'],
        location: 'Arts Quarter',
        address: `654 Arts Street, ${destination}`,
        description: `Stylish boutique hotel with unique design and personalized service.`
      },
      {
        name: `${destination} Resort`,
        rating: 4.6,
        pricePerNight: `$${Math.round(140 * budgetMultiplier)}-${Math.round(200 * budgetMultiplier)} (₹${Math.round(140 * budgetMultiplier * 83)}-${Math.round(200 * budgetMultiplier * 83)})`,
        amenities: ['Free WiFi', 'Pool', 'Spa', 'Multiple Restaurants', 'Beach Access'],
        location: 'Waterfront',
        address: `987 Waterfront Dr, ${destination}`,
        description: `Resort-style hotel with extensive facilities and beautiful waterfront location.`
      }
    ];
  };

  const convertToINR = (priceRange: string, budget: string): string => {
    const match = priceRange.match(/\$(\d+)-(\d+)/);
    if (match) {
      const [, min, max] = match;
      const minINR = Math.round(parseInt(min) * 83);
      const maxINR = Math.round(parseInt(max) * 83);
      return `$${min}-${max} (₹${minINR}-${maxINR})`;
    }
    return priceRange;
  };

  const openGoogleMaps = (query: string) => {
    const encodedQuery = encodeURIComponent(query);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedQuery}`, '_blank');
  };

  const toggleFunFact = (activityId: string) => {
    setExpandedFunFacts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(activityId)) {
        newSet.delete(activityId);
      } else {
        newSet.add(activityId);
      }
      return newSet;
    });
  };

  const toggleTips = (activityId: string) => {
    setExpandedTips(prev => {
      const newSet = new Set(prev);
      if (newSet.has(activityId)) {
        newSet.delete(activityId);
      } else {
        newSet.add(activityId);
      }
      return newSet;
    });
  };

  const loadActivityImage = async (activity: Activity) => {
    const imageKey = `${activity.id}-${activity.title}`;
    if (activityImages[imageKey] || loadingImages.has(imageKey)) return;

    setLoadingImages(prev => new Set([...prev, imageKey]));
    try {
      const imageUrl = await placesService.getPlacePhoto(activity.title, activity.location);
      setActivityImages(prev => ({ ...prev, [imageKey]: imageUrl }));
    } catch (error) {
      console.error('Failed to load activity image:', error);
    } finally {
      setLoadingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageKey);
        return newSet;
      });
    }
  };

  const loadRestaurantImage = async (restaurantName: string, location: string, cuisine: string) => {
    const imageKey = `restaurant-${restaurantName}-${location}`;
    if (restaurantImages[imageKey] || loadingImages.has(imageKey)) return;

    setLoadingImages(prev => new Set([...prev, imageKey]));
    try {
      const imageUrl = await placesService.getRestaurantPhoto(restaurantName, location, cuisine);
      setRestaurantImages(prev => ({ ...prev, [imageKey]: imageUrl }));
    } catch (error) {
      console.error('Failed to load restaurant image:', error);
    } finally {
      setLoadingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageKey);
        return newSet;
      });
    }
  };

  useEffect(() => {
    tripPlan.itinerary.forEach(day => {
      day.activities.forEach(activity => {
        loadActivityImage(activity);
      });
      
      // Load restaurant images
      loadRestaurantImage(day.meals.breakfast.restaurant, day.meals.breakfast.location, day.meals.breakfast.cuisine);
      loadRestaurantImage(day.meals.lunch.restaurant, day.meals.lunch.location, day.meals.lunch.cuisine);
      loadRestaurantImage(day.meals.dinner.restaurant, day.meals.dinner.location, day.meals.dinner.cuisine);
    });
  }, [tripPlan]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchActivities(searchQuery, tripPlan.travelInfo.destination);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const searchActivities = async (query: string, destination: string): Promise<SearchResult[]> => {
    if (!aiService.isAIConfigured()) {
      return getFallbackSearchResults(query, destination);
    }

    try {
      const systemPrompt = `You are a travel activity expert. Find real attractions and activities based on the user's search query.

CRITICAL: Return your response as valid JSON in this exact format:
{
  "activities": [
    {
      "name": "Activity Name",
      "description": "Detailed description of the activity",
      "location": "Specific location in the city",
      "duration": "2-3 hours",
      "budgetRange": "$15-30 (₹1,200-2,400)",
      "funFact": "Interesting fact about this place",
      "tips": ["Tip 1", "Tip 2", "Tip 3"]
    }
  ]
}

Requirements:
- Find 5-8 real activities that match the search query
- Include accurate locations within the destination
- Provide realistic budget ranges in USD and INR
- Generate interesting fun facts
- Include practical tips for visitors`;

      const userPrompt = `Find activities in ${destination} for: "${query}"

Consider:
- Real tourist attractions and activities
- Local experiences and hidden gems
- Activities that match the search intent
- Provide diverse options (indoor/outdoor, cultural/adventure, etc.)`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
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
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      if (content) {
        try {
          let cleanContent = content.trim();
          if (cleanContent.startsWith('```json')) {
            cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (cleanContent.startsWith('```')) {
            cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }
          
          const parsed = JSON.parse(cleanContent);
          if (parsed.activities && Array.isArray(parsed.activities)) {
            return parsed.activities;
          }
        } catch (parseError) {
          console.error('Failed to parse AI search response:', parseError);
        }
      }
      
      throw new Error('Invalid AI response');
    } catch (error) {
      console.error('AI search failed:', error);
      return getFallbackSearchResults(query, destination);
    }
  };

  const getFallbackSearchResults = (query: string, destination: string): SearchResult[] => {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('museum') || queryLower.includes('art')) {
      return [
        {
          name: `${destination} Art Museum`,
          description: `Explore the finest collection of local and international art in ${destination}'s premier museum.`,
          location: `${destination} Cultural District`,
          duration: '2-3 hours',
          budgetRange: '$12-25 (₹1,000-2,000)',
          funFact: `This museum houses over 5,000 artifacts and is considered one of ${destination}'s most important cultural institutions.`,
          tips: ['Visit during weekday mornings for fewer crowds', 'Audio guides available in multiple languages', 'Photography allowed in most areas']
        }
      ];
    }
    
    if (queryLower.includes('food') || queryLower.includes('restaurant')) {
      return [
        {
          name: `${destination} Food Tour`,
          description: `Discover the authentic flavors of ${destination} with a guided culinary journey through local markets and restaurants.`,
          location: `${destination} Food District`,
          duration: '3-4 hours',
          budgetRange: '$35-60 (₹2,800-5,000)',
          funFact: `This food tour visits 6 different locations and includes tastings of 12 traditional dishes.`,
          tips: ['Come hungry - lots of food included', 'Dietary restrictions can be accommodated', 'Wear comfortable walking shoes']
        }
      ];
    }
    
    return [
      {
        name: `${destination} Discovery Walk`,
        description: `Explore the highlights of ${destination} with this comprehensive walking tour covering major attractions.`,
        location: `${destination} City Center`,
        duration: '2-3 hours',
        budgetRange: '$20-40 (₹1,600-3,200)',
        funFact: `This route covers 8 major landmarks and has been walked by over 100,000 visitors.`,
        tips: ['Wear comfortable shoes', 'Bring water and sunscreen', 'Best time is early morning or late afternoon']
      }
    ];
  };

  const handleSelectActivity = async (result: SearchResult) => {
    const newActivity = {
      id: Date.now().toString(),
      time: '10:00 AM',
      title: result.name,
      description: result.description,
      location: result.location,
      duration: result.duration,
      travelTime: '15 minutes',
      transportMode: 'walking',
      funFact: result.funFact,
      tips: result.tips,
      budgetRange: result.budgetRange
    };

    if (modifyingActivity) {
      onModifyActivity(modifyingActivity.dayNumber, modifyingActivity.activityId, newActivity);
      setModifyingActivity(null);
    } else if (selectedDay) {
      onAddActivity(selectedDay, newActivity);
      setSelectedDay(null);
    }

    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const openModifySearch = (dayNumber: number, activityId: string) => {
    setModifyingActivity({ dayNumber, activityId });
    setShowSearchModal(true);
    setSearchQuery('');
    setSearchResults([]);
  };

  const openAddSearch = (dayNumber: number) => {
    setSelectedDay(dayNumber);
    setShowSearchModal(true);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleQuickSearch = (query: string) => {
    setSearchQuery(query);
    setTimeout(() => handleSearch(), 100);
  };

  const exportToPDF = async () => {
    const element = document.getElementById('itinerary-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });
      
      const imgData = canvas.getDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${tripPlan.travelInfo.destination}-itinerary.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
    }
  };

  const getCostRange = (priceRange: string): string => {
    switch (priceRange) {
      case '$':
        return '$5-15 (₹400-1,200)';
      case '$$':
        return '$15-35 (₹1,200-2,800)';
      case '$$$':
        return '$35-70 (₹2,800-5,600)';
      case '$$$$':
        return '$70-150 (₹5,600-12,000)';
      default:
        return priceRange;
    }
  };

  const generateMapUrl = (activities: Activity[]) => {
    if (activities.length === 0) return '';
    
    const waypoints = activities.map(activity => 
      encodeURIComponent(`${activity.title}, ${activity.location}`)
    ).join('|');
    
    return `https://www.google.com/maps/embed/v1/directions?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&origin=${encodeURIComponent(activities[0].title + ', ' + activities[0].location)}&destination=${encodeURIComponent(activities[activities.length - 1].title + ', ' + activities[activities.length - 1].location)}&waypoints=${waypoints}&mode=walking`;
  };

  const visibleHotels = hotels.slice(currentHotelSet * 3, (currentHotelSet + 1) * 3);
  const totalHotelSets = Math.ceil(hotels.length / 3);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Your {tripPlan.travelInfo.destination} Adventure
          </h1>
          <p className="text-gray-600">
            {tripPlan.travelInfo.numberOfDays} days • {tripPlan.travelInfo.budget} Budget • {tripPlan.travelInfo.travelGroup}
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
          <button
            onClick={onEditTrip}
            className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Edit Trip
          </button>
        </div>
      </div>

      {/* Hotel Recommendations Strip */}
      {hotels.length > 0 && (
        <div className="mb-8 bg-white rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Recommended Stays</h2>
            <div className="flex gap-2">
              {Array.from({ length: totalHotelSets }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentHotelSet(i)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    i === currentHotelSet ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {visibleHotels.map((hotel, index) => {
              const imageKey = `hotel-${hotel.name}`;
              const isLoadingImage = loadingImages.has(imageKey);
              const imageUrl = hotelImages[imageKey] || 'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop';
              
              return (
                <div
                  key={hotel.name}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-105"
                  onClick={() => openGoogleMaps(`${hotel.name} ${hotel.address}`)}
                >
                  <div className="relative h-48 overflow-hidden">
                    {isLoadingImage ? (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <img
                        src={imageUrl}
                        alt={hotel.name}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                      />
                    )}
                    <div className="absolute top-3 left-3 bg-black/70 text-white px-2 py-1 rounded-lg text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span>{hotel.rating}</span>
                      </div>
                    </div>
                    <div className="absolute top-3 right-3 bg-blue-600 text-white px-2 py-1 rounded-lg text-xs">
                      {hotel.location}
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-bold text-lg text-gray-800 mb-2">{hotel.name}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{hotel.description}</p>
                    
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-lg font-bold text-blue-600">{hotel.pricePerNight}</span>
                      <span className="text-sm text-gray-500">per night</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {hotel.amenities.slice(0, 3).map((amenity, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          {amenity}
                        </span>
                      ))}
                      {hotel.amenities.length > 3 && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                          +{hotel.amenities.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div id="itinerary-content" className="space-y-8">
        {tripPlan.itinerary.map((day, dayIndex) => (
          <div key={day.day} className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Day Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Day {day.day}</h2>
                  <p className="text-blue-100">
                    {new Date(day.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => openAddSearch(day.day)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Activity
                  </button>
                  <button
                    onClick={() => onRegenerateDay(day.day)}
                    disabled={isRegenerating}
                    className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isRegenerating ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      '🔄'
                    )}
                    Regenerate Day
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Google Maps */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Day {day.day} Route</h3>
                <div className="w-full h-64 rounded-xl overflow-hidden shadow-md">
                  <iframe
                    src={generateMapUrl(day.activities)}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* Activities */}
              <div className="space-y-6">
                {day.activities.map((activity, activityIndex) => {
                  const imageKey = `${activity.id}-${activity.title}`;
                  const isLoadingImage = loadingImages.has(imageKey);
                  const imageUrl = activityImages[imageKey];
                  
                  return (
                    <div key={activity.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                      <div className="flex gap-6">
                        {/* Activity Image */}
                        <div className="w-48 h-32 flex-shrink-0 rounded-lg overflow-hidden">
                          {isLoadingImage ? (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                              <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          ) : imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={activity.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                              <MapPin className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* Activity Details */}
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <span className="flex items-center gap-1 text-sm text-blue-600 font-medium">
                                  <Clock className="w-4 h-4" />
                                  {activity.time}
                                </span>
                                <span className="text-sm text-gray-500">• {activity.duration}</span>
                              </div>
                              <h3 
                                className="text-xl font-bold text-gray-800 mb-2 cursor-pointer hover:text-blue-600 transition-colors"
                                onClick={() => openGoogleMaps(`${activity.title} ${activity.location}`)}
                              >
                                {activity.title}
                              </h3>
                              <p 
                                className="text-gray-600 mb-2 cursor-pointer hover:text-blue-600 transition-colors"
                                onClick={() => openGoogleMaps(`${activity.title} ${activity.location}`)}
                              >
                                <MapPin className="w-4 h-4 inline mr-1" />
                                {activity.location}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => openModifySearch(day.day, activity.id)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Modify Activity"
                              >
                                <Search className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onDeleteActivity(day.day, activity.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Activity"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <p className="text-gray-700 mb-4">{activity.description}</p>

                          {activity.budgetRange && (
                            <div className="mb-4">
                              <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                                💰 {activity.budgetRange}
                              </span>
                            </div>
                          )}

                          {/* Fun Fact */}
                          {activity.funFact && (
                            <div className="mb-4">
                              <button
                                onClick={() => toggleFunFact(activity.id)}
                                className="flex items-center gap-2 w-full p-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors text-left"
                              >
                                <span className="text-lg">💡</span>
                                <span className="font-medium text-yellow-800">Fun Fact</span>
                                {expandedFunFacts.has(activity.id) ? (
                                  <ChevronUp className="w-4 h-4 text-yellow-600 ml-auto" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-yellow-600 ml-auto" />
                                )}
                              </button>
                              {expandedFunFacts.has(activity.id) && (
                                <div className="mt-2 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                                  <p className="text-yellow-800 text-sm">{activity.funFact}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Pro Tips */}
                          {activity.tips && activity.tips.length > 0 && (
                            <div>
                              <button
                                onClick={() => toggleTips(activity.id)}
                                className="flex items-center gap-2 w-full p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-left"
                              >
                                <span className="text-lg">ℹ️</span>
                                <span className="font-medium text-green-800">
                                  Pro Tips ({activity.tips.length})
                                </span>
                                {expandedTips.has(activity.id) ? (
                                  <ChevronUp className="w-4 h-4 text-green-600 ml-auto" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-green-600 ml-auto" />
                                )}
                              </button>
                              {expandedTips.has(activity.id) && (
                                <div className="mt-2 p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                                  <ul className="space-y-1">
                                    {activity.tips.map((tip, tipIndex) => (
                                      <li key={tipIndex} className="text-green-800 text-sm flex items-start gap-2">
                                        <span className="text-green-600 mt-1">•</span>
                                        <span>{tip}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Meals */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Utensils className="w-5 h-5" />
                  Today's Dining
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { meal: 'breakfast', icon: '🌅', label: 'Breakfast' },
                    { meal: 'lunch', icon: '☀️', label: 'Lunch' },
                    { meal: 'dinner', icon: '🌙', label: 'Dinner' }
                  ].map(({ meal, icon, label }) => {
                    const mealData = day.meals[meal as keyof typeof day.meals];
                    const imageKey = `restaurant-${mealData.restaurant}-${mealData.location}`;
                    const isLoadingImage = loadingImages.has(imageKey);
                    const imageUrl = restaurantImages[imageKey];
                    
                    return (
                      <div 
                        key={meal} 
                        className="bg-gray-50 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => openGoogleMaps(`${mealData.restaurant} ${mealData.location}`)}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg">{icon}</span>
                          <span className="font-medium text-gray-800">{label}</span>
                          <span className="ml-auto bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                            Popular
                          </span>
                        </div>
                        
                        {/* Restaurant Image */}
                        <div className="w-full h-24 rounded-lg overflow-hidden mb-3">
                          {isLoadingImage ? (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          ) : imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={mealData.restaurant}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                              <Utensils className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        
                        <h4 className="font-semibold text-gray-800 mb-1">{mealData.restaurant}</h4>
                        <p className="text-sm text-gray-600 mb-2">{mealData.cuisine} • {mealData.location}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-green-600">
                            {getCostRange(mealData.priceRange)}
                          </span>
                          <span className="text-xs text-gray-500">Click to view</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Travel Tips */}
              {day.travelTips && day.travelTips.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                  <h4 className="font-semibold text-blue-800 mb-2">💡 Travel Tips for Day {day.day}</h4>
                  <ul className="space-y-1">
                    {day.travelTips.map((tip, index) => (
                      <li key={index} className="text-blue-700 text-sm flex items-start gap-2">
                        <span className="text-blue-500 mt-1">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Floating Add Activity Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 z-40 flex items-center justify-center"
      >
        <Plus className="w-8 h-8" />
      </button>

      {/* Add Activity Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Add Activity</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Day
                </label>
                <select
                  value={addToDay}
                  onChange={(e) => setAddToDay(parseInt(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {tripPlan.itinerary.map(day => (
                    <option key={day.day} value={day.day}>
                      Day {day.day} - {new Date(day.date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={() => {
                  setSelectedDay(addToDay);
                  setShowAddModal(false);
                  setShowSearchModal(true);
                }}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Search Activities
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  {modifyingActivity ? 'Replace Activity' : `Add Activity to Day ${selectedDay}`}
                </h3>
                <button
                  onClick={() => {
                    setShowSearchModal(false);
                    setModifyingActivity(null);
                    setSelectedDay(null);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="What would you like to do? (e.g., visit museums, food tour, shopping)"
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
                <button
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || isSearching}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSearching ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {['Museums & Art', 'Food Tours', 'Shopping', 'Nature & Parks', 'Historical Sites', 'Adventure Activities'].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => handleQuickSearch(suggestion)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-full transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="p-6 max-h-96 overflow-y-auto">
              {isSearching ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">AI is finding the best activities for you...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-4">
                  {searchResults.map((result, index) => (
                    <div
                      key={index}
                      onClick={() => handleSelectActivity(result)}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all"
                    >
                      <h4 className="font-semibold text-gray-800 mb-2">{result.name}</h4>
                      <p className="text-gray-600 text-sm mb-2">{result.description}</p>
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>📍 {result.location}</span>
                        <span>⏱️ {result.duration}</span>
                        <span>💰 {result.budgetRange}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchQuery && !isSearching ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No activities found. Try a different search term.</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">Search for activities to add to your itinerary</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItineraryDisplay;