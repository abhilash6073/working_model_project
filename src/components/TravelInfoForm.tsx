import React, { useState } from 'react';
import { Calendar, Users, DollarSign, MapPin } from 'lucide-react';
import { destinationService } from '../services/destinationService';
import type { DestinationSuggestion } from '../services/destinationService';
import type { TravelInfo } from '../types';

// Interface definitions at top level
interface SuggestionItemProps {
  suggestion: DestinationSuggestion;
  onSelect: (suggestion: DestinationSuggestion) => void;
}

interface TravelInfoFormProps {
  data: TravelInfo;
  onUpdate: (data: TravelInfo) => void;
  onNext: () => void;
}

const TravelInfoForm: React.FC<TravelInfoFormProps> = ({ data, onUpdate, onNext }) => {
  const [suggestions, setSuggestions] = useState<DestinationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [destinationQuery, setDestinationQuery] = useState(data.destination);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleInputChange = (field: keyof TravelInfo, value: any) => {
    onUpdate({ ...data, [field]: value });
  };

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 1;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  };

  const handleDestinationChange = (value: string) => {
    setDestinationQuery(value);
    handleInputChange('destination', value);
    setShowSuggestions(false);
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    if (value.length >= 2) {
      setIsSearching(true);
      
      // Set new timeout for AI search
      const newTimeout = setTimeout(async () => {
        try {
          console.log('🔍 Searching destinations for:', value);
          const results = await destinationService.searchDestinations(value);
          console.log('📍 Found destinations:', results);
          setSuggestions(results);
          setShowSuggestions(true);
          setIsSearching(false);
        } catch (error) {
          console.error('Destination search failed:', error);
          setSuggestions([]);
          setShowSuggestions(false);
          setIsSearching(false);
        }
      }, 300); // Slightly longer delay for AI processing
      
      setSearchTimeout(newTimeout);
    } else {
      setIsSearching(false);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectDestination = (suggestion: DestinationSuggestion) => {
    const fullDestination = `${suggestion.name}, ${suggestion.country}`;
    setDestinationQuery(fullDestination);
    handleInputChange('destination', fullDestination);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleInputFocus = async () => {
    if (destinationQuery.length >= 2 && suggestions.length === 0) {
      setIsSearching(true);
      try {
        const results = await destinationService.searchDestinations(destinationQuery);
        setSuggestions(results);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Focus search failed:', error);
      }
      setIsSearching(false);
    } else if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding to allow for destination selection
    setTimeout(() => {
      setShowSuggestions(false);
    }, 150);
  };

  const handleUseCustomDestination = () => {
    // Allow user to use their custom input
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // Enhanced suggestion display with better categorization
  const categorizedSuggestions = suggestions.reduce((acc, suggestion) => {
    if (suggestion.popular) {
      acc.popular.push(suggestion);
    } else {
      acc.other.push(suggestion);
    }
    return acc;
  }, { popular: [] as DestinationSuggestion[], other: [] as DestinationSuggestion[] });

  const budgetOptions = [
    { value: 'Economy', icon: '🏷️', description: 'Budget-friendly options' },
    { value: 'Premium', icon: '⭐', description: 'Mid-range comfort' },
    { value: 'Luxury', icon: '✨', description: 'Luxury experiences' }
  ];

  const groupOptions = [
    { value: 'Solo', icon: '👤', description: 'Solo adventure' },
    { value: 'Couple', icon: '👫', description: 'Romantic getaway' },
    { value: 'Family', icon: '👨‍👩‍👧‍👦', description: 'Family vacation' },
    { value: 'Friends', icon: '👥', description: 'Group of friends' }
  ];

  return (
    <div className="min-h-screen relative py-12 px-4" style={{
      backgroundImage: `url('https://images.unsplash.com/photo-1488646953014-85cb44e25828?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed'
    }}>
      {/* Subtle overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50/40 via-orange-50/30 to-blue-50/40"></div>
      
      <div className="max-w-2xl mx-auto">
        <div className="relative bg-white/85 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 p-8">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Travel Information</h2>
            <p className="text-gray-600">Let's start with the basics of your trip</p>
          </div>

          <div className="space-y-6">
            {/* Destination */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="inline w-4 h-4 mr-1" />
                Where are you going?
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={destinationQuery}
                  onChange={(e) => handleDestinationChange(e.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  placeholder="Type or select a destination..."
                  className="w-full p-4 bg-white/70 border border-gray-300 rounded-xl text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 backdrop-blur-sm pr-10"
                />
                
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                
                {showSuggestions && !isSearching && (
                  <div className="absolute z-10 w-full mt-1 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-2xl max-h-80 overflow-y-auto">
                    <div className="p-3 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700">
                          🤖 AI Suggestions ({suggestions.length} found)
                        </h4>
                        {destinationService.constructor.name && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            AI-Powered
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {suggestions.length > 0 ? (
                      <div className="max-h-64 overflow-y-auto">
                        {/* Popular Destinations */}
                        {categorizedSuggestions.popular.length > 0 && (
                          <div>
                            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                                ⭐ Popular Destinations
                              </span>
                            </div>
                            {categorizedSuggestions.popular.map((suggestion, index) => (
                              <SuggestionItem
                                key={`popular-${index}`}
                                suggestion={suggestion}
                                onSelect={selectDestination}
                              />
                            ))}
                          </div>
                        )}
                        
                        {/* Other Destinations */}
                        {categorizedSuggestions.other.length > 0 && (
                          <div>
                            {categorizedSuggestions.popular.length > 0 && (
                              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                                  🌍 More Destinations
                                </span>
                              </div>
                            )}
                            {categorizedSuggestions.other.map((suggestion, index) => (
                              <SuggestionItem
                                key={`other-${index}`}
                                suggestion={suggestion}
                                onSelect={selectDestination}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      destinationQuery.length >= 2 && (
                        <div className="p-6 text-center text-gray-500">
                          <MapPin className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                          <p className="text-sm font-medium mb-2">No destinations found</p>
                          <p className="text-xs mb-3">AI couldn't find matches for "{destinationQuery}"</p>
                          <button
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium bg-blue-100 hover:bg-blue-200 px-3 py-2 rounded-lg transition-colors"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={handleUseCustomDestination}
                          >
                            Use "{destinationQuery}" anyway
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* AI Search Status */}
            {isSearching && destinationQuery.length >= 2 && (
              <div className="mt-2 text-xs text-blue-600 flex items-center gap-2">
                <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span>AI is searching for destinations...</span>
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  Start Date
                </label>
                <input
                  type="date"
                  value={data.startDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    const newStartDate = e.target.value;
                    const days = data.endDate ? calculateDays(newStartDate, data.endDate) : 1;
                    onUpdate({ ...data, startDate: newStartDate, numberOfDays: days });
                  }}
                  className="w-full p-4 bg-white/70 border border-gray-300 rounded-xl text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 backdrop-blur-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  End Date
                </label>
                <input
                  type="date"
                  value={data.endDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    const newEndDate = e.target.value;
                    const days = data.startDate ? calculateDays(data.startDate, newEndDate) : 1;
                    onUpdate({ ...data, endDate: newEndDate, numberOfDays: days });
                  }}
                  className="w-full p-4 bg-white/70 border border-gray-300 rounded-xl text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 backdrop-blur-sm"
                />
              </div>
            </div>

            {/* Number of Days Display */}
            {data.numberOfDays > 1 && (
              <div className="p-4 bg-blue-50/80 rounded-xl border border-blue-200 backdrop-blur-sm">
                <p className="text-blue-700 font-medium">
                  Your trip is {data.numberOfDays} days long
                </p>
              </div>
            )}

            {/* Budget */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <DollarSign className="inline w-4 h-4 mr-1" />
                Budget Range
              </label>
              <div className="grid grid-cols-3 gap-3">
                {budgetOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleInputChange('budget', option.value as any)}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 backdrop-blur-sm ${
                      data.budget === option.value
                        ? 'border-blue-500 bg-blue-100/80 text-blue-700'
                        : 'border-gray-300 bg-white/50 text-gray-700 hover:border-gray-400 hover:bg-white/70'
                    }`}
                  >
                    <div className="text-xl mb-2">{option.icon}</div>
                    <div className="font-medium text-sm">{option.value}</div>
                    <div className={`text-xs mt-1 ${
                      data.budget === option.value ? 'text-blue-600' : 'text-gray-600'
                    }`}>{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Travel Group */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Users className="inline w-4 h-4 mr-1" />
                Who's traveling?
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {groupOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleInputChange('travelGroup', option.value as any)}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 backdrop-blur-sm ${
                      data.travelGroup === option.value
                        ? 'border-emerald-500 bg-emerald-100/80 text-emerald-700'
                        : 'border-gray-300 bg-white/50 text-gray-700 hover:border-gray-400 hover:bg-white/70'
                    }`}
                  >
                    <div className="text-xl mb-2">{option.icon}</div>
                    <div className="font-medium text-sm">{option.value}</div>
                    <div className={`text-xs mt-1 ${
                      data.travelGroup === option.value ? 'text-emerald-600' : 'text-gray-600'
                    }`}>{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Special Considerations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Special Considerations
              </label>
              <div className="space-y-3">
                <label className="flex items-center p-3 bg-white/50 rounded-xl cursor-pointer hover:bg-white/70 transition-all duration-200 backdrop-blur-sm border border-gray-200">
                  <input
                    type="checkbox"
                    checked={data.includeKids}
                    onChange={(e) => handleInputChange('includeKids', e.target.checked)}
                    className="mr-3 w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="flex items-center text-gray-700">
                    <span className="text-lg mr-2">👶</span>
                    Including children/kids
                  </span>
                </label>
                
                <label className="flex items-center p-3 bg-white/50 rounded-xl cursor-pointer hover:bg-white/70 transition-all duration-200 backdrop-blur-sm border border-gray-200">
                  <input
                    type="checkbox"
                    checked={data.includeElderly}
                    onChange={(e) => handleInputChange('includeElderly', e.target.checked)}
                    className="mr-3 w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="flex items-center text-gray-700">
                    <span className="text-lg mr-2">👴</span>
                    Including elderly travelers
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={onNext}
              disabled={!data.destination || !data.startDate || !data.endDate}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Next: Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

const SuggestionItem: React.FC<SuggestionItemProps> = ({ suggestion, onSelect }) => {
  return (
    <button
      className="w-full text-left p-3 hover:bg-blue-100/50 flex justify-between items-center transition-colors group border-b border-gray-200 last:border-b-0"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onSelect(suggestion)}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
          <MapPin className="w-4 h-4 text-blue-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-gray-800 group-hover:text-blue-700 truncate">
            {suggestion.name}
          </div>
          <div className="text-xs text-gray-600 truncate">
            {suggestion.country} • {suggestion.region}
          </div>
          {suggestion.description && (
            <div className="text-xs text-gray-500 truncate mt-1">
              {suggestion.description}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {suggestion.popular && (
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
            Popular
          </span>
        )}
        <div className="w-5 h-5 rounded-full bg-gray-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
          <span className="text-xs text-gray-600 group-hover:text-blue-700">→</span>
        </div>
      </div>
    </button>
  );
};

export default TravelInfoForm;