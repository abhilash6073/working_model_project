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
    if (validationResult?.backendConfigured) return <AlertCircle className="w-6 h-6 text-yellow-500" />;
    return <XCircle className="w-6 h-6 text-red-500" />;
  };

  const getStatusColor = () => {
    if (validationResult?.isValid) return 'border-green-200 bg-green-50';
    if (validationResult?.backendConfigured) return 'border-yellow-200 bg-yellow-50';
    return 'border-red-200 bg-red-50';
  };

  const getStatusText = () => {
    if (isValidating) return 'Validating API...';
    if (validationResult?.isValid) return 'Google Places API via Supabase - Fully Functional';
    if (validationResult?.backendConfigured) return 'Supabase Backend - Configured, Places API Needs Setup';
    return 'Supabase Backend - Not Configured';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Google Places API via Supabase Backend</h2>
        <p className="text-gray-600">Configure Google Places API through Supabase backend to get real photos and avoid CORS issues</p>
      </div>

      {/* Current Status */}
      <div className={`p-6 rounded-xl border-2 mb-6 ${getStatusColor()}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h3 className="text-lg font-semibold text-gray-800">{getStatusText()}</h3>
              <p className="text-sm text-gray-600">
                Backend: {currentStatus.backendConfigured ? 'Configured' : 'Not Configured'} | 
                Supabase: {currentStatus.supabaseUrl} | 
                Auth: {currentStatus.hasAnonKey ? 'Ready' : 'Missing'}
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
                <p className="text-sm text-red-700 font-medium">
                  <strong>Error:</strong> {validationResult.error}
                </p>
                {!validationResult.backendConfigured && (
                  <p className="text-sm text-red-600 mt-2">
                    <strong>Note:</strong> Supabase backend is required to avoid CORS issues with Google Places API
                  </p>
                )}
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
                    Photo Fetching via Backend: {photoTestResult.success ? 'Working' : 'Limited'}
                  </span>
                </div>
                {photoTestResult.error && (
                  <p className="text-xs text-gray-600 mt-1">{photoTestResult.error}</p>
                )}
              </div>
            )}

            {/* Quota Status */}
            {validationResult.quotaStatus && validationResult.backendConfigured && (
              <div className={`p-3 rounded-lg border ${
                validationResult.quotaStatus === 'ok' 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-orange-50 border-orange-200'
              }`}>
                <p className="text-sm font-medium">
                  Backend API Status: {validationResult.quotaStatus === 'ok' ? 'Available' : 'Limited'}
                </p>
              </div>
            )}

            {/* Backend Status */}
            <div className={`p-3 rounded-lg border ${
              validationResult.backendConfigured 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  validationResult.backendConfigured ? 'bg-blue-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm font-medium">
                  Supabase Backend: {validationResult.backendConfigured ? 'Connected' : 'Not Configured'}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {validationResult.backendConfigured 
                  ? 'Using backend to avoid CORS issues with Google APIs'
                  : 'Backend required for Google Places API integration'
                }
              </p>
            </div>
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
            <span className="font-medium">Real Photos via Backend</span>
          </div>
          <p className="text-sm text-gray-600">
            {validationResult?.isValid ? 'Get actual photos via Supabase backend (no CORS issues)' : 'Using fallback images'}
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
            <span className="font-medium">CORS-Free Integration</span>
          </div>
          <p className="text-sm text-gray-600">
            {validationResult?.isValid ? 'Backend handles all API calls securely' : 'Direct API calls blocked by CORS'}
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
                  <h4 className="font-medium text-blue-800 mb-2">Backend Setup (Avoids CORS Issues):</h4>
                  <div className="space-y-3 text-sm text-blue-700">
                    {setupInstructions.map((instruction, index) => (
                      <div key={index}>
                        {instruction.startsWith('   •') ? (
                          <div className="ml-4 flex items-start gap-2">
                            <span className="text-blue-400">•</span>
                            <span>{instruction.substring(4)}</span>
                          </div>
                        ) : (
                          <div className="font-medium text-blue-800">{instruction}</div>
                        )}
                      </div>
                    ))}
                  </div>
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
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Supabase Dashboard
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Current .env Configuration */}
      <div className="mt-6 bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
        <div className="mb-2 text-gray-400"># Your .env file should have:</div>
        <div>VITE_SUPABASE_URL={currentStatus.backendConfigured ? '***configured***' : 'your_supabase_url_here'}</div>
        <div>VITE_SUPABASE_ANON_KEY={currentStatus.hasAnonKey ? '***configured***' : 'your_supabase_anon_key_here'}</div>
        <div className="mt-2 text-gray-400"># In Supabase Dashboard → Edge Functions → Environment Variables:</div>
        <div>GOOGLE_PLACES_API_KEY=your_actual_google_places_api_key_here</div>
        <div className="mt-2 text-gray-400 text-xs">
          Backend configuration avoids CORS issues with Google APIs
        </div>
      </div>
    </div>
  );
};

export default PlacesAPISetup;