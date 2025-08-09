export interface TravelInfo {
  destination: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  budget: 'Economy' | 'Premium' | 'Luxury';
  travelGroup: 'Family' | 'Solo' | 'Couple' | 'Friends';
  includeKids: boolean;
  includeElderly: boolean;
}

export interface TripPreferences {
  tripType: string[];
  cuisinePreferences: string[];
  dietaryRequirements: string[];
}

export interface TripPlan {
  id: string;
  travelInfo: TravelInfo;
  preferences: TripPreferences;
  itinerary: DayPlan[];
  createdAt: string;
}

export interface DayPlan {
  day: number;
  date: string;
  activities: Activity[];
  meals: MealPlan;
  travelTips?: string[];
}

export interface Activity {
  id: string;
  time: string;
  title: string;
  description: string;
  location: string;
  duration: string;
  travelTime?: string;
  transportMode?: string;
  funFact?: string;
  tips?: string[];
  budgetRange?: string;
  nearbyRestaurants?: string[];
  transportation?: string;
  isDeleted?: boolean;
  originalTimeSlot?: string;
}

export interface MealPlan {
  breakfast: MealSuggestion;
  lunch: MealSuggestion;
  dinner: MealSuggestion;
}

export interface MealSuggestion {
  restaurant: string;
  cuisine: string;
  location: string;
  priceRange: string;
  specialties: string[];
}

export interface TripMemory {
  id: string;
  destination: string;
  preferences: any;
  feedback: string;
  rating: number;
  createdAt: string;
}

export interface Destination {
  id: string;
  name: string;
  country: string;
  region: string;
  popular: boolean;
}