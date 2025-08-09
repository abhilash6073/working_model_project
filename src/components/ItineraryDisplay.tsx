import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Star, Edit3, Trash2, Plus, Download, Share2, RefreshCw, ExternalLink, Camera, Navigation, Utensils, Info, ChevronDown, ChevronUp, Heart, MessageCircle } from 'lucide-react';
import { placesService } from '../services/placesService';
import { mapsService } from '../services/mapsService';
import { generateComprehensiveActivity } from '../utils/mockData';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
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
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));
  const [activityImages, setActivityImages] = useState<{ [key: string]: string }>({});
  const [mapImages, setMapImages] = useState<{ [key: string]: string }>({});
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const [editingActivity, setEditingActivity] = useState<{ dayNumber: number; activityId: string } | null>(null);
  const [showAddActivity, setShowAddActivity] = useState<{ dayNumber: number } | null>(null);
  const [newActivityForm, setNewActivityForm] = useState({
    title: '',
    description: '',
    location: '',
    time: '',
    duration: '2 hours'
  });

  // Load images for activities and maps
  useEffect(() => {
    const loadImagesForItinerary = async () => {
      const imagePromises: Promise<void>[] = [];
      const mapPromises: Promise<void>[] = [];

      tripPlan.itinerary.forEach(day => {
        day.activities.forEach(activity => {
          const activityKey = `${day.day}-${activity.id}`;
          
          // Load activity image
          if (!activityImages[activityKey] && !loadingImages.has(activityKey)) {
            setLoadingImages(prev => new Set([...prev, activityKey]));
            
            const imagePromise = placesService.getPlacePhoto(activity.title, activity.location)
              .then(imageUrl => {
                setActivityImages(prev => ({ ...prev, [activityKey]: imageUrl }));
                setLoadingImages(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(activityKey);
                  return newSet;
                });
              })
              .catch(error => {
                console.error(`Failed to load image for ${activity.title}:`, error);
                setLoadingImages(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(activityKey);
                  return newSet;
                });
              });
            
            imagePromises.push(imagePromise);
          }

          // Load map image
          const mapKey = `map-${day.day}-${activity.id}`;
          if (!mapImages[mapKey] && !loadingImages.has(mapKey)) {
            setLoadingImages(prev => new Set([...prev, mapKey]));
            
            const mapPromise = mapsService.generateStaticMapUrl(activity.location, activity.title, {
              width: 400,
              height: 200,
              zoom: 15,
              markers: true
            })
              .then(mapUrl => {
                setMapImages(prev => ({ ...prev, [mapKey]: mapUrl }));
                setLoadingImages(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(mapKey);
                  return newSet;
                });
              })
              .catch(error => {
                console.error(`Failed to load map for ${activity.title}:`, error);
                setLoadingImages(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(mapKey);
                  return newSet;
                });
              });
            
            mapPromises.push(mapPromise);
          }
        });
      });

      // Wait for all images to load
      await Promise.allSettled([...imagePromises, ...mapPromises]);
    };

    loadImagesForItinerary();
  }, [tripPlan.itinerary, activityImages, mapImages, loadingImages]);

  const toggleDayExpansion = (dayNumber: number) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dayNumber)) {
        newSet.delete(dayNumber);
      } else {
        newSet.add(dayNumber);
      }
      return newSet;
    });
  };

  const handleEditActivity = (dayNumber: number, activityId: string) => {
    const day = tripPlan.itinerary.find(d => d.day === dayNumber);
    const activity = day?.activities.find(a => a.id === activityId);
    
    if (activity) {
      setNewActivityForm({
        title: activity.title,
        description: activity.description,
        location: activity.location,
        time: activity.time,
        duration: activity.duration
      });
      setEditingActivity({ dayNumber, activityId });
    }
  };

  const handleSaveActivity = () => {
    if (editingActivity) {
      onModifyActivity(editingActivity.dayNumber, editingActivity.activityId, newActivityForm);
      setEditingActivity(null);
      setNewActivityForm({ title: '', description: '', location: '', time: '', duration: '2 hours' });
    }
  };

  const handleAddNewActivity = (dayNumber: number) => {
    if (newActivityForm.title && newActivityForm.location) {
      const newActivity = generateComprehensiveActivity(dayNumber, tripPlan.travelInfo.destination, {
        title: newActivityForm.title,
        description: newActivityForm.description
      });
      
      onAddActivity(dayNumber, {
        ...newActivity,
        time: newActivityForm.time,
        duration: newActivityForm.duration,
        location: newActivityForm.location,
        description: newActivityForm.description
      });
      
      setShowAddActivity(null);
      setNewActivityForm({ title: '', description: '', location: '', time: '', duration: '2 hours' });
    }
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

  const shareItinerary = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${tripPlan.travelInfo.destination} Trip Itinerary`,
          text: `Check out my ${tripPlan.travelInfo.numberOfDays}-day trip to ${tripPlan.travelInfo.destination}!`,
          url: window.location.href
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const openInGoogleMaps = (location: string, title: string) => {
    const searchUrl = mapsService.generateSearchUrl(location, title);
    window.open(searchUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                🌍 {tripPlan.travelInfo.destination}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(tripPlan.travelInfo.startDate).toLocaleDateString()} - {new Date(tripPlan.travelInfo.endDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{tripPlan.travelInfo.numberOfDays} days</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  <span>{tripPlan.travelInfo.budget}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={exportToPDF}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>
              
              <button
                onClick={shareItinerary}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              
              <button
                onClick={onEditTrip}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Edit Trip
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Itinerary Content */}
      <div id="itinerary-content" className="max-w-6xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {tripPlan.itinerary.map((day) => (
            <div key={day.day} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Day Header */}
              <div 
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 cursor-pointer"
                onClick={() => toggleDayExpansion(day.day)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">Day {day.day}</h2>
                    <p className="text-blue-100">{new Date(day.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-blue-100">
                        {day.activities.length} activities
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRegenerateDay(day.day);
                      }}
                      disabled={isRegenerating}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
                      title="Regenerate this day"
                    >
                      <RefreshCw className={`w-5 h-5 ${isRegenerating ? 'animate-spin' : ''}`} />
                    </button>
                    
                    {expandedDays.has(day.day) ? (
                      <ChevronUp className="w-6 h-6" />
                    ) : (
                      <ChevronDown className="w-6 h-6" />
                    )}
                  </div>
                </div>
              </div>

              {/* Day Content */}
              {expandedDays.has(day.day) && (
                <div className="p-6">
                  {/* Activities */}
                  <div className="space-y-6">
                    {day.activities.map((activity, index) => {
                      const activityKey = `${day.day}-${activity.id}`;
                      const mapKey = `map-${day.day}-${activity.id}`;
                      const isEditing = editingActivity?.dayNumber === day.day && editingActivity?.activityId === activity.id;
                      
                      return (
                        <div key={activity.id} className="border border-gray-200 rounded-xl overflow-hidden">
                          {/* Activity Header */}
                          <div className="bg-gray-50 p-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Clock className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-800">{activity.time}</div>
                                  <div className="text-sm text-gray-600">{activity.duration}</div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEditActivity(day.day, activity.id)}
                                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit activity"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                
                                <button
                                  onClick={() => onDeleteActivity(day.day, activity.id)}
                                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete activity"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Activity Content */}
                          {isEditing ? (
                            <div className="p-6 bg-blue-50">
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                  <input
                                    type="text"
                                    value={newActivityForm.title}
                                    onChange={(e) => setNewActivityForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                  <textarea
                                    value={newActivityForm.description}
                                    onChange={(e) => setNewActivityForm(prev => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                    <input
                                      type="text"
                                      value={newActivityForm.location}
                                      onChange={(e) => setNewActivityForm(prev => ({ ...prev, location: e.target.value }))}
                                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                  
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                                    <input
                                      type="time"
                                      value={newActivityForm.time}
                                      onChange={(e) => setNewActivityForm(prev => ({ ...prev, time: e.target.value }))}
                                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                  
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                                    <select
                                      value={newActivityForm.duration}
                                      onChange={(e) => setNewActivityForm(prev => ({ ...prev, duration: e.target.value }))}
                                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                      <option value="30 minutes">30 minutes</option>
                                      <option value="1 hour">1 hour</option>
                                      <option value="1.5 hours">1.5 hours</option>
                                      <option value="2 hours">2 hours</option>
                                      <option value="3 hours">3 hours</option>
                                      <option value="4 hours">4 hours</option>
                                      <option value="Half day">Half day</option>
                                      <option value="Full day">Full day</option>
                                    </select>
                                  </div>
                                </div>
                                
                                <div className="flex gap-3">
                                  <button
                                    onClick={handleSaveActivity}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                  >
                                    Save Changes
                                  </button>
                                  
                                  <button
                                    onClick={() => setEditingActivity(null)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="p-6">
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Activity Details */}
                                <div className="lg:col-span-2 space-y-4">
                                  <div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-2">{activity.title}</h3>
                                    <p className="text-gray-600 leading-relaxed">{activity.description}</p>
                                  </div>

                                  <div className="flex items-center gap-2 text-gray-600">
                                    <MapPin className="w-4 h-4" />
                                    <span>{activity.location}</span>
                                    <button
                                      onClick={() => openInGoogleMaps(activity.location, activity.title)}
                                      className="ml-2 p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                      title="Open in Google Maps"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </button>
                                  </div>

                                  {/* Fun Fact */}
                                  {activity.funFact && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                      <div className="flex items-start gap-2">
                                        <Info className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                                        <div>
                                          <h4 className="font-medium text-yellow-800 mb-1">Fun Fact</h4>
                                          <p className="text-yellow-700 text-sm">{activity.funFact}</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Tips */}
                                  {activity.tips && activity.tips.length > 0 && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                      <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                                        <Heart className="w-4 h-4" />
                                        Pro Tips
                                      </h4>
                                      <ul className="space-y-1">
                                        {activity.tips.map((tip, tipIndex) => (
                                          <li key={tipIndex} className="text-blue-700 text-sm flex items-start gap-2">
                                            <span className="text-blue-400 mt-1">•</span>
                                            <span>{tip}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>

                                {/* Activity Image and Map */}
                                <div className="space-y-4">
                                  {/* Activity Photo */}
                                  <div className="relative">
                                    {loadingImages.has(activityKey) ? (
                                      <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                                        <div className="flex items-center gap-2 text-gray-500">
                                          <Camera className="w-5 h-5 animate-pulse" />
                                          <span className="text-sm">Loading photo...</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <img
                                        src={activityImages[activityKey] || 'https://images.pexels.com/photos/1252814/pexels-photo-1252814.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop'}
                                        alt={activity.title}
                                        className="w-full h-48 object-cover rounded-lg shadow-md"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.src = 'https://images.pexels.com/photos/1252814/pexels-photo-1252814.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop';
                                        }}
                                      />
                                    )}
                                  </div>

                                  {/* Map */}
                                  <div className="relative">
                                    {loadingImages.has(mapKey) ? (
                                      <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                                        <div className="flex items-center gap-2 text-gray-500">
                                          <Navigation className="w-5 h-5 animate-pulse" />
                                          <span className="text-sm">Loading map...</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="relative">
                                        <img
                                          src={mapImages[mapKey] || 'https://images.pexels.com/photos/1252814/pexels-photo-1252814.jpeg?auto=compress&cs=tinysrgb&w=400&h=200&fit=crop'}
                                          alt={`Map of ${activity.location}`}
                                          className="w-full h-32 object-cover rounded-lg shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                                          onClick={() => openInGoogleMaps(activity.location, activity.title)}
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.src = 'https://images.pexels.com/photos/1252814/pexels-photo-1252814.jpeg?auto=compress&cs=tinysrgb&w=400&h=200&fit=crop';
                                          }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                                          <div className="bg-white/90 px-3 py-1 rounded-full text-sm font-medium text-gray-800">
                                            Click to open in Maps
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Add Activity Button */}
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                      {showAddActivity?.dayNumber === day.day ? (
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-800">Add New Activity</h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Activity Title</label>
                              <input
                                type="text"
                                value={newActivityForm.title}
                                onChange={(e) => setNewActivityForm(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="e.g., Visit Local Museum"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                              <input
                                type="text"
                                value={newActivityForm.location}
                                onChange={(e) => setNewActivityForm(prev => ({ ...prev, location: e.target.value }))}
                                placeholder="e.g., Downtown District"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                              value={newActivityForm.description}
                              onChange={(e) => setNewActivityForm(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Describe what you'll do at this activity..."
                              rows={3}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                              <input
                                type="time"
                                value={newActivityForm.time}
                                onChange={(e) => setNewActivityForm(prev => ({ ...prev, time: e.target.value }))}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                              <select
                                value={newActivityForm.duration}
                                onChange={(e) => setNewActivityForm(prev => ({ ...prev, duration: e.target.value }))}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="30 minutes">30 minutes</option>
                                <option value="1 hour">1 hour</option>
                                <option value="1.5 hours">1.5 hours</option>
                                <option value="2 hours">2 hours</option>
                                <option value="3 hours">3 hours</option>
                                <option value="4 hours">4 hours</option>
                                <option value="Half day">Half day</option>
                                <option value="Full day">Full day</option>
                              </select>
                            </div>
                          </div>
                          
                          <div className="flex gap-3 justify-center">
                            <button
                              onClick={() => handleAddNewActivity(day.day)}
                              disabled={!newActivityForm.title || !newActivityForm.location}
                              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Add Activity
                            </button>
                            
                            <button
                              onClick={() => {
                                setShowAddActivity(null);
                                setNewActivityForm({ title: '', description: '', location: '', time: '', duration: '2 hours' });
                              }}
                              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowAddActivity({ dayNumber: day.day })}
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                        >
                          <Plus className="w-5 h-5" />
                          Add Activity to Day {day.day}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Meals Section */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Utensils className="w-5 h-5" />
                      Meals for Day {day.day}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Object.entries(day.meals).map(([mealType, meal]) => (
                        <div key={mealType} className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-medium text-gray-800 capitalize mb-2">{mealType}</h4>
                          <div className="space-y-1 text-sm">
                            <div className="font-medium text-gray-700">{meal.restaurant}</div>
                            <div className="text-gray-600">{meal.cuisine} • {meal.priceRange}</div>
                            <div className="text-gray-500">{meal.location}</div>
                            {meal.specialties && (
                              <div className="text-xs text-gray-500 mt-2">
                                Specialties: {meal.specialties.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ItineraryDisplay;