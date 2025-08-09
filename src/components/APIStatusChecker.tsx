import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { apiChecker, type APIStatus } from '../utils/apiChecker';

const APIStatusChecker: React.FC = () => {
  const [apiStatuses, setApiStatuses] = useState<APIStatus[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkAPIs = async () => {
    setIsChecking(true);
    try {
      const results = await apiChecker.checkAllAPIs();
      setApiStatuses(results);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Error checking APIs:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkAPIs();
  }, []);

  const getStatusIcon = (api: APIStatus) => {
    if (api.valid) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (api.configured) return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  const getStatusText = (api: APIStatus) => {
    if (api.valid) return 'Fully Functional';
    if (api.configured) return 'Configured (Validation Failed)';
    return 'Not Configured';
  };

  const getStatusColor = (api: APIStatus) => {
    if (api.valid) return 'border-green-200 bg-green-50';
    if (api.configured) return 'border-yellow-200 bg-yellow-50';
    return 'border-red-200 bg-red-50';
  };

  const configuredCount = apiStatuses.filter(api => api.configured).length;
  const validCount = apiStatuses.filter(api => api.valid).length;
  const totalCount = apiStatuses.length;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-xl">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">API Configuration Status</h2>
          <button
            onClick={checkAPIs}
            disabled={isChecking}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Refresh'}
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">{configuredCount}/{totalCount}</div>
            <div className="text-sm text-blue-700">APIs Configured</div>
          </div>
          <div className="bg-green-50 p-4 rounded-xl border border-green-200">
            <div className="text-2xl font-bold text-green-600">{validCount}/{totalCount}</div>
            <div className="text-sm text-green-700">APIs Validated</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round((validCount / totalCount) * 100)}%
            </div>
            <div className="text-sm text-purple-700">Functionality</div>
          </div>
        </div>

        {lastChecked && (
          <p className="text-sm text-gray-500 mb-4">
            Last checked: {lastChecked.toLocaleString()}
          </p>
        )}
      </div>

      {/* API Status Cards */}
      <div className="space-y-4">
        {apiStatuses.map((api, index) => (
          <div
            key={index}
            className={`p-4 rounded-xl border-2 transition-all ${getStatusColor(api)}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {getStatusIcon(api)}
                <div>
                  <h3 className="font-semibold text-gray-800">{api.name}</h3>
                  <p className="text-sm text-gray-600">{getStatusText(api)}</p>
                </div>
              </div>
              
              {!api.configured && (
                <a
                  href={api.setupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Setup <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="mb-3">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Functionality:</span> {api.functionality}
              </p>
            </div>

            {api.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">
                  <span className="font-medium">Error:</span> {api.error}
                </p>
              </div>
            )}

            {api.valid && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-700 font-medium">
                  ✅ API is working correctly and ready to use!
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Setup Instructions */}
      <div className="mt-8 p-6 bg-gray-50 rounded-xl">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Setup Instructions</h3>
        <div className="space-y-3 text-sm text-gray-700">
          <div>
            <span className="font-medium">1. Google Gemini AI:</span> Visit{' '}
            <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Google AI Studio
            </a>{' '}
            to get your API key
          </div>
          <div>
            <span className="font-medium">2. Google Places/Maps:</span> Visit{' '}
            <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Google Cloud Console
            </a>{' '}
            to get API keys, then add them to Supabase Edge Functions environment variables
          </div>
          <div>
            <span className="font-medium">3. Supabase (Optional):</span> Visit{' '}
            <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Supabase Dashboard
            </a>{' '}
            to create a project and get your keys
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-blue-800">
              <span className="font-medium">💡 Tip:</span> Add your API keys to the .env file and restart the development server.
              For Google APIs, add keys to Supabase Edge Functions environment variables to avoid CORS issues.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default APIStatusChecker;