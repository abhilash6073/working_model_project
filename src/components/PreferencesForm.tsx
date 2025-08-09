import React from 'react';
import { Heart, Utensils, Leaf } from 'lucide-react';
import { tripTypes, cuisineOptions, dietaryOptions } from '../data/destinations';
import type { TripPreferences } from '../types';

interface PreferencesFormProps {
  data: TripPreferences;
  onUpdate: (data: TripPreferences) => void;
  onNext: () => void;
  onBack: () => void;
}

const PreferencesForm: React.FC<PreferencesFormProps> = ({ data, onUpdate, onNext, onBack }) => {
  const handleToggleSelection = (field: keyof TripPreferences, value: string) => {
    const currentValues = data[field] as string[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    
    onUpdate({ ...data, [field]: newValues });
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow-xl">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">🌍 Trip Preferences</h2>
        <p className="text-gray-600">Tell us what makes your perfect trip</p>
      </div>

      <div className="space-y-8">
        {/* Trip Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            <Heart className="inline w-4 h-4 mr-1" />
            What type of experience are you looking for? (Select multiple)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tripTypes.map(type => (
              <button
                key={type.id}
                onClick={() => handleToggleSelection('tripType', type.id)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                  data.tripType.includes(type.id)
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{type.icon}</span>
                  <div>
                    <div className="font-medium">{type.name}</div>
                    <div className="text-sm text-gray-500 mt-1">{type.description}</div>
                  </div>
                </div>
                {data.tripType.includes(type.id) && (
                  <div className="mt-2 text-green-600">✓ Selected</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Cuisine Preferences */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            <Utensils className="inline w-4 h-4 mr-1" />
            Cuisine Preferences (Select multiple)
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {cuisineOptions.map(cuisine => (
              <button
                key={cuisine.id}
                onClick={() => handleToggleSelection('cuisinePreferences', cuisine.id)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  data.cuisinePreferences.includes(cuisine.id)
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">{cuisine.icon}</div>
                <div className="font-medium text-sm">{cuisine.name}</div>
                {data.cuisinePreferences.includes(cuisine.id) && (
                  <div className="mt-2 text-orange-600 text-xs">✓ Selected</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Dietary Requirements */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            <Leaf className="inline w-4 h-4 mr-1" />
            Dietary Requirements (Select all that apply)
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {dietaryOptions.map(diet => (
              <button
                key={diet.id}
                onClick={() => handleToggleSelection('dietaryRequirements', diet.id)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  data.dietaryRequirements.includes(diet.id)
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">{diet.icon}</div>
                <div className="font-medium text-sm">{diet.name}</div>
                {data.dietaryRequirements.includes(diet.id) && (
                  <div className="mt-2 text-purple-600 text-xs">✓ Selected</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        {(data.tripType.length > 0 || data.cuisinePreferences.length > 0 || data.dietaryRequirements.length > 0) && (
          <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
            <h3 className="font-semibold text-gray-800 mb-3">Your Preferences Summary:</h3>
            <div className="space-y-2 text-sm">
              {data.tripType.length > 0 && (
                <div>
                  <span className="font-medium">Trip Style:</span> {data.tripType.join(', ')}
                </div>
              )}
              {data.cuisinePreferences.length > 0 && (
                <div>
                  <span className="font-medium">Cuisines:</span> {data.cuisinePreferences.join(', ')}
                </div>
              )}
              {data.dietaryRequirements.length > 0 && (
                <div>
                  <span className="font-medium">Dietary:</span> {data.dietaryRequirements.join(', ')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-between">
        <button
          onClick={onBack}
          className="px-8 py-4 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200"
        >
          ← Back
        </button>
        
        <button
          onClick={onNext}
          className="px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white font-semibold rounded-xl hover:from-green-700 hover:to-blue-700 transition-all duration-200"
        >
          Generate My Trip ✨
        </button>
      </div>
    </div>
  );
};

export default PreferencesForm;