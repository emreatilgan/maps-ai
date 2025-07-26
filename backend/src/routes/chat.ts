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
    mistralService = new MistralService();
  }
  return mistralService;
};

const getLocationService = () => {
  if (!locationService) {
    locationService = new LocationService();
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
    const { message, location } = req.body as ChatRequest;

    if (!message || !location) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Both message and location are required',
      });
    }

    // Get location context and nearby POIs
    const { nearbyPOIs } = await getLocationService().enrichLocationContext(location);

    // Process query with Mistral
    const aiResponse = await getMistralService().processTextQuery(
      message,
      location,
      nearbyPOIs
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
  try {
    const { location } = req.body;
    const imageFile = req.file;

    if (!location || !imageFile) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Both location and image are required',
      });
    }

    const locationObj = JSON.parse(location);

    // Convert image to base64
    const imageBase64 = imageFile.buffer.toString('base64');

    // Get location context and nearby POIs
    const { nearbyPOIs } = await getLocationService().enrichLocationContext(locationObj);

    // Analyze photo with Mistral Pixtral
    const aiResponse = await getMistralService().analyzePhoto(
      imageBase64,
      locationObj,
      nearbyPOIs
    );

    res.json({
      id: uuidv4(),
      response: aiResponse,
      location: locationObj,
      timestamp: new Date().toISOString(),
      inputType: 'photo',
    });
  } catch (error) {
    console.error('Photo chat error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process photo query',
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