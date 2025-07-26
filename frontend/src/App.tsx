import React, { useState, useCallback } from 'react';
import MapContainer from './components/Map/MapContainer';
import ChatInterface from './components/ChatInterface/ChatBot';
import VoiceInput from './components/VoiceInput/VoiceRecorder';
import PhotoUpload from './components/PhotoUpload/CameraCapture';
import { Coordinates, POI, ChatMessage, AIResponse } from '@shared/types';
import { MapPin, MessageCircle, Mic, Camera, Navigation } from 'lucide-react';

function App() {
  // State management
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeInput, setActiveInput] = useState<'text' | 'voice' | 'photo' | null>(null);
  const [mapMarkers, setMapMarkers] = useState<POI[]>([]);

  // Handle location updates from map
  const handleLocationUpdate = useCallback((location: Coordinates) => {
    setUserLocation(location);
  }, []);

  // Handle POI selection from map
  const handlePOISelect = useCallback((poi: POI) => {
    setSelectedPOI(poi);
  }, []);

  // Handle chat messages and AI responses
  const handleChatResponse = useCallback((response: AIResponse, inputType: 'text' | 'voice' | 'photo') => {
    // Update map markers if AI response includes map actions
    if (response.mapActions?.markers) {
      setMapMarkers(response.mapActions.markers);
    }

    // Center map if AI response includes center coordinates
    if (response.mapActions?.center) {
      setUserLocation(response.mapActions.center);
    }
  }, []);

  // Toggle input methods
  const toggleInputMethod = (method: 'text' | 'voice' | 'photo') => {
    setActiveInput(activeInput === method ? null : method);
  };

  return (
    <div className="h-screen w-screen relative bg-gray-100">
      {/* Main Map Container */}
      <div className="absolute inset-0">
        <MapContainer
          userLocation={userLocation}
          onLocationUpdate={handleLocationUpdate}
          onPOISelect={handlePOISelect}
          markers={mapMarkers}
          selectedPOI={selectedPOI}
        />
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-2">
            <MapPin className="w-6 h-6 text-primary-600" />
            <h1 className="text-xl font-bold text-gray-900">AI City Guide</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            {userLocation && (
              <div className="text-sm text-gray-600">
                {userLocation.lat.toFixed(4)}, {userLocation.lon.toFixed(4)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input Method Toggle Buttons */}
      <div className="absolute top-20 right-4 z-40 flex flex-col space-y-2">
        <button
          onClick={() => toggleInputMethod('text')}
          className={`p-3 rounded-full shadow-lg transition-all ${
            activeInput === 'text' 
              ? 'bg-primary-600 text-white' 
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
          title="Text Chat"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
        
        <button
          onClick={() => toggleInputMethod('voice')}
          className={`p-3 rounded-full shadow-lg transition-all ${
            activeInput === 'voice' 
              ? 'bg-secondary-600 text-white voice-recording' 
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
          title="Voice Input"
        >
          <Mic className="w-5 h-5" />
        </button>
        
        <button
          onClick={() => toggleInputMethod('photo')}
          className={`p-3 rounded-full shadow-lg transition-all ${
            activeInput === 'photo' 
              ? 'bg-purple-600 text-white' 
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
          title="Photo Analysis"
        >
          <Camera className="w-5 h-5" />
        </button>
      </div>

      {/* Chat Interface */}
      {activeInput === 'text' && (
        <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-1/3 z-40">
          <ChatInterface
            userLocation={userLocation}
            onResponse={handleChatResponse}
            messages={chatMessages}
            onMessagesChange={setChatMessages}
            isLoading={isLoading}
            onLoadingChange={setIsLoading}
          />
        </div>
      )}

      {/* Voice Input */}
      {activeInput === 'voice' && userLocation && (
        <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-1/3 z-40">
          <VoiceInput
            userLocation={userLocation}
            onResponse={handleChatResponse}
            onClose={() => setActiveInput(null)}
            isLoading={isLoading}
            onLoadingChange={setIsLoading}
          />
        </div>
      )}

      {/* Photo Upload */}
      {activeInput === 'photo' && userLocation && (
        <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-1/3 z-40">
          <PhotoUpload
            userLocation={userLocation}
            onResponse={handleChatResponse}
            onClose={() => setActiveInput(null)}
            isLoading={isLoading}
            onLoadingChange={setIsLoading}
          />
        </div>
      )}

      {/* Selected POI Info Panel */}
      {selectedPOI && (
        <div className="absolute top-20 left-4 z-40 bg-white rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{selectedPOI.name}</h3>
              <p className="text-sm text-gray-600 capitalize">{selectedPOI.category}</p>
              {selectedPOI.address && (
                <p className="text-xs text-gray-500 mt-1">{selectedPOI.address}</p>
              )}
              {selectedPOI.description && (
                <p className="text-sm text-gray-700 mt-2">{selectedPOI.description}</p>
              )}
            </div>
            <button
              onClick={() => setSelectedPOI(null)}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          {selectedPOI.website && (
            <a
              href={selectedPOI.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-primary-600 hover:text-primary-700 text-sm"
            >
              Visit Website →
            </a>
          )}
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              <span className="text-gray-700">Processing your request...</span>
            </div>
          </div>
        </div>
      )}

      {/* Location Permission Prompt */}
      {!userLocation && (
        <div className="absolute bottom-4 left-4 right-4 z-40 bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded">
          <div className="flex">
            <Navigation className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Location needed:</strong> Please enable location services to get personalized recommendations.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App; 