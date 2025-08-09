import React, { useState, useEffect } from 'react';
import { Plane, MapPin, Calendar, Users } from 'lucide-react';

interface HeroProps {
  onGetStarted: () => void;
}

// Curated travel background images
const backgroundImages = {
  auto: [
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80', // Lake and mountains
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80', // Mountain landscape
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2073&q=80', // Tropical beach
    'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80', // City skyline
    'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80', // Architecture
    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80', // Lake sunset
  ],
  beach: [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2073&q=80',
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
    'https://images.unsplash.com/photo-1559827260-dc66d52bef19?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
  ],
  city: [
    'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
    'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
    'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?ixlib=rb-4.0.3&auto=format&fit=crop&w=2044&q=80',
    'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1f?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
  ],
  mountains: [
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
    'https://images.unsplash.com/photo-1464822759844-d150baec0494?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
  ],
  nightlife: [
    'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
    'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?ixlib=rb-4.0.3&auto=format&fit=crop&w=2044&q=80',
    'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1f?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
    'https://images.unsplash.com/photo-1519501025264-65ba15a82390?ixlib=rb-4.0.3&auto=format&fit=crop&w=2064&q=80',
  ]
};

const Hero: React.FC<HeroProps> = ({ onGetStarted }) => {
  const [currentTheme, setCurrentTheme] = useState<keyof typeof backgroundImages>('auto');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());

  // Preload images
  useEffect(() => {
    const preloadImage = (src: string) => {
      if (preloadedImages.has(src)) return;
      
      const img = new Image();
      img.onload = () => {
        setPreloadedImages(prev => new Set([...prev, src]));
        if (src === backgroundImages[currentTheme][0]) {
          setIsImageLoaded(true);
        }
      };
      img.src = src;
    };

    // Preload first image immediately
    preloadImage(backgroundImages[currentTheme][0]);
    
    // Preload other images in background
    setTimeout(() => {
      backgroundImages[currentTheme].slice(1).forEach(preloadImage);
    }, 100);
  }, [currentTheme, preloadedImages]);

  // Auto-rotate images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex(prev => 
        (prev + 1) % backgroundImages[currentTheme].length
      );
    }, 8000);

    return () => clearInterval(interval);
  }, [currentTheme]);

  // Reset image index when theme changes
  useEffect(() => {
    setCurrentImageIndex(0);
    setIsImageLoaded(false);
  }, [currentTheme]);

  const currentImage = backgroundImages[currentTheme][currentImageIndex];

  const themeOptions = [
    { key: 'auto' as const, label: 'Auto', icon: '🌍' },
    { key: 'beach' as const, label: 'Beach', icon: '🏖️' },
    { key: 'city' as const, label: 'City', icon: '🏙️' },
    { key: 'mountains' as const, label: 'Mountains', icon: '⛰️' },
    { key: 'nightlife' as const, label: 'Nightlife', icon: '🌃' },
  ];

  return (
    <main className="relative h-screen w-full overflow-hidden">
      {/* Background Image Slideshow */}
      <div className="absolute inset-0">
        {backgroundImages[currentTheme].map((image, index) => (
          <div
            key={`${currentTheme}-${index}`}
            className={`absolute inset-0 transition-opacity duration-1500 ease-in-out ${
              index === currentImageIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={image}
              alt={`Travel destination ${index + 1}`}
              className="h-full w-full object-cover"
              loading={index === 0 ? 'eager' : 'lazy'}
            />
          </div>
        ))}
        
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/35 to-black/45" />
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 p-6">
        <div className="flex items-center">
          <div className="flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
              <Plane className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-lg">GlobeTrotter AI</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 h-full flex items-center justify-center px-6">
        <div className="text-center max-w-4xl mx-auto">
          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Plan a Perfect Trip,{' '}
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Instantly
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-white/90 mb-12 font-light max-w-2xl mx-auto leading-relaxed">
            AI-powered travel planning that creates personalized itineraries in seconds
          </p>

          {/* CTA Button */}
          <button
            onClick={onGetStarted}
            className="group relative inline-flex items-center gap-3 px-12 py-5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold text-xl rounded-2xl shadow-2xl hover:shadow-blue-500/25 transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/50"
            aria-label="Start planning your trip"
          >
            <MapPin className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
            Plan My Trip
            <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
        </div>
      </div>

      {/* Loading State for First Image */}
      {!isImageLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center z-5">
          <div className="text-center text-white">
            <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium">Loading your journey...</p>
          </div>
        </div>
      )}

      {/* Accessibility: Screen reader content */}
      <div className="sr-only">
        <h2>Travel Planning Application</h2>
        <p>
          GlobeTrotter AI helps you plan perfect trips with AI-powered itinerary generation.
          Choose your travel theme and start planning your next adventure.
        </p>
      </div>
    </main>
  );
};

export default Hero;