import type { TripPlan, DayPlan, Activity } from '../types';

export const generateComprehensiveActivity = (
  day: number,
  destination: string,
  suggestionDetails?: {
    title: string;
    description?: string;
    activityType?: string;
  }
): Activity => {
  const title = suggestionDetails?.title || `${destination} Experience`;
  const activityType = suggestionDetails?.activityType || 'general';
  const titleLower = title.toLowerCase();
  
  // Generate budget range based on activity type
  let budgetRange = '₹1,500-3,000 ($18-36)';
  if (titleLower.includes('museum') || titleLower.includes('art')) {
    budgetRange = '₹500-1,500 ($6-18)';
  } else if (titleLower.includes('food') || titleLower.includes('restaurant')) {
    budgetRange = '₹800-2,500 ($10-30)';
  } else if (titleLower.includes('adventure') || titleLower.includes('tour')) {
    budgetRange = '₹2,000-5,000 ($24-60)';
  } else if (titleLower.includes('shopping') || titleLower.includes('market')) {
    budgetRange = '₹1,000-4,000 ($12-48)';
  }

  // Generate nearby restaurants based on activity type
  let nearbyRestaurants = [
    `Local Café near ${title}`,
    `Traditional Restaurant`,
    `Quick Bites Corner`,
    `Heritage Dining`
  ];
  
  if (titleLower.includes('museum') || titleLower.includes('art')) {
    nearbyRestaurants = [
      `Museum Café`,
      `Artisan Coffee House`,
      `Cultural District Bistro`,
      `Heritage Tea Room`
    ];
  } else if (titleLower.includes('market') || titleLower.includes('shopping')) {
    nearbyRestaurants = [
      `Market Food Court`,
      `Street Food Stalls`,
      `Local Snack Bar`,
      `Traditional Sweets Shop`
    ];
  } else if (titleLower.includes('temple') || titleLower.includes('religious')) {
    nearbyRestaurants = [
      `Temple Prasadam Counter`,
      `Vegetarian Restaurant`,
      `Pure Veg Thali Place`,
      `Sacred Food Court`
    ];
  }

  // Generate transportation options
  const transportation = titleLower.includes('remote') || titleLower.includes('hill') 
    ? 'Taxi/Private car recommended, 30-45 min from city center'
    : titleLower.includes('center') || titleLower.includes('downtown')
    ? 'Walking distance, Metro/Bus available, Auto-rickshaw'
    : 'Metro/Bus + 10 min walk, Auto-rickshaw, Taxi';

  // Generate enhanced description
  const description = suggestionDetails?.description || 
    `Experience the best of ${destination} with this carefully curated activity. Immerse yourself in local culture, discover hidden gems, and create unforgettable memories in one of the city's most captivating locations.`;

  // Generate fun fact based on activity type
  let funFact = `This location in ${destination} attracts thousands of visitors annually and offers unique insights into local culture.`;
  if (titleLower.includes('museum')) {
    funFact = `This museum houses over 5,000 artifacts and is considered one of ${destination}'s most important cultural institutions.`;
  } else if (titleLower.includes('market')) {
    funFact = `This traditional market has been operating for over 100 years and is where locals still do their daily shopping.`;
  } else if (titleLower.includes('temple')) {
    funFact = `This sacred site is over 500 years old and showcases exquisite architecture from the region's golden period.`;
  }

  // Generate tips based on activity type
  let tips = [
    'Visit during early morning or late afternoon for best experience',
    'Carry water and wear comfortable walking shoes',
    'Photography allowed in most areas',
    'Local guides available for detailed insights'
  ];
  
  if (titleLower.includes('museum')) {
    tips = [
      'Audio guides available in multiple languages',
      'Student discounts available with valid ID',
      'Photography restrictions may apply in some sections',
      'Museum shop has unique souvenirs'
    ];
  } else if (titleLower.includes('market')) {
    tips = [
      'Bargaining is expected and welcomed',
      'Carry cash for small purchases',
      'Try local street food specialties',
      'Keep valuables secure in crowded areas'
    ];
  } else if (titleLower.includes('food')) {
    tips = [
      'Make reservations in advance',
      'Ask about daily specials',
      'Dietary restrictions can be accommodated',
      'Tipping 10-15% is customary'
    ];
  }

  return {
    id: `${day}-${Date.now()}`,
    time: '10:00 AM',
    title,
    description,
    location: `${destination}`,
    duration: '2-3 hours',
    travelTime: '15 minutes',
    transportMode: 'walking',
    funFact,
    tips,
    budgetRange,
    nearbyRestaurants,
    transportation
  };
};

export const generateMockItinerary = (travelInfo: any, preferences: any): TripPlan => {
  const itinerary: DayPlan[] = [];
  const startDate = new Date(travelInfo.startDate);
  
  for (let i = 0; i < travelInfo.numberOfDays; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    
    const dayPlan: DayPlan = {
      day: i + 1,
      date: currentDate.toISOString().split('T')[0],
      activities: generateDayActivities(i + 1, travelInfo.destination, preferences),
      meals: {
        breakfast: {
          restaurant: `Local Cafe ${i + 1}`,
          cuisine: 'Local',
          location: `${travelInfo.destination} Downtown`,
          priceRange: '$$',
          specialties: ['Fresh pastries', 'Local coffee', 'Traditional breakfast']
        },
        lunch: {
          restaurant: `Heritage Restaurant ${i + 1}`,
          cuisine: preferences.cuisinePreferences[0] || 'Local',
          location: `Near attractions`,
          priceRange: travelInfo.budget === 'Economy' ? '$' : travelInfo.budget === 'Premium' ? '$$' : '$$$',
          specialties: ['Regional specialties', 'Fresh ingredients', 'Authentic flavors']
        },
        dinner: {
          restaurant: `Fine Dining ${i + 1}`,
          cuisine: preferences.cuisinePreferences[1] || 'Continental',
          location: `${travelInfo.destination} Center`,
          priceRange: travelInfo.budget === 'Economy' ? '$$' : travelInfo.budget === 'Premium' ? '$$$' : '$$$$',
          specialties: ['Chef specials', 'Wine pairing', 'Romantic ambiance']
        }
      },
      travelTips: [
        'Carry local currency for small vendors',
        'Download offline maps for navigation',
        'Respect local customs and dress codes',
        'Stay hydrated and use sunscreen'
      ]
    };
    
    itinerary.push(dayPlan);
  }

  return {
    id: Date.now().toString(),
    travelInfo,
    preferences,
    itinerary,
    createdAt: new Date().toISOString()
  };
};

const generateDayActivities = (day: number, destination: string, preferences: any): Activity[] => {
  const activities: Activity[] = [
    {
      id: `${day}-1`,
      time: '9:00 AM',
      title: `${destination} Historical Center`,
      description: `Explore the historic heart of ${destination} with guided walking tour through ancient streets, visiting iconic landmarks and learning about local culture and history.`,
      location: `${destination} Old Town`,
      duration: '2.5 hours',
      travelTime: '15 minutes',
      transportMode: 'walking',
      funFact: `The historic center of ${destination} dates back over 800 years and contains some of the best-preserved medieval architecture in the region.`,
      tips: [
        'Start early to avoid crowds',
        'Wear comfortable walking shoes',
        'Bring a camera for stunning architecture photos',
        'Consider hiring a local guide for deeper insights'
      ]
    },
    {
      id: `${day}-2`,
      time: '12:30 PM',
      title: 'Local Market Experience',
      description: 'Immerse yourself in local culture at the bustling traditional market. Sample local delicacies, interact with friendly vendors, and discover unique handcrafted souvenirs.',
      location: 'Central Market Square',
      duration: '1.5 hours',
      travelTime: '10 minutes',
      transportMode: 'walking',
      funFact: 'This market has been operating continuously for over 300 years and is where locals still do their daily shopping.',
      tips: [
        'Bring cash for small purchases',
        'Try the local street food specialties',
        'Practice basic local greetings',
        'Bargaining is expected and welcomed'
      ]
    },
    {
      id: `${day}-3`,
      time: '3:00 PM',
      title: `${destination} Art Museum`,
      description: 'Discover an impressive collection of local and international artworks spanning centuries. The museum features contemporary exhibitions alongside permanent classical collections.',
      location: 'Museum District',
      duration: '2 hours',
      travelTime: '20 minutes',
      transportMode: 'taxi',
      funFact: 'The museum houses the world\'s largest collection of regional artists from the 18th century.',
      tips: [
        'Audio guides available in multiple languages',
        'Photography allowed in most areas',
        'Student discounts available with ID',
        'Museum cafe serves excellent local pastries'
      ]
    },
    {
      id: `${day}-4`,
      time: '6:00 PM',
      title: 'Sunset Viewpoint',
      description: 'End your day with breathtaking panoramic views of the city from the famous viewpoint. Watch the golden hour transform the cityscape into a magical landscape.',
      location: 'Hilltop Viewpoint',
      duration: '1 hour',
      travelTime: '25 minutes',
      transportMode: 'metro',
      funFact: 'This viewpoint offers 360-degree views and is considered one of the most romantic spots in the city.',
      tips: [
        'Arrive 30 minutes before sunset',
        'Bring a light jacket as it gets windy',
        'Perfect spot for proposals or special moments',
        'Small cafe serves hot beverages'
      ]
    }
  ];

  // Customize activities based on preferences
  if (preferences.tripType.includes('adventure')) {
    activities.push({
      id: `${day}-5`,
      time: '8:00 PM',
      title: 'Night Adventure Tour',
      description: 'Experience the city\'s nightlife with a guided adventure tour including night photography, local pubs, and hidden gems that come alive after dark.',
      location: 'Entertainment District',
      duration: '2 hours',
      travelTime: '15 minutes',
      transportMode: 'walking',
      funFact: 'The night tour reveals secret passages and underground tunnels used by locals for centuries.',
      tips: [
        'Wear comfortable shoes for walking',
        'Bring a light jacket',
        'Camera recommended for night shots',
        'Tour includes welcome drink'
      ]
    });
  }

  return activities;
};