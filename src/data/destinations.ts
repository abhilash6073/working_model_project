import type { Destination } from '../types';

export const popularDestinations: Destination[] = [
  // Europe
  { id: '1', name: 'Paris', country: 'France', region: 'Europe', popular: true },
  { id: '4', name: 'London', country: 'UK', region: 'Europe', popular: true },
  { id: '5', name: 'Rome', country: 'Italy', region: 'Europe', popular: true },
  { id: '8', name: 'Barcelona', country: 'Spain', region: 'Europe', popular: true },
  { id: '16', name: 'Amsterdam', country: 'Netherlands', region: 'Europe', popular: true },
  { id: '17', name: 'Berlin', country: 'Germany', region: 'Europe', popular: true },
  { id: '18', name: 'Prague', country: 'Czech Republic', region: 'Europe', popular: true },
  { id: '19', name: 'Vienna', country: 'Austria', region: 'Europe', popular: true },
  { id: '20', name: 'Florence', country: 'Italy', region: 'Europe', popular: true },
  { id: '21', name: 'Santorini', country: 'Greece', region: 'Europe', popular: true },
  
  // Asia
  { id: '2', name: 'Tokyo', country: 'Japan', region: 'Asia', popular: true },
  { id: '6', name: 'Bangkok', country: 'Thailand', region: 'Asia', popular: true },
  { id: '11', name: 'Mumbai', country: 'India', region: 'Asia', popular: true },
  { id: '12', name: 'Delhi', country: 'India', region: 'Asia', popular: true },
  { id: '13', name: 'Goa', country: 'India', region: 'Asia', popular: true },
  { id: '14', name: 'Jaipur', country: 'India', region: 'Asia', popular: true },
  { id: '15', name: 'Kerala', country: 'India', region: 'Asia', popular: true },
  { id: '22', name: 'Kyoto', country: 'Japan', region: 'Asia', popular: true },
  { id: '23', name: 'Seoul', country: 'South Korea', region: 'Asia', popular: true },
  { id: '24', name: 'Singapore', country: 'Singapore', region: 'Asia', popular: true },
  { id: '25', name: 'Hong Kong', country: 'Hong Kong', region: 'Asia', popular: true },
  { id: '26', name: 'Bali', country: 'Indonesia', region: 'Asia', popular: true },
  
  // North America
  { id: '3', name: 'New York', country: 'USA', region: 'North America', popular: true },
  { id: '27', name: 'Los Angeles', country: 'USA', region: 'North America', popular: true },
  { id: '28', name: 'San Francisco', country: 'USA', region: 'North America', popular: true },
  { id: '29', name: 'Las Vegas', country: 'USA', region: 'North America', popular: true },
  { id: '30', name: 'Toronto', country: 'Canada', region: 'North America', popular: true },
  { id: '31', name: 'Vancouver', country: 'Canada', region: 'North America', popular: true },
  
  // Middle East & Africa
  { id: '7', name: 'Dubai', country: 'UAE', region: 'Middle East', popular: true },
  { id: '9', name: 'Istanbul', country: 'Turkey', region: 'Europe/Asia', popular: true },
  { id: '32', name: 'Cairo', country: 'Egypt', region: 'Africa', popular: true },
  { id: '33', name: 'Marrakech', country: 'Morocco', region: 'Africa', popular: true },
  
  // Oceania
  { id: '10', name: 'Sydney', country: 'Australia', region: 'Oceania', popular: true },
  { id: '34', name: 'Melbourne', country: 'Australia', region: 'Oceania', popular: true },
  { id: '35', name: 'Auckland', country: 'New Zealand', region: 'Oceania', popular: true },
  
  // South America
  { id: '36', name: 'Rio de Janeiro', country: 'Brazil', region: 'South America', popular: true },
  { id: '37', name: 'Buenos Aires', country: 'Argentina', region: 'South America', popular: true },
  { id: '38', name: 'Lima', country: 'Peru', region: 'South America', popular: true }
];

export const tripTypes = [
  { id: 'cultural', name: 'Cultural', icon: '🏛️', description: 'Museums, heritage sites, local traditions' },
  { id: 'adventure', name: 'Adventure', icon: '🏔️', description: 'Hiking, sports, outdoor activities' },
  { id: 'family', name: 'Family Friendly', icon: '👨‍👩‍👧‍👦', description: 'Kid-friendly activities and attractions' },
  { id: 'outdoors', name: 'Outdoors', icon: '🌲', description: 'Nature, parks, outdoor exploration' },
  { id: 'relaxed', name: 'Relaxed', icon: '🌴', description: 'Beaches, spas, leisurely pace' }
];

export const cuisineOptions = [
  { id: 'indian', name: 'Indian', icon: '🍛' },
  { id: 'asian', name: 'Asian', icon: '🍜' },
  { id: 'continental', name: 'Continental', icon: '🍝' },
  { id: 'local', name: 'Local Specialties', icon: '🥘' },
  { id: 'mediterranean', name: 'Mediterranean', icon: '🥗' },
  { id: 'american', name: 'American', icon: '🍔' }
];

export const dietaryOptions = [
  { id: 'veg', name: 'Vegetarian', icon: '🥬' },
  { id: 'nonveg', name: 'Non-Vegetarian', icon: '🍖' },
  { id: 'vegan', name: 'Vegan', icon: '🌱' },
  { id: 'halal', name: 'Halal', icon: '☪️' },
  { id: 'kosher', name: 'Kosher', icon: '✡️' },
  { id: 'jain', name: 'Jain Vegetarian', icon: '🕉️' }
];