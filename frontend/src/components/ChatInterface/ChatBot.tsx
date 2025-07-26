import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, MapPin } from 'lucide-react';
import { Coordinates, ChatMessage, AIResponse } from '@shared/types';
import { chatAPI } from '../../services/api';

interface ChatInterfaceProps {
  userLocation: Coordinates | null;
  onResponse: (response: AIResponse, inputType: 'text' | 'voice' | 'photo') => void;
  messages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
  isLoading: boolean;
  onLoadingChange: (loading: boolean) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  userLocation,
  onResponse,
  messages,
  onMessagesChange,
  isLoading,
  onLoadingChange,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Focus input when component mounts
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputText.trim() || !userLocation || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
      inputType: 'text',
      location: userLocation,
    };

    const newMessages = [...messages, userMessage];
    onMessagesChange(newMessages);
    setInputText('');
    onLoadingChange(true);

    try {
      const aiResponse = await chatAPI.sendTextMessage(inputText.trim(), userLocation);
      
      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        type: 'assistant',
        content: aiResponse.text,
        timestamp: new Date(),
      };

      onMessagesChange([...newMessages, assistantMessage]);
      onResponse(aiResponse, 'text');
    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        type: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date(),
      };

      onMessagesChange([...newMessages, errorMessage]);
    } finally {
      onLoadingChange(false);
    }
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.type === 'user';
    
    return (
      <div
        key={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div
          className={`max-w-[80%] rounded-lg px-4 py-2 ${
            isUser
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-900 shadow-sm border border-gray-200'
          }`}
        >
          <div className="text-sm">
            {message.content}
          </div>
          
          {message.inputType && (
            <div className="flex items-center mt-1 text-xs opacity-70">
              {message.inputType === 'voice' && '🎤'}
              {message.inputType === 'photo' && '📷'}
              {message.inputType === 'text' && '💬'}
              <span className="ml-1 capitalize">{message.inputType}</span>
            </div>
          )}
          
          <div className="text-xs opacity-70 mt-1">
            {message.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      </div>
    );
  };

  const suggestedQueries = [
    "What's a good restaurant nearby?",
    "Tell me about attractions in this area",
    "Where can I find coffee?",
    "What should I visit here?",
  ];

  return (
    <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-primary-600 text-white px-4 py-3">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <h3 className="font-semibold">AI City Guide</h3>
          {userLocation && (
            <div className="flex items-center text-primary-100 text-xs">
              <MapPin className="w-3 h-3 mr-1" />
              <span>
                {userLocation.lat.toFixed(3)}, {userLocation.lon.toFixed(3)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div className="h-64 overflow-y-auto p-4 custom-scrollbar bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <div className="text-4xl mb-4">🗺️</div>
            <h4 className="font-semibold mb-2">Welcome to AI City Guide!</h4>
            <p className="text-sm mb-4">
              Ask me anything about your surroundings, nearby attractions, restaurants, or local recommendations.
            </p>
            
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600">Try asking:</p>
              {suggestedQueries.map((query, index) => (
                <button
                  key={index}
                  onClick={() => setInputText(query)}
                  className="block w-full text-left text-xs bg-white hover:bg-gray-100 rounded px-3 py-2 border border-gray-200 transition-colors"
                >
                  "{query}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map(renderMessage)}
            
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="bg-white rounded-lg px-4 py-2 shadow-sm border border-gray-200">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
        {!userLocation && (
          <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
            Please enable location services to get personalized recommendations.
          </div>
        )}
        
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              userLocation 
                ? "Ask me about nearby places, attractions, or recommendations..."
                : "Enable location to start chatting..."
            }
            disabled={!userLocation || isLoading}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
          />
          
          <button
            type="submit"
            disabled={!inputText.trim() || !userLocation || isLoading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface; 