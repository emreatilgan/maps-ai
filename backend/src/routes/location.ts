import express from 'express';
import { OSMService } from '../services/osmService';
import { LocationService } from '../services/locationService';
import { LocationRequest, SearchRequest } from '@shared/types';

const router = express.Router();
const osmService = new OSMService();
const locationService = new LocationService();

// Get nearby POIs
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lon, radius = 1000, categories } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        error: 'Missing coordinates',
        message: 'Latitude and longitude are required',
      });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);
    const searchRadius = parseInt(radius as string);
    const searchCategories = categories 
      ? (categories as string).split(',') 
      : ['amenity', 'tourism', 'shop', 'leisure'];

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        error: 'Invalid coordinates',
        message: 'Latitude and longitude must be valid numbers',
      });
    }

    const pois = await osmService.getNearbyPOIs(
      latitude,
      longitude,
      searchRadius,
      searchCategories
    );

    res.json({
      location: { lat: latitude, lon: longitude },
      radius: searchRadius,
      categories: searchCategories,
      count: pois.length,
      pois,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Nearby POIs error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch nearby POIs',
    });
  }
});

// Get detailed location information
router.get('/info', async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        error: 'Missing coordinates',
        message: 'Latitude and longitude are required',
      });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        error: 'Invalid coordinates',
        message: 'Latitude and longitude must be valid numbers',
      });
    }

    const locationInfo = await osmService.getLocationInfo(latitude, longitude);

    res.json({
      coordinates: { lat: latitude, lon: longitude },
      locationInfo,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Location info error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch location information',
    });
  }
});

// Get enriched location context
router.get('/context', async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        error: 'Missing coordinates',
        message: 'Latitude and longitude are required',
      });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        error: 'Invalid coordinates',
        message: 'Latitude and longitude must be valid numbers',
      });
    }

    const coordinates = { lat: latitude, lon: longitude };
    const enrichedContext = await locationService.enrichLocationContext(coordinates);

    res.json({
      coordinates,
      ...enrichedContext,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Location context error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch location context',
    });
  }
});

// Search for locations
router.get('/search', async (req, res) => {
  try {
    const { q: query, lat, lon, radius } = req.query;

    if (!query) {
      return res.status(400).json({
        error: 'Missing query',
        message: 'Search query is required',
      });
    }

    let bbox;
    if (lat && lon && radius) {
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lon as string);
      const searchRadius = parseFloat(radius as string) / 111000; // Convert meters to degrees (rough)

      bbox = {
        north: latitude + searchRadius,
        south: latitude - searchRadius,
        east: longitude + searchRadius,
        west: longitude - searchRadius,
      };
    }

    const results = await osmService.searchLocations(query as string, bbox);

    res.json({
      query,
      bbox,
      count: results.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Location search error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to search locations',
    });
  }
});

// Get recommendations for a location
router.get('/recommendations', async (req, res) => {
  try {
    const { lat, lon, preferences } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        error: 'Missing coordinates',
        message: 'Latitude and longitude are required',
      });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        error: 'Invalid coordinates',
        message: 'Latitude and longitude must be valid numbers',
      });
    }

    const coordinates = { lat: latitude, lon: longitude };
    const userContext = {
      location: coordinates,
      preferences: preferences ? (preferences as string).split(',') : undefined,
    };

    const { nearbyPOIs } = await locationService.enrichLocationContext(coordinates);
    const recommendations = locationService.generateRecommendations(userContext, nearbyPOIs);

    res.json({
      coordinates,
      userContext,
      recommendations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate recommendations',
    });
  }
});

export default router; 