import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, X, Loader2, Image as ImageIcon, VolumeX } from 'lucide-react';
import { Coordinates, AIResponse } from '@shared/types';
import { chatAPI } from '../../services/api';
import { speechService } from '../../services/speech';

interface PhotoUploadProps {
  userLocation: Coordinates;
  onResponse: (response: AIResponse, inputType: 'text' | 'voice' | 'photo') => void;
  onClose: () => void;
  isLoading: boolean;
  onLoadingChange: (loading: boolean) => void;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  userLocation,
  onResponse,
  onClose,
  isLoading,
  onLoadingChange,
}) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isUsingCamera, setIsUsingCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('Image file must be smaller than 10MB');
      return;
    }

    setSelectedImage(file);
    setError(null);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Cleanup previous URL
    return () => URL.revokeObjectURL(url);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Use back camera on mobile
        audio: false,
      });
      
      setStream(mediaStream);
      setIsUsingCamera(true);
      setError(null);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Camera access error:', error);
      setError('Failed to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsUsingCamera(false);
  };

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

  const stopVoiceResponse = () => {
    speechService.stopSpeaking();
    setIsSpeaking(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        handleFileSelect(file);
        stopCamera();
      }
    }, 'image/jpeg', 0.8);
  };

  const handleSubmit = async () => {
    if (!selectedImage) {
      setError('Please select an image');
      return;
    }

    onLoadingChange(true);
    setError(null);

    try {
      const aiResponse = await chatAPI.sendPhoto(selectedImage, userLocation);
      onResponse(aiResponse, 'photo');
      onClose();
    } catch (error) {
      console.error('Photo analysis error:', error);
      setError(error instanceof Error ? error.message : 'Failed to analyze image');
    } finally {
      onLoadingChange(false);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      stopCamera();
    };
  }, [previewUrl]);

  return (
    <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-purple-600 text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5" />
            <h3 className="font-semibold">Photo Analysis</h3>
          </div>
          <div className="flex items-center space-x-2">
            {/* Stop Voice Response Button */}
            {isSpeaking && (
              <button
                onClick={stopVoiceResponse}
                className="flex items-center space-x-1 px-2 py-1 bg-red-500 hover:bg-red-600 rounded text-xs transition-colors"
                title="Stop Voice Response"
              >
                <VolumeX className="w-3 h-3" />
                <span>Stop</span>
              </button>
            )}
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="text-purple-100 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Camera View */}
        {isUsingCamera && (
          <div className="mb-6">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-48 object-cover"
              />
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-3">
                <button
                  onClick={capturePhoto}
                  className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors shadow-lg"
                >
                  <Camera className="w-6 h-6 text-gray-700" />
                </button>
                <button
                  onClick={stopCamera}
                  className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {/* Image Preview */}
        {previewUrl && !isUsingCamera && (
          <div className="mb-6">
            <div className="relative bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={previewUrl}
                alt="Selected"
                className="w-full h-48 object-cover"
              />
              <button
                onClick={clearImage}
                className="absolute top-2 right-2 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              <p><strong>File:</strong> {selectedImage?.name}</p>
              <p><strong>Size:</strong> {selectedImage ? (selectedImage.size / 1024 / 1024).toFixed(2) : 0}MB</p>
            </div>
          </div>
        )}

        {/* Upload Area */}
        {!selectedImage && !isUsingCamera && (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver
                ? 'border-purple-400 bg-purple-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="font-semibold text-gray-900 mb-2">Upload a Photo</h4>
            <p className="text-sm text-gray-600 mb-4">
              Take a photo of a landmark, building, or place to learn about it
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose File
              </button>
              
              <button
                onClick={startCamera}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                <Camera className="w-4 h-4 mr-2" />
                Use Camera
              </button>
            </div>
            
            <p className="text-xs text-gray-500 mt-3">
              Drag and drop an image here, or click to select
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">⚠️ {error}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="mb-6 text-center text-sm text-gray-600">
          {!selectedImage && !isUsingCamera && (
            <div>
              <p className="mb-2">📸 Capture or upload a photo for AI analysis</p>
              <p className="text-xs">
                Perfect for landmarks, buildings, monuments, or interesting places
              </p>
            </div>
          )}
          {selectedImage && (
            <div>
              <p className="mb-2">✨ Ready to analyze your photo</p>
              <p className="text-xs">
                I'll identify what's in the image and provide historical or cultural information
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {selectedImage && !isLoading && (
            <>
              <button
                onClick={handleSubmit}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
              >
                <Camera className="w-4 h-4" />
                <span>Analyze Photo</span>
              </button>
              
              <button
                onClick={clearImage}
                className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Clear
              </button>
            </>
          )}

          {isLoading && (
            <div className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-purple-100 text-purple-700 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing image...</span>
            </div>
          )}
        </div>

        {/* File Input (Hidden) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* File Format Info */}
        <div className="mt-4 text-xs text-gray-500 text-center">
          <p>Supported formats: JPG, PNG, GIF, WebP (max 10MB)</p>
          <p>📍 Location data will be included for better context</p>
        </div>
      </div>
    </div>
  );
};

export default PhotoUpload; 