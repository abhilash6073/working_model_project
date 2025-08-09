import type { TripMemory } from '../types';

interface UserProfile {
  id: string;
  preferences: {
    favoriteDestinations: string[];
    preferredBudget: string;
    travelStyle: string[];
    cuisinePreferences: string[];
    dietaryRequirements: string[];
  };
  travelHistory: TripMemory[];
  insights: {
    totalTrips: number;
    favoriteRegion: string;
    averageRating: number;
    commonPreferences: string[];
  };
}

class MemoryService {
  private storageKey = 'travel_planner_memory';
  private userProfile: UserProfile | null = null;

  constructor() {
    this.loadUserProfile();
  }

  private loadUserProfile(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.userProfile = JSON.parse(stored);
      } else {
        this.initializeUserProfile();
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      this.initializeUserProfile();
    }
  }

  private initializeUserProfile(): void {
    this.userProfile = {
      id: this.generateUserId(),
      preferences: {
        favoriteDestinations: [],
        preferredBudget: 'Premium',
        travelStyle: [],
        cuisinePreferences: [],
        dietaryRequirements: []
      },
      travelHistory: [],
      insights: {
        totalTrips: 0,
        favoriteRegion: '',
        averageRating: 0,
        commonPreferences: []
      }
    };
    this.saveUserProfile();
  }

  private generateUserId(): string {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private saveUserProfile(): void {
    try {
      if (this.userProfile) {
        localStorage.setItem(this.storageKey, JSON.stringify(this.userProfile));
      }
    } catch (error) {
      console.error('Error saving user profile:', error);
    }
  }

  getUserProfile(): UserProfile | null {
    return this.userProfile;
  }

  getTravelHistory(): TripMemory[] {
    return this.userProfile?.travelHistory || [];
  }

  addTripToHistory(trip: {
    destination: string;
    preferences: any;
    feedback?: string;
    rating?: number;
  }): void {
    if (!this.userProfile) return;

    const tripMemory: TripMemory = {
      id: this.generateTripId(),
      destination: trip.destination,
      preferences: trip.preferences,
      feedback: trip.feedback || '',
      rating: trip.rating || 5,
      createdAt: new Date().toISOString()
    };

    this.userProfile.travelHistory.push(tripMemory);
    this.updateUserInsights();
    this.saveUserProfile();
  }

  private generateTripId(): string {
    return 'trip_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  updatePreferences(newPreferences: Partial<UserProfile['preferences']>): void {
    if (!this.userProfile) return;

    this.userProfile.preferences = {
      ...this.userProfile.preferences,
      ...newPreferences
    };

    this.updateUserInsights();
    this.saveUserProfile();
  }

  private updateUserInsights(): void {
    if (!this.userProfile) return;

    const history = this.userProfile.travelHistory;
    
    this.userProfile.insights = {
      totalTrips: history.length,
      favoriteRegion: this.calculateFavoriteRegion(history),
      averageRating: this.calculateAverageRating(history),
      commonPreferences: this.extractCommonPreferences(history)
    };
  }

  private calculateFavoriteRegion(history: TripMemory[]): string {
    if (history.length === 0) return '';

    const regionCounts: { [key: string]: number } = {};
    
    history.forEach(trip => {
      // Simple region extraction - in production, you'd use a proper mapping
      const region = this.extractRegion(trip.destination);
      regionCounts[region] = (regionCounts[region] || 0) + 1;
    });

    return Object.keys(regionCounts).reduce((a, b) => 
      regionCounts[a] > regionCounts[b] ? a : b
    ) || '';
  }

  private extractRegion(destination: string): string {
    // Simple region mapping - in production, use a comprehensive database
    const regionMap: { [key: string]: string } = {
      'France': 'Europe',
      'Italy': 'Europe',
      'Spain': 'Europe',
      'UK': 'Europe',
      'Japan': 'Asia',
      'Thailand': 'Asia',
      'India': 'Asia',
      'USA': 'North America',
      'Australia': 'Oceania',
      'UAE': 'Middle East'
    };

    for (const [country, region] of Object.entries(regionMap)) {
      if (destination.includes(country)) {
        return region;
      }
    }

    return 'Other';
  }

  private calculateAverageRating(history: TripMemory[]): number {
    if (history.length === 0) return 0;

    const totalRating = history.reduce((sum, trip) => sum + trip.rating, 0);
    return Math.round((totalRating / history.length) * 10) / 10;
  }

  private extractCommonPreferences(history: TripMemory[]): string[] {
    if (history.length === 0) return [];

    const prefCounts: { [key: string]: number } = {};
    
    history.forEach(trip => {
      if (trip.preferences.tripType) {
        trip.preferences.tripType.forEach((type: string) => {
          prefCounts[type] = (prefCounts[type] || 0) + 1;
        });
      }
    });

    return Object.entries(prefCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([pref]) => pref);
  }

  getPersonalizedRecommendations(): string[] {
    if (!this.userProfile) return [];

    const recommendations = [];
    const insights = this.userProfile.insights;

    if (insights.favoriteRegion) {
      recommendations.push(`Based on your travel history, you seem to love ${insights.favoriteRegion}. Consider exploring more destinations in this region.`);
    }

    if (insights.commonPreferences.length > 0) {
      recommendations.push(`Your favorite travel styles are ${insights.commonPreferences.join(', ')}. We'll prioritize these in your itinerary.`);
    }

    if (insights.averageRating >= 4.5) {
      recommendations.push(`You consistently rate trips highly! We'll maintain the same quality standards for your upcoming journey.`);
    } else if (insights.averageRating < 3.5) {
      recommendations.push(`We've analyzed your feedback and will focus on improving areas you found lacking in previous trips.`);
    }

    return recommendations;
  }

  getMemoryInsights(): string[] {
    if (!this.userProfile || this.userProfile.travelHistory.length === 0) {
      return ['This is your first trip with us! We\'ll learn your preferences as we go.'];
    }

    const insights = [];
    const profile = this.userProfile;

    insights.push(`You've planned ${profile.insights.totalTrips} trips with us (avg rating: ${profile.insights.averageRating}/5)`);
    
    if (profile.insights.favoriteRegion) {
      insights.push(`Your favorite region appears to be ${profile.insights.favoriteRegion}`);
    }

    if (profile.insights.commonPreferences.length > 0) {
      insights.push(`You consistently enjoy ${profile.insights.commonPreferences.join(' and ')} experiences`);
    }

    // Add recent feedback insights
    const recentTrips = profile.travelHistory.slice(-2);
    if (recentTrips.length > 0) {
      const recentFeedback = recentTrips
        .filter(trip => trip.feedback)
        .map(trip => trip.feedback)
        .join('; ');
      
      if (recentFeedback) {
        insights.push(`Recent feedback: "${recentFeedback}"`);
      }
    }

    return insights;
  }

  addFeedback(tripId: string, feedback: string, rating: number): void {
    if (!this.userProfile) return;

    const trip = this.userProfile.travelHistory.find(t => t.id === tripId);
    if (trip) {
      trip.feedback = feedback;
      trip.rating = rating;
      this.updateUserInsights();
      this.saveUserProfile();
    }
  }

  clearHistory(): void {
    if (!this.userProfile) return;

    this.userProfile.travelHistory = [];
    this.updateUserInsights();
    this.saveUserProfile();
  }

  exportData(): string {
    return JSON.stringify(this.userProfile, null, 2);
  }

  importData(data: string): boolean {
    try {
      const imported = JSON.parse(data);
      if (this.validateUserProfile(imported)) {
        this.userProfile = imported;
        this.saveUserProfile();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private validateUserProfile(data: any): boolean {
    return data && 
           typeof data.id === 'string' &&
           data.preferences &&
           Array.isArray(data.travelHistory) &&
           data.insights;
  }
}

export const memoryService = new MemoryService();
export type { UserProfile };