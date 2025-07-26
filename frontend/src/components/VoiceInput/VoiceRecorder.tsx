import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, X, Loader2 } from 'lucide-react';
import { Coordinates, AIResponse } from '@shared/types';
import { speechService } from '../../services/speech';
import { chatAPI } from '../../services/api';

interface VoiceInputProps {
  userLocation: Coordinates;
  onResponse: (response: AIResponse, inputType: 'text' | 'voice' | 'photo') => void;
  onClose: () => void;
  isLoading: boolean;
  onLoadingChange: (loading: boolean) => void;
}

const VoiceInput: React.FC<VoiceInputProps> = ({
  userLocation,
  onResponse,
  onClose,
  isLoading,
  onLoadingChange,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if speech recognition is supported
    if (!speechService.isSpeechRecognitionSupported()) {
      setIsSupported(false);
      setError('Speech recognition is not supported in this browser');
    }
  }, []);

  useEffect(() => {
    // Auto-submit after 2 seconds of silence
    if (finalTranscript && !isListening && !isLoading) {
      timeoutRef.current = setTimeout(() => {
        handleSubmit();
      }, 2000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [finalTranscript, isListening, isLoading]);

  const startListening = async () => {
    try {
      setError(null);
      setTranscript('');
      setFinalTranscript('');
      
      await speechService.startListening(
        (transcript, isFinal) => {
          if (isFinal) {
            setFinalTranscript(transcript);
            setTranscript('');
          } else {
            setTranscript(transcript);
          }
        },
        (error) => {
          setError(error);
          setIsListening(false);
        },
        {
          continuous: false,
          interimResults: true,
          language: 'en-US',
        }
      );
      
      setIsListening(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start listening');
    }
  };

  const stopListening = () => {
    speechService.stopListening();
    setIsListening(false);
  };

  const handleSubmit = async () => {
    const textToSubmit = finalTranscript || transcript;
    
    if (!textToSubmit.trim()) {
      setError('No speech detected. Please try again.');
      return;
    }

    onLoadingChange(true);
    
    try {
      const aiResponse = await chatAPI.sendVoiceMessage(textToSubmit, userLocation);
      onResponse(aiResponse, 'voice');
      
      // Optional: Speak the response
      if (speechService.isSpeechSynthesisSupported() && aiResponse.text) {
        try {
          await speechService.speak(aiResponse.text, {
            rate: 0.9,
            pitch: 1,
            volume: 0.8,
          });
        } catch (speechError) {
          console.warn('Speech synthesis failed:', speechError);
        }
      }
      
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to process voice input');
    } finally {
      onLoadingChange(false);
    }
  };

  const clearTranscript = () => {
    setTranscript('');
    setFinalTranscript('');
    setError(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  if (!isSupported) {
    return (
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-6">
        <div className="text-center">
          <MicOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">Speech Recognition Unavailable</h3>
          <p className="text-sm text-gray-600 mb-4">
            Your browser doesn't support speech recognition. Please use text input instead.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-secondary-600 text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Mic className="w-5 h-5" />
            <h3 className="font-semibold">Voice Input</h3>
          </div>
          <button
            onClick={onClose}
            className="text-secondary-100 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Voice Visualization */}
        <div className="text-center mb-6">
          <div className={`relative inline-flex items-center justify-center w-24 h-24 rounded-full ${
            isListening ? 'bg-secondary-100' : 'bg-gray-100'
          } mb-4`}>
            {isLoading ? (
              <Loader2 className="w-8 h-8 text-secondary-600 animate-spin" />
            ) : (
              <Mic className={`w-8 h-8 ${
                isListening ? 'text-secondary-600 animate-pulse' : 'text-gray-400'
              }`} />
            )}
            
            {isListening && (
              <div className="absolute inset-0 rounded-full border-4 border-secondary-300 animate-ping"></div>
            )}
          </div>
          
          <div className="space-y-1">
            {isListening && (
              <p className="text-sm font-medium text-secondary-600">
                🎤 Listening...
              </p>
            )}
            {finalTranscript && (
              <p className="text-sm text-green-600">
                ✓ Speech captured
              </p>
            )}
            {error && (
              <p className="text-sm text-red-600">
                ⚠️ {error}
              </p>
            )}
          </div>
        </div>

        {/* Transcript Display */}
        {(transcript || finalTranscript) && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
            <div className="text-sm text-gray-600 mb-1">Transcript:</div>
            <div className="text-gray-900">
              {finalTranscript && (
                <span className="font-medium">{finalTranscript}</span>
              )}
              {transcript && (
                <span className="text-gray-500 italic"> {transcript}</span>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mb-6 text-center text-sm text-gray-600">
          {!isListening && !finalTranscript && (
            <div>
              <p className="mb-2">Tap the microphone to start speaking</p>
              <p className="text-xs">
                Ask about nearby places, attractions, or recommendations
              </p>
            </div>
          )}
          {isListening && (
            <div>
              <p className="mb-2">Speak clearly into your microphone</p>
              <p className="text-xs">I'll process your question when you're done</p>
            </div>
          )}
          {finalTranscript && !isLoading && (
            <div>
              <p className="mb-2">Processing your question in 2 seconds...</p>
              <p className="text-xs">Tap "Send Now" to submit immediately</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex space-x-3">
          {!isListening ? (
            <button
              onClick={startListening}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Mic className="w-4 h-4" />
              <span>Start Recording</span>
            </button>
          ) : (
            <button
              onClick={stopListening}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            >
              <MicOff className="w-4 h-4" />
              <span>Stop Recording</span>
            </button>
          )}

          {finalTranscript && !isLoading && (
            <>
              <button
                onClick={handleSubmit}
                className="px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
              >
                Send Now
              </button>
              
              <button
                onClick={clearTranscript}
                className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Clear
              </button>
            </>
          )}
        </div>

        {/* Speech Synthesis Info */}
        {speechService.isSpeechSynthesisSupported() && (
          <div className="mt-4 flex items-center justify-center text-xs text-gray-500">
            <Volume2 className="w-3 h-3 mr-1" />
            <span>AI responses will be read aloud</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceInput; 