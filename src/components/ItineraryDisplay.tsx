import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users, Edit, RefreshCw, Trash2, Plus, ExternalLink, Download, Share2, Star } from 'lucide-react';
import { placesService } from '../services/placesService';
import { mapsService } from '../services/mapsService';
import { memoryService } from '../services/memoryService';
import { jsPDF } from 'jspdf';
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

const ItineraryDisplay: React.FC<ItineraryDisplayProps> = ({
  tripPlan,
  onEditTrip,
  onRegenerateDay,
  onDeleteActivity,
  onModifyActivity,
  onAddActivity,
  isRegenerating
}) => {
  const [activityImages, setActivityImages] = useState<{ [key: string]: string }>({});
  const [mapImages, setMapImages] = useState<{ [key: string]: string }>({});
  const [restaurantImages, setRestaurantImages] = useState<{ [key: string]: string }>({});
  const [loadingImages, setLoadingImages] = useState<{ [key: string]: boolean }>({});
  const [loadingMaps, setLoadingMaps] = useState<{ [key: string]: boolean }>({});
  const [editingActivity, setEditingActivity] = useState<{ dayNumber: number; activityId: string } | null>(null);
  const [showAddActivity, setShowAddActivity] = useState<{ dayNumber: number } | null>(null);
  const [newActivityForm, setNewActivityForm] = useState({
    time: '',
    title: '',
    description: '',
    location: '',
    duration: ''
  });

  // Load images for activities and restaurants
  useEffect(() => {
    const loadAllImages = async () => {
      const imagePromises: Promise<void>[] = [];
      const mapPromises: Promise<void>[] = [];

      tripPlan.itinerary.forEach(day => {
        // Load activity images and maps
        day.activities.forEach(activity => {
          const activityKey = `${day.day}-${activity.id}`;
          
          // Load activity image
          if (!activityImages[activityKey]) {
            setLoadingImages(prev => ({ ...prev, [activityKey]: true }));
            imagePromises.push(
              placesService.getPlacePhoto(activity.title, activity.location)
                .then(imageUrl => {
                  setActivityImages(prev => ({ ...prev, [activityKey]: imageUrl }));
                  setLoadingImages(prev => ({ ...prev, [activityKey]: false }));
                })
                .catch(() => {
                  setLoadingImages(prev => ({ ...prev, [activityKey]: false }));
                })
            );
          }

          // Load map image
          const mapKey = `map-${activityKey}`;
          if (!mapImages[mapKey]) {
            setLoadingMaps(prev => ({ ...prev, [mapKey]: true }));
            mapPromises.push(
              mapsService.generateStaticMapUrl(activity.location, activity.title, {
                width: 400,
                height: 200,
                zoom: 15,
                markers: true
              })
                .then(mapUrl => {
                  setMapImages(prev => ({ ...prev, [mapKey]: mapUrl }));
                  setLoadingMaps(prev => ({ ...prev, [mapKey]: false }));
                })
                .catch(() => {
                  setLoadingMaps(prev => ({ ...prev, [mapKey]: false }));
                })
            );
          }
        });

        // Load restaurant images
        Object.entries(day.meals).forEach(([mealType, meal]) => {
          const restaurantKey = `${day.day}-${mealType}`;
          if (!restaurantImages[restaurantKey]) {
            imagePromises.push(
              placesService.getRestaurantPhoto(meal.restaurant, meal.location, meal.cuisine)
                .then(imageUrl => {
                  setRestaurantImages(prev => ({ ...prev, [restaurantKey]: imageUrl }));
                })
                .catch(() => {
                  // Fallback handled by service
                })
            );
          }
        });
      });

      // Execute all promises
      await Promise.allSettled([...imagePromises, ...mapPromises]);
    };

    loadAllImages();
  }, [tripPlan, activityImages, mapImages, restaurantImages]);

  const handleEditActivity = (dayNumber: number, activityId: string) => {
    setEditingActivity({ dayNumber, activityId });
  };

  const handleSaveActivity = (dayNumber: number, activityId: string, updatedActivity: any) => {
    onModifyActivity(dayNumber, activityId, updatedActivity);
    setEditingActivity(null);
  };

  const handleAddActivity = (dayNumber: number) => {
    if (newActivityForm.title && newActivityForm.time) {
      onAddActivity(dayNumber, {
        ...newActivityForm,
        id: `${dayNumber}-${Date.now()}`,
        travelTime: '15 minutes',
        transportMode: 'walking',
        funFact: 'New activity added by user',
        tips: ['User-added activity', 'Customize as needed']
      });
      
      setNewActivityForm({
        time: '',
        title: '',
        description: '',
        location: '',
        duration: ''
      });
      setShowAddActivity(null);
    }
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('itinerary-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });
      
      const imgData = canvas.toDataURL('image/png');
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
      console.error('Error generating PDF:', error);
    }
  };

  const handleShareItinerary = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${tripPlan.travelInfo.destination} Travel Itinerary`,
          text: `Check out my ${tripPlan.travelInfo.numberOfDays}-day trip to ${tripPlan.travelInfo.destination}!`,
          url: window.location.href
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleSaveTripMemory = () => {
    const rating = 5; // Default rating, could be made interactive
    const feedback = 'Great trip planned with AI assistance!';
    
    memoryService.addTripToHistory({
      destination: tripPlan.travelInfo.destination,
      preferences: tripPlan.preferences,
      feedback,
      rating
    });

    // Show success notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg z-50';
    notification.textContent = 'Trip saved to your travel memory! 🎉';
    document.body.appendChild(notification);
    
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                🌍 {tripPlan.travelInfo.destination} Adventure
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{tripPlan.travelInfo.numberOfDays} days</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{tripPlan.travelInfo.travelGroup}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-4 h-4 text-center">💰</span>
                  <span>{tripPlan.travelInfo.budget}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
              
              <button
                onClick={handleShareItinerary}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              
              <button
                onClick={handleSaveTripMemory}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Star className="w-4 h-4" />
                Save to Memory
              </button>
              
              <button
                onClick={onEditTrip}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit Trip
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Itinerary Content */}
      <div id="itinerary-content" className="max-w-6xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {tripPlan.itinerary.map((day, dayIndex) => (
            <div key={day.day} className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {/* Day Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">Day {day.day}</h2>
                    <p className="text-blue-100">{new Date(day.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddActivity({ dayNumber: day.day })}
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
                      <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                      Regenerate
                    </button>
                  </div>
                </div>
              </div>

              {/* Add Activity Form */}
              {showAddActivity?.dayNumber === day.day && (
                <div className="p-6 bg-gray-50 border-b">
                  <h3 className="text-lg font-semibold mb-4">Add New Activity</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="time"
                      value={newActivityForm.time}
                      onChange={(e) => setNewActivityForm(prev => ({ ...prev, time: e.target.value }))}
                      className="p-3 border border-gray-300 rounded-lg"
                      placeholder="Time"
                    />
                    <input
                      type="text"
                      value={newActivityForm.title}
                      onChange={(e) => setNewActivityForm(prev => ({ ...prev, title: e.target.value }))}
                      className="p-3 border border-gray-300 rounded-lg"
                      placeholder="Activity Title"
                    />
                    <input
                      type="text"
                      value={newActivityForm.location}
                      onChange={(e) => setNewActivityForm(prev => ({ ...prev, location: e.target.value }))}
                      className="p-3 border border-gray-300 rounded-lg"
                      placeholder="Location"
                    />
                    <input
                      type="text"
                      value={newActivityForm.duration}
                      onChange={(e) => setNewActivityForm(prev => ({ ...prev, duration: e.target.value }))}
                      className="p-3 border border-gray-300 rounded-lg"
                      placeholder="Duration"
                    />
                    <textarea
                      value={newActivityForm.description}
                      onChange={(e) => setNewActivityForm(prev => ({ ...prev, description: e.target.value }))}
                      className="p-3 border border-gray-300 rounded-lg md:col-span-2"
                      placeholder="Description"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => handleAddActivity(day.day)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Add Activity
                    </button>
                    <button
                      onClick={() => setShowAddActivity(null)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Activities */}
              <div className="p-6">
                <div className="space-y-6">
                  {day.activities.map((activity, activityIndex) => (
                    <div key={activity.id} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <Clock className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="text-xl font-semibold text-gray-800">{activity.title}</h3>
                              <p className="text-blue-600 font-medium">{activity.time} • {activity.duration}</p>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditActivity(day.day, activity.id)}
                              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDeleteActivity(day.day, activity.id)}
                              className="p-2 text-red-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Activity Details */}
                          <div>
                            <p className="text-gray-600 mb-4">{activity.description}</p>
                            
                            <div className="flex items-center gap-2 text-gray-500 mb-3">
                              <MapPin className="w-4 h-4" />
                              <span>{activity.location}</span>
                            </div>

                            {activity.funFact && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                                <h4 className="font-semibold text-yellow-800 mb-2">💡 Fun Fact</h4>
                                <p className="text-yellow-700 text-sm">{activity.funFact}</p>
                              </div>
                            )}

                            {activity.tips && activity.tips.length > 0 && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <h4 className="font-semibold text-green-800 mb-2">💡 Tips</h4>
                                <ul className="space-y-1">
                                  {activity.tips.map((tip, tipIndex) => (
                                    <li key={tipIndex} className="text-green-700 text-sm flex items-start gap-2">
                                      <span className="text-green-500 mt-1">•</span>
                                      <span>{tip}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Images */}
                          <div className="space-y-4">
                            {/* Activity Image */}
                            <div className="relative">
                              {loadingImages[`${day.day}-${activity.id}`] ? (
                                <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                </div>
                              ) : (
                                <img
                                  src={activityImages[`${day.day}-${activity.id}`] || 'https://images.pexels.com/photos/1252814/pexels-photo-1252814.jpeg?auto=compress&cs=tinysrgb&w=400&h=200&fit=crop'}
                                  alt={activity.title}
                                  className="w-full h-48 object-cover rounded-lg"
                                  loading="lazy"
                                />
                              )}
                            </div>

                            {/* Map */}
                            <div className="relative">
                              {loadingMaps[`map-${day.day}-${activity.id}`] ? (
                                <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                </div>
                              ) : (
                                <div className="relative">
                                  <img
                                    src={mapImages[`map-${day.day}-${activity.id}`] || 'https://images.pexels.com/photos/1252814/pexels-photo-1252814.jpeg?auto=compress&cs=tinysrgb&w=400&h=200&fit=crop'}
                                    alt={`Map of ${activity.location}`}
                                    className="w-full h-32 object-cover rounded-lg"
                                    loading="lazy"
                                  />
                                  <a
                                    href={mapsService.generateSearchUrl(activity.location, activity.title)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute top-2 right-2 p-2 bg-white/90 rounded-lg hover:bg-white transition-colors"
                                  >
                                    <ExternalLink className="w-4 h-4 text-gray-600" />
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Meals Section */}
                <div className="mt-8">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">🍽️ Meals for Day {day.day}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(day.meals).map(([mealType, meal]) => (
                      <div key={mealType} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-2xl">
                            {mealType === 'breakfast' ? '🌅' : mealType === 'lunch' ? '☀️' : '🌙'}
                          </span>
                          <h4 className="font-semibold text-gray-800 capitalize">{mealType}</h4>
                        </div>
                        
                        <img
                          src={restaurantImages[`${day.day}-${mealType}`] || 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=300&h=150&fit=crop'}
                          alt={meal.restaurant}
                          className="w-full h-24 object-cover rounded-lg mb-3"
                          loading="lazy"
                        />
                        
                        <h5 className="font-medium text-gray-800 mb-1">{meal.restaurant}</h5>
                        <p className="text-sm text-gray-600 mb-2">{meal.cuisine} • {meal.priceRange}</p>
                        <p className="text-xs text-gray-500">{meal.location}</p>
                        
                        {meal.specialties && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-1">Specialties:</p>
                            <div className="flex flex-wrap gap-1">
                              {meal.specialties.slice(0, 2).map((specialty, index) => (
                                <span key={index} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                  {specialty}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Travel Tips */}
                {day.travelTips && day.travelTips.length > 0 && (
                  <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-3">🎒 Travel Tips for Day {day.day}</h4>
                    <ul className="space-y-2">
                      {day.travelTips.map((tip, tipIndex) => (
                        <li key={tipIndex} className="text-blue-700 text-sm flex items-start gap-2">
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
      </div>
    </div>
  );
};

export default ItineraryDisplay;