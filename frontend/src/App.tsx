import { useState, useCallback, useEffect } from 'react';
import MapContainer from './components/Map/MapContainer';
import ChatInterface from './components/ChatInterface/ChatBot';
import VoiceInput from './components/VoiceInput/VoiceRecorder';
import PhotoUpload from './components/PhotoUpload/CameraCapture';
import { Coordinates, POI, ChatMessage, AIResponse } from '@shared/types';
import { MapPin, MessageCircle, Mic, Camera, Navigation, VolumeX } from 'lucide-react';
import { speechService } from './services/speech';
import { locationAPI, chatAPI } from './services/api';

function App() {
  // State management
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeInput, setActiveInput] = useState<'text' | 'voice' | 'photo' | null>(null);
  const [mapMarkers, setMapMarkers] = useState<POI[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAttractions, setIsLoadingAttractions] = useState(false);

  // Monitor speech synthesis state
  useEffect(() => {
    const checkSpeakingState = () => {
      setIsSpeaking(speechService.getIsSpeaking());
    };

    // Check initially
    checkSpeakingState();

    // Set up interval to monitor speaking state
    const interval = setInterval(checkSpeakingState, 100);

    return () => clearInterval(interval);
  }, []);

  // Handle location updates from map
  const handleLocationUpdate = useCallback(async (location: Coordinates) => {
    setUserLocation(location);
    
    // Automatically fetch nearby attractions when location is available
    setIsLoadingAttractions(true);
    try {
      const response = await locationAPI.getNearbyPOIs(
        location.lat,
        location.lon,
        1000, // 1km radius
        ['tourism', 'leisure'] // Focus on attractions
      );
      
      if (response.pois && response.pois.length > 0) {
        setMapMarkers(response.pois);
      }
    } catch (error) {
      console.error('Error fetching nearby attractions:', error);
    } finally {
      setIsLoadingAttractions(false);
    }
  }, []);

  // Handle POI selection from map
  const handlePOISelect = useCallback((poi: POI | null) => {
    setSelectedPOI(poi);
  }, []);

  // Handle POI double-click to get AI information
  const handlePOIDoubleClick = useCallback(async (poi: POI) => {
    if (!userLocation) return;
    
    // Open the chat interface
    setActiveInput('text');
    
    setIsLoading(true);
    try {
      const response = await chatAPI.getAttractionInfo(poi, userLocation);
      
      // Add the AI response to chat messages
      const aiMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: response.text,
        timestamp: new Date(),
        inputType: 'text',
        location: userLocation,
      };
      
      setChatMessages(prev => [...prev, aiMessage]);
      
    } catch (error) {
      console.error('Error getting attraction info:', error);
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: 'Sorry, I couldn\'t get information about this attraction right now. Please try again.',
        timestamp: new Date(),
        inputType: 'text',
        location: userLocation,
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [userLocation]);

  // Handle chat messages and AI responses
  const handleChatResponse = useCallback((response: AIResponse, inputType: 'text' | 'voice' | 'photo') => {
    console.log('handleChatResponse called:', { inputType, hasText: !!response.text, textLength: response.text?.length });
    
    // For photo responses, add the AI response to chat messages and switch to text interface
    if (inputType === 'photo' && userLocation) {
      const aiMessage: ChatMessage = {
        id: `photo_response_${Date.now()}`,
        type: 'assistant',
        content: response.text,
        timestamp: new Date(),
        inputType: 'photo',
        location: userLocation,
      };
      
      console.log('Adding photo response to chat messages');
      setChatMessages(prev => [...prev, aiMessage]);
      
      // Switch to text chat interface to show the response
      setActiveInput('text');
      
      // Auto-speak the response if speech is enabled
      if (response.text) {
        speechService.speak(response.text);
      }
    }
    
    // Only update map markers if this is a text/voice query asking for recommendations
    if (inputType === 'text' || inputType === 'voice') {
      if (response.mapActions?.markers && response.mapActions.markers.length > 0) {
        setMapMarkers(response.mapActions.markers);
      }
    }

    // Center map if AI response includes center coordinates
    if (response.mapActions?.center) {
      setUserLocation(response.mapActions.center);
    }
  }, [userLocation]);

  // Stop voice response
  const handleStopVoice = useCallback(() => {
    speechService.stopSpeaking();
    setIsSpeaking(false);
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
          onPOIDoubleClick={handlePOIDoubleClick}
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
            {isLoadingAttractions && (
              <div className="flex items-center space-x-1 text-sm text-primary-600">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-600"></div>
                <span>Loading attractions...</span>
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

        {/* Stop Voice Response Button */}
        {isSpeaking && (
          <button
            onClick={handleStopVoice}
            className="p-3 rounded-full shadow-lg transition-all bg-red-600 text-white hover:bg-red-700 animate-pulse"
            title="Stop Voice Response"
          >
            <VolumeX className="w-5 h-5" />
          </button>
        )}
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
          
          <button
            onClick={() => handlePOIDoubleClick(selectedPOI)}
            className="inline-block mt-2 ml-2 text-secondary-600 hover:text-secondary-700 text-sm"
            title="Get AI information about this attraction"
          >
            🤖 Ask AI →
          </button>
        </div>
      )}

      {/* Attractions Info Panel */}
      {userLocation && mapMarkers.length > 0 && !isLoadingAttractions && !selectedPOI && (
        <div className="absolute top-20 left-4 z-40 bg-white rounded-lg shadow-lg p-3 max-w-sm">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-primary-600" />
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                {mapMarkers.length} Nearby Attractions
              </h3>
              <p className="text-xs text-gray-600">
                Within 1km radius
              </p>
              <p className="text-xs text-primary-600 mt-1">
                💡 Double-click any attraction for AI information
              </p>
            </div>
          </div>
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