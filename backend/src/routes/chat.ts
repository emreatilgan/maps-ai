import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { MistralService } from '../services/mistralService';
import { LocationService } from '../services/locationService';
import { ChatRequest } from '@shared/types';

const router = express.Router();

// Lazy initialization to ensure environment variables are loaded
let mistralService: MistralService | null = null;
let locationService: LocationService | null = null;

const getMistralService = () => {
  if (!mistralService) {
    try {
      console.log('Initializing MistralService...');
      mistralService = new MistralService();
      console.log('MistralService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MistralService:', error);
      throw error;
    }
  }
  return mistralService;
};

const getLocationService = () => {
  if (!locationService) {
    try {
      console.log('Initializing LocationService...');
      locationService = new LocationService();
      console.log('LocationService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize LocationService:', error);
      throw error;
    }
  }
  return locationService;
};

// Configure multer for photo uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Text-based chat endpoint
router.post('/text', async (req, res) => {
  try {
    const { message, location, poiContext } = req.body as ChatRequest & { poiContext?: any };

    if (!message || !location) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Both message and location are required',
      });
    }

    // Get location context and nearby POIs
    const { nearbyPOIs } = await getLocationService().enrichLocationContext(location);

    // Process query with Mistral, including POI context if available
    const aiResponse = await getMistralService().processTextQuery(
      message,
      location,
      nearbyPOIs,
      poiContext
    );

    res.json({
      id: uuidv4(),
      response: aiResponse,
      location,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Text chat error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process text query',
    });
  }
});

// Voice-based chat endpoint
router.post('/voice', async (req, res) => {
  try {
    const { message, location } = req.body as ChatRequest;

    if (!message || !location) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Both transcribed message and location are required',
      });
    }

    // Get location context and nearby POIs
    const { nearbyPOIs } = await getLocationService().enrichLocationContext(location);

    // Process query with Mistral (same as text, but may add voice-specific context)
    const aiResponse = await getMistralService().processTextQuery(
      `[Voice Query] ${message}`,
      location,
      nearbyPOIs
    );

    res.json({
      id: uuidv4(),
      response: aiResponse,
      location,
      timestamp: new Date().toISOString(),
      inputType: 'voice',
    });
  } catch (error) {
    console.error('Voice chat error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process voice query',
    });
  }
});

// Photo-based chat endpoint
router.post('/photo', upload.single('image'), async (req, res) => {
  console.log('=== Photo Analysis Request Started ===');
  try {
    const { location } = req.body;
    const imageFile = req.file;

    console.log('Request data:', {
      hasLocation: !!location,
      hasImage: !!imageFile,
      imageSize: imageFile?.size,
      imageMimeType: imageFile?.mimetype
    });

    if (!location || !imageFile) {
      console.error('Missing required fields:', { location: !!location, imageFile: !!imageFile });
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Both location and image are required',
      });
    }

    let locationObj;
    try {
      locationObj = JSON.parse(location);
      console.log('Parsed location:', locationObj);
    } catch (parseError) {
      console.error('Failed to parse location JSON:', parseError);
      return res.status(400).json({
        error: 'Invalid location data',
        message: 'Location must be valid JSON',
      });
    }

    // Convert image to base64
    console.log('Converting image to base64...');
    const imageBase64 = imageFile.buffer.toString('base64');
    console.log(`Image converted to base64, length: ${imageBase64.length}`);

    // Get location context and nearby POIs
    console.log('Getting location context...');
    const { nearbyPOIs } = await getLocationService().enrichLocationContext(locationObj);
    console.log(`Found ${nearbyPOIs.length} nearby POIs`);

    // Analyze photo with Mistral Pixtral
    console.log('Starting Mistral image analysis...');
    const aiResponse = await getMistralService().analyzePhoto(
      imageBase64,
      locationObj,
      nearbyPOIs
    );
    console.log('Mistral analysis completed successfully');

    const response = {
      id: uuidv4(),
      response: aiResponse,
      location: locationObj,
      timestamp: new Date().toISOString(),
      inputType: 'photo',
    };

    console.log('=== Photo Analysis Request Completed Successfully ===');
    res.json(response);
  } catch (error) {
    console.error('=== Photo Analysis Request Failed ===');
    console.error('Photo chat error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    
    // Provide more specific error messages
    let errorMessage = 'Failed to process photo query';
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'AI service configuration error';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timeout - please try again';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error - please check connection';
      }
    }

    res.status(500).json({
      error: 'Internal server error',
      message: errorMessage,
    });
  }
});

// Chat history endpoint (for future implementation)
router.get('/history/:sessionId', async (req, res) => {
  try {
    // For now, return empty history
    // In a real implementation, this would fetch from a database
    res.json({
      sessionId: req.params.sessionId,
      messages: [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Chat history error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch chat history',
    });
  }
});

export default router; 