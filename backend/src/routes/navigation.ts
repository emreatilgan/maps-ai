import express from 'express';
import { OSMService } from '../services/osmService';
import { Coordinates } from '@shared/types';

const router = express.Router();
const osmService = new OSMService();

// Get route between two points
router.post('/route', async (req, res) => {
  try {
    const { from, to } = req.body;

    if (!from || !to) {
      return res.status(400).json({
        error: 'Missing coordinates',
        message: 'Both from and to coordinates are required',
      });
    }

    if (!from.lat || !from.lon || !to.lat || !to.lon) {
      return res.status(400).json({
        error: 'Invalid coordinates',
        message: 'Both coordinates must have lat and lon properties',
      });
    }

    const route = await osmService.getRoutes(from, to);

    if (!route) {
      return res.status(404).json({
        error: 'Route not found',
        message: 'Could not calculate route between the specified points',
      });
    }

    res.json({
      from,
      to,
      route,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Route calculation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to calculate route',
    });
  }
});

// Get walking directions to a specific POI
router.get('/directions', async (req, res) => {
  try {
    const { fromLat, fromLon, toLat, toLon, mode = 'walking' } = req.query;

    if (!fromLat || !fromLon || !toLat || !toLon) {
      return res.status(400).json({
        error: 'Missing coordinates',
        message: 'All coordinate parameters are required',
      });
    }

    const from: Coordinates = {
      lat: parseFloat(fromLat as string),
      lon: parseFloat(fromLon as string),
    };

    const to: Coordinates = {
      lat: parseFloat(toLat as string),
      lon: parseFloat(toLon as string),
    };

    if (isNaN(from.lat) || isNaN(from.lon) || isNaN(to.lat) || isNaN(to.lon)) {
      return res.status(400).json({
        error: 'Invalid coordinates',
        message: 'All coordinates must be valid numbers',
      });
    }

    const route = await osmService.getRoutes(from, to);

    if (!route) {
      return res.status(404).json({
        error: 'Directions not found',
        message: 'Could not generate directions between the specified points',
      });
    }

    res.json({
      from,
      to,
      mode,
      directions: {
        distance: route.distance,
        duration: route.duration,
        instructions: route.instructions,
        coordinates: route.coordinates,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Directions error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate directions',
    });
  }
});

export default router; 