import React, { useState } from 'react';
import Hero from './components/Hero';
import TravelInfoForm from './components/TravelInfoForm';
import PreferencesForm from './components/PreferencesForm';
import ItineraryDisplay from './components/ItineraryDisplay';
import AIAssistant from './components/AIAssistant';
import { aiService } from './services/aiService';
import { generateMockItinerary } from './utils/mockData';
import type { TravelInfo, TripPreferences, TripPlan } from './types';

type AppStep = 'hero' | 'travel-info' | 'preferences' | 'itinerary';

function App() {
  const [currentStep, setCurrentStep] = useState<AppStep>('hero');
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isGeneratingItinerary, setIsGeneratingItinerary] = useState(false);
  
  const [travelInfo, setTravelInfo] = useState<TravelInfo>({
    destination: '',
    startDate: '',
    endDate: '',
    numberOfDays: 1,
    budget: 'Premium',
    travelGroup: 'Couple',
    includeKids: false,
    includeElderly: false
  });

  const [tripPreferences, setTripPreferences] = useState<TripPreferences>({
    tripType: [],
    cuisinePreferences: [],
    dietaryRequirements: []
  });

  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);

  const handleStartPlanning = () => {
    setCurrentStep('travel-info');
  };

  const handleTravelInfoNext = () => {
    setCurrentStep('preferences');
  };

  const handlePreferencesBack = () => {
    setCurrentStep('travel-info');
  };

  const handleGenerateTrip = async () => {
    setIsGeneratingItinerary(true);
    
    console.log('🎯 Generating trip with AI integration...');
    
    try {
      // Use AI service for itinerary generation
      const aiRequest = {
        travelInfo,
        preferences: tripPreferences,
        userHistory: [] // Add user history from memory service later
      };
      
      const aiResponse = await aiService.generateItinerary(aiRequest);
      console.log('🤖 AI Response received:', aiResponse);
      
      // Create trip plan from AI response
      const generatedPlan = {
        id: Date.now().toString(),
        travelInfo,
        preferences: tripPreferences,
        itinerary: aiResponse.itinerary || generateMockItinerary(travelInfo, tripPreferences).itinerary,
        createdAt: new Date().toISOString()
      };
      
      setTripPlan(generatedPlan);
      setCurrentStep('itinerary');
      setIsGeneratingItinerary(false);
      
      // Auto-open AI assistant for first-time users
      setTimeout(() => {
        setIsAIAssistantOpen(true);
      }, 2000);
    } catch (error) {
      console.error('❌ Trip generation error:', error);
      // Fallback to mock data
      const generatedPlan = generateMockItinerary(travelInfo, tripPreferences);
      setTripPlan(generatedPlan);
      setCurrentStep('itinerary');
      setIsGeneratingItinerary(false);
    }
  };

  const handleEditTrip = () => {
    setCurrentStep('travel-info');
  };

  const handleRegenerateDay = (dayNumber: number) => {
    if (!tripPlan) return;
    
    setIsGeneratingItinerary(true);
    
    // Call AI service to regenerate specific day
    aiService.regenerateDay(tripPlan, dayNumber, travelInfo, tripPreferences)
      .then(updatedPlan => {
        setTripPlan(updatedPlan);
        setIsGeneratingItinerary(false);
        
        // Show success notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg z-50';
        notification.textContent = `Day ${dayNumber} regenerated successfully! ✨`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 3000);
      })
      .catch(error => {
        console.error('Error regenerating day:', error);
        setIsGeneratingItinerary(false);
        
        // Show error notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg z-50';
        notification.textContent = `Failed to regenerate Day ${dayNumber}. Please try again.`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 3000);
      });
  };

  const handleUpdateItinerary = (update: string) => {
    if (!tripPlan) return;
    
    setIsGeneratingItinerary(true);
    
    // Call AI service to update itinerary based on chat request
    aiService.updateItinerary(tripPlan, update, [])
      .then(updatedPlan => {
        setTripPlan(updatedPlan);
        setIsGeneratingItinerary(false);
        
        // Show success notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg z-50';
        notification.textContent = 'Itinerary updated successfully! ✅';
        document.body.appendChild(notification);
        
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 3000);
      })
      .catch(error => {
        console.error('Error updating itinerary:', error);
        setIsGeneratingItinerary(false);
        
        // Show error notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg z-50';
        notification.textContent = 'Failed to update itinerary. Please try again.';
        document.body.appendChild(notification);
        
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 3000);
      });
  };

  const handleDeleteActivity = (dayNumber: number, activityId: string) => {
    if (!tripPlan) return;
    
    const updatedItinerary = tripPlan.itinerary.map(day => {
      if (day.day === dayNumber) {
        return {
          ...day,
          activities: day.activities.filter(activity => activity.id !== activityId)
        };
      }
      return day;
    });
    
    setTripPlan({
      ...tripPlan,
      itinerary: updatedItinerary
    });
    
    // Show success notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg z-50';
    notification.textContent = 'Activity deleted successfully! ✅';
    document.body.appendChild(notification);
    
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  };

  const handleModifyActivity = (dayNumber: number, activityId: string, newActivity: any) => {
    if (!tripPlan) return;
    
    const updatedItinerary = tripPlan.itinerary.map(day => {
      if (day.day === dayNumber) {
        return {
          ...day,
          activities: day.activities.map(activity => 
            activity.id === activityId ? { ...activity, ...newActivity } : activity
          )
        };
      }
      return day;
    });
    
    setTripPlan({
      ...tripPlan,
      itinerary: updatedItinerary
    });
    
    // Show success notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg z-50';
    notification.textContent = 'Activity modified successfully! ✅';
    document.body.appendChild(notification);
    
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  };

  const handleAddActivity = (dayNumber: number, newActivity: any) => {
    if (!tripPlan) return;
    
    const updatedItinerary = tripPlan.itinerary.map(day => {
      if (day.day === dayNumber) {
        return {
          ...day,
          activities: [...day.activities, { ...newActivity, id: Date.now().toString() }]
        };
      }
      return day;
    });
    
    setTripPlan({
      ...tripPlan,
      itinerary: updatedItinerary
    });
    
    // Show success notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg z-50';
    notification.textContent = 'Activity added successfully! ✅';
    document.body.appendChild(notification);
    
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  };

  if (isGeneratingItinerary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-32 h-32 mx-auto mb-8">
            <div className="w-32 h-32 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-semibold mb-4">AI is crafting your perfect trip...</h2>
          <div className="space-y-2 text-lg opacity-90">
            <p>Analyzing your preferences</p>
            <p>Planning optimal routes</p>
            <p>Finding best restaurants</p>
            <p>Selecting top attractions</p>
          </div>
          <div className="mt-8 text-sm opacity-75">
            This usually takes 30-60 seconds
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {currentStep === 'hero' && (
        <Hero onGetStarted={handleStartPlanning} />
      )}

      {currentStep === 'travel-info' && (
        <div className="min-h-screen py-12 px-4">
          <TravelInfoForm
            data={travelInfo}
            onUpdate={setTravelInfo}
            onNext={handleTravelInfoNext}
          />
        </div>
      )}

      {currentStep === 'preferences' && (
        <div className="min-h-screen py-12 px-4">
          <PreferencesForm
            data={tripPreferences}
            onUpdate={setTripPreferences}
            onNext={handleGenerateTrip}
            onBack={handlePreferencesBack}
          />
        </div>
      )}

      {currentStep === 'itinerary' && tripPlan && (
        <div className="min-h-screen bg-slate-50 py-8">
          <ItineraryDisplay
            tripPlan={tripPlan}
            onEditTrip={handleEditTrip}
            onRegenerateDay={handleRegenerateDay}
            onDeleteActivity={handleDeleteActivity}
            onModifyActivity={handleModifyActivity}
            isRegenerating={isGeneratingItinerary}
            onAddActivity={handleAddActivity}
          />
        </div>
      )}

      {/* AI Assistant */}
      {currentStep === 'itinerary' && (
        <AIAssistant
          isOpen={isAIAssistantOpen}
          onToggle={() => setIsAIAssistantOpen(!isAIAssistantOpen)}
          onUpdateItinerary={handleUpdateItinerary}
          tripPlan={tripPlan}
        />
      )}

      {/* Progress Indicator */}
      {currentStep !== 'hero' && (
        <div className="fixed top-0 left-0 right-0 bg-white shadow-sm z-40">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-8">
                <div className={`flex items-center gap-2 ${
                  currentStep === 'travel-info' ? 'text-blue-600' : 
                  ['preferences', 'itinerary'].includes(currentStep) ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentStep === 'travel-info' ? 'bg-blue-100' : 
                    ['preferences', 'itinerary'].includes(currentStep) ? 'bg-emerald-100' : 'bg-slate-100'
                  }`}>
                    {['preferences', 'itinerary'].includes(currentStep) ? '✓' : '1'}
                  </div>
                  <span className="font-medium">Travel Info</span>
                </div>
                
                <div className={`flex items-center gap-2 ${
                  currentStep === 'preferences' ? 'text-blue-600' : 
                  currentStep === 'itinerary' ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentStep === 'preferences' ? 'bg-blue-100' : 
                    currentStep === 'itinerary' ? 'bg-emerald-100' : 'bg-slate-100'
                  }`}>
                    {currentStep === 'itinerary' ? '✓' : '2'}
                  </div>
                  <span className="font-medium">Preferences</span>
                </div>
                
                <div className={`flex items-center gap-2 ${
                  currentStep === 'itinerary' ? 'text-blue-600' : 'text-slate-400'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentStep === 'itinerary' ? 'bg-blue-100' : 'bg-slate-100'
                  }`}>
                    3
                  </div>
                  <span className="font-medium">Your Trip</span>
                </div>
              </div>
              
              {currentStep !== 'itinerary' && (
                <button
                  onClick={() => setCurrentStep('hero')}
                  className="text-slate-600 hover:text-slate-800 font-medium"
                >
                  ← Back to Home
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;