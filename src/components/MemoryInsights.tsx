import React, { useState } from 'react';
import { Brain, TrendingUp, MapPin, Star, Clock, Settings } from 'lucide-react';
import { memoryService } from '../services/memoryService';
import type { UserProfile } from '../services/memoryService';

interface MemoryInsightsProps {
  isOpen: boolean;
  onClose: () => void;
}

const MemoryInsights: React.FC<MemoryInsightsProps> = ({ isOpen, onClose }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(memoryService.getUserProfile());
  const [activeTab, setActiveTab] = useState<'insights' | 'history' | 'settings'>('insights');

  if (!isOpen) return null;

  const insights = memoryService.getMemoryInsights();
  const recommendations = memoryService.getPersonalizedRecommendations();
  const travelHistory = memoryService.getTravelHistory();

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear your travel history? This cannot be undone.')) {
      memoryService.clearHistory();
      setUserProfile(memoryService.getUserProfile());
    }
  };

  const handleExportData = () => {
    const data = memoryService.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'travel-memory-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Travel Memory & Insights</h2>
                <p className="text-slate-300">AI-powered personalization based on your journey</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-300 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <div className="flex">
            {[
              { id: 'insights', label: 'AI Insights', icon: TrendingUp },
              { id: 'history', label: 'Travel History', icon: Clock },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'insights' && (
            <div className="space-y-6">
              {/* Stats Overview */}
              {userProfile && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-xl">
                    <div className="text-2xl font-bold text-blue-600">
                      {userProfile.insights.totalTrips}
                    </div>
                    <div className="text-sm text-slate-600">Total Trips</div>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-xl">
                    <div className="text-2xl font-bold text-emerald-600">
                      {userProfile.insights.averageRating}/5
                    </div>
                    <div className="text-sm text-slate-600">Avg Rating</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-xl">
                    <div className="text-2xl font-bold text-purple-600">
                      {userProfile.insights.favoriteRegion || 'N/A'}
                    </div>
                    <div className="text-sm text-slate-600">Favorite Region</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-xl">
                    <div className="text-2xl font-bold text-orange-600">
                      {userProfile.preferences.favoriteDestinations.length}
                    </div>
                    <div className="text-sm text-slate-600">Saved Destinations</div>
                  </div>
                </div>
              )}

              {/* AI Insights */}
              <div className="bg-slate-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  AI Memory Insights
                </h3>
                <div className="space-y-3">
                  {insights.map((insight, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-slate-700">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Personalized Recommendations */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Personalized Recommendations
                </h3>
                <div className="space-y-3">
                  {recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-slate-700">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800">Your Travel Journey</h3>
                <span className="text-sm text-slate-500">{travelHistory.length} trips recorded</span>
              </div>

              {travelHistory.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No travel history yet. Start planning your first trip!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {travelHistory.slice().reverse().map((trip, index) => (
                    <div key={trip.id} className="border border-slate-200 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-slate-800">{trip.destination}</h4>
                          <p className="text-sm text-slate-500">
                            {new Date(trip.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm font-medium">{trip.rating}/5</span>
                        </div>
                      </div>
                      
                      {trip.feedback && (
                        <p className="text-sm text-slate-600 italic">"{trip.feedback}"</p>
                      )}
                      
                      <div className="mt-2 flex flex-wrap gap-2">
                        {trip.preferences.tripType?.map((type: string) => (
                          <span key={type} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Memory Management</h3>
                <div className="space-y-4">
                  <button
                    onClick={handleExportData}
                    className="w-full p-4 border border-slate-300 rounded-xl text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="font-medium text-slate-800">Export Travel Data</div>
                    <div className="text-sm text-slate-500">Download your travel history and preferences</div>
                  </button>
                  
                  <button
                    onClick={handleClearHistory}
                    className="w-full p-4 border border-red-300 rounded-xl text-left hover:bg-red-50 transition-colors"
                  >
                    <div className="font-medium text-red-600">Clear Travel History</div>
                    <div className="text-sm text-red-500">Permanently delete all travel data</div>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Privacy & Data</h3>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm text-slate-600 mb-2">
                    Your travel data is stored locally on your device and used to personalize your experience.
                  </p>
                  <p className="text-sm text-slate-600">
                    We use this information to provide better recommendations and remember your preferences.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemoryInsights;