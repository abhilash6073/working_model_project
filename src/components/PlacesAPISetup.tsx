import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, ExternalLink, Key, Image, MapPin } from 'lucide-react';
import { placesValidator, type PlacesAPIValidationResult } from '../utils/placesValidator';

const PlacesAPISetup: React.FC = () => {
  const [validationResult, setValidationResult] = useState<PlacesAPIValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showSetupInstructions, setShowSetupInstructions] = useState(false);
  const [photoTestResult, setPhotoTestResult] = useState<{success: boolean, error?: string} | null>(null);

  const validateAPI = async () => {
    setIsValidating(true);
    try {
      const result = await placesValidator.validateConfiguration();
      setValidationResult(result);
      
      // If API is valid, test photo fetching
      if (result.isValid) {
        const photoTest = await placesValidator.testPhotoFetching();
        setPhotoTestResult(photoTest);
      }
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    validateAPI();
  }, []);

  const currentStatus = placesValidator.getCurrentStatus();
  const setupInstructions = placesValidator.getSetupInstructions();

  const getStatusIcon = () => {
    if (isValidating) return <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />;
    if (validationResult?.isValid) return <CheckCircle className="w-6 h-6 text-green-500" />;
    if (validationResult?.isConfigured) return <AlertCircle className="w-6 h-6 text-yellow-500" />;
    return <XCircle className="w-6 h-6 text-red-500" />;
  };

  const getStatusColor = () => {
    if (validationResult?.isValid) return 'border-green-200 bg-green-50';
    if (validationResult?.isConfigured) return 'border-yellow-200 bg-yellow-50';
    return 'border-red-200 bg-red-50';
  };

  const getStatusText = () => {
    if (isValidating) return 'Validating API...';
    if (validationResult?.isValid) return 'Google Places API - Fully Functional';
    if (validationResult?.isConfigured) return 'Google Places API - Configured but Not Working';
    return 'Google Places API - Not Configured';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Google Places API Configuration</h2>
        <p className="text-gray-600">Configure Google Places API to get real photos of places and restaurants</p>
      </div>

      {/* Current Status */}
      <div className={`p-6 rounded-xl border-2 mb-6 ${getStatusColor()}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h3 className="text-lg font-semibold text-gray-800">{getStatusText()}</h3>
              <p className="text-sm text-gray-600">
                Key Format: {currentStatus.keyFormat} | Length: {currentStatus.keyLength} characters
              </p>
            </div>
          </div>
          
          <button
            onClick={validateAPI}
            disabled={isValidating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
            {isValidating ? 'Testing...' : 'Test API'}
          </button>
        </div>

        {/* Validation Results */}
        {validationResult && (
          <div className="space-y-3">
            {validationResult.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700 font-medium">Error: {validationResult.error}</p>
              </div>
            )}

            {validationResult.suggestions && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-800">Recommendations:</h4>
                <ul className="space-y-1">
                  {validationResult.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Photo Test Results */}
            {photoTestResult && (
              <div className={`p-3 rounded-lg border ${
                photoTestResult.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  <span className="font-medium text-sm">
                    Photo Fetching: {photoTestResult.success ? 'Working' : 'Limited'}
                  </span>
                </div>
                {photoTestResult.error && (
                  <p className="text-xs text-gray-600 mt-1">{photoTestResult.error}</p>
                )}
              </div>
            )}

            {/* Quota Status */}
            {validationResult.quotaStatus && (
              <div className={`p-3 rounded-lg border ${
                validationResult.quotaStatus === 'ok' 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-orange-50 border-orange-200'
              }`}>
                <p className="text-sm font-medium">
                  Quota Status: {validationResult.quotaStatus === 'ok' ? 'Available' : 'Exceeded'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Features Enabled */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`p-4 rounded-xl border ${
          validationResult?.isValid ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Image className={`w-5 h-5 ${validationResult?.isValid ? 'text-green-600' : 'text-gray-400'}`} />
            <span className="font-medium">Real Photos</span>
          </div>
          <p className="text-sm text-gray-600">
            {validationResult?.isValid ? 'Get actual photos of places and restaurants' : 'Using fallback images'}
          </p>
        </div>

        <div className={`p-4 rounded-xl border ${
          validationResult?.isValid ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <MapPin className={`w-5 h-5 ${validationResult?.isValid ? 'text-green-600' : 'text-gray-400'}`} />
            <span className="font-medium">Place Details</span>
          </div>
          <p className="text-sm text-gray-600">
            {validationResult?.isValid ? 'Enhanced location information' : 'Basic location data only'}
          </p>
        </div>

        <div className={`p-4 rounded-xl border ${
          validationResult?.isValid ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className={`w-5 h-5 ${validationResult?.isValid ? 'text-green-600' : 'text-gray-400'}`} />
            <span className="font-medium">Quality</span>
          </div>
          <p className="text-sm text-gray-600">
            {validationResult?.isValid ? 'High-quality, verified content' : 'Standard quality content'}
          </p>
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="bg-gray-50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Setup Instructions</h3>
          <button
            onClick={() => setShowSetupInstructions(!showSetupInstructions)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {showSetupInstructions ? 'Hide' : 'Show'} Instructions
          </button>
        </div>

        {showSetupInstructions && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Key className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">Step-by-Step Setup:</h4>
                  <ol className="space-y-2 text-sm text-blue-700">
                    {setupInstructions.map((instruction, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="font-medium min-w-[20px]">{index + 1}.</span>
                        <span>{instruction.replace(/^\d+\.\s*/, '')}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Google Cloud Console
              </a>
              
              <a
                href="https://console.cloud.google.com/apis/library/places-backend.googleapis.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Enable Places API
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Current .env Configuration */}
      <div className="mt-6 bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
        <div className="mb-2 text-gray-400"># Add this to your .env file:</div>
        <div>VITE_GOOGLE_PLACES_API_KEY={currentStatus.configured ? '***configured***' : 'your_actual_api_key_here'}</div>
        <div className="mt-2 text-gray-400 text-xs">
          Remember to restart your development server after adding the API key
        </div>
      </div>
    </div>
  );
};

export default PlacesAPISetup;