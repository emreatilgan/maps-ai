import { Coordinates, POI, UserContext } from '@shared/types';
import { OSMService } from './osmService';

export class LocationService {
  private osmService: OSMService;

  constructor() {
    this.osmService = new OSMService();
  }

  async enrichLocationContext(coordinates: Coordinates): Promise<{
    locationInfo: any;
    nearbyPOIs: POI[];
    contextualInfo: {
      area: string;
      cityType: string;
      touristArea: boolean;
      suggestions: string[];
    };
  }> {
    try {
      // Get basic location information
      const locationInfo = await this.osmService.getLocationInfo(
        coordinates.lat, 
        coordinates.lon
      );

      // Get nearby POIs with different categories
      const nearbyPOIs = await this.osmService.getNearbyPOIs(
        coordinates.lat,
        coordinates.lon,
        1000, // 1km radius
        ['amenity', 'tourism', 'shop', 'leisure']
      );

      // Analyze the area type and context
      const contextualInfo = this.analyzeAreaContext(locationInfo, nearbyPOIs);

      return {
        locationInfo,
        nearbyPOIs,
        contextualInfo,
      };
    } catch (error) {
      console.error('Error enriching location context:', error);
      return {
        locationInfo: null,
        nearbyPOIs: [],
        contextualInfo: {
          area: 'Unknown',
          cityType: 'unknown',
          touristArea: false,
          suggestions: [],
        },
      };
    }
  }

  categorizeNearbyPlaces(pois: POI[]): {
    restaurants: POI[];
    attractions: POI[];
    shopping: POI[];
    services: POI[];
    other: POI[];
  } {
    const categories = {
      restaurants: [] as POI[],
      attractions: [] as POI[],
      shopping: [] as POI[],
      services: [] as POI[],
      other: [] as POI[],
    };

    pois.forEach(poi => {
      switch (poi.category) {
        case 'amenity':
          if (['restaurant', 'cafe', 'bar', 'pub', 'fast_food'].includes(poi.subcategory || '')) {
            categories.restaurants.push(poi);
          } else {
            categories.services.push(poi);
          }
          break;
        case 'tourism':
          categories.attractions.push(poi);
          break;
        case 'shopping':
        case 'shop':
          categories.shopping.push(poi);
          break;
        case 'leisure':
          categories.attractions.push(poi);
          break;
        default:
          categories.other.push(poi);
      }
    });

    return categories;
  }

  generateRecommendations(
    userContext: UserContext, 
    pois: POI[]
  ): {
    immediate: POI[];
    nearby: POI[];
    categories: string[];
    tips: string[];
  } {
    const categorized = this.categorizeNearbyPlaces(pois);
    const recommendations = {
      immediate: [] as POI[],
      nearby: [] as POI[],
      categories: [] as string[],
      tips: [] as string[],
    };

    // Determine time-based recommendations
    const hour = new Date().getHours();
    
    if (hour >= 7 && hour <= 10) {
      // Morning recommendations
      recommendations.immediate = [
        ...categorized.restaurants.filter(p => 
          p.subcategory === 'cafe' || p.tags.breakfast === 'yes'
        ).slice(0, 3),
        ...categorized.attractions.slice(0, 2),
      ];
      recommendations.categories = ['breakfast', 'coffee', 'morning attractions'];
      recommendations.tips.push('Perfect time for a coffee and sightseeing!');
    } else if (hour >= 11 && hour <= 14) {
      // Lunch recommendations
      recommendations.immediate = [
        ...categorized.restaurants.filter(p => 
          ['restaurant', 'fast_food'].includes(p.subcategory || '')
        ).slice(0, 3),
        ...categorized.shopping.slice(0, 2),
      ];
      recommendations.categories = ['lunch', 'shopping', 'attractions'];
      recommendations.tips.push('Great time for lunch and some shopping!');
    } else if (hour >= 15 && hour <= 18) {
      // Afternoon recommendations
      recommendations.immediate = [
        ...categorized.attractions.slice(0, 3),
        ...categorized.restaurants.filter(p => 
          p.subcategory === 'cafe'
        ).slice(0, 2),
      ];
      recommendations.categories = ['attractions', 'coffee', 'culture'];
      recommendations.tips.push('Perfect time to explore attractions and enjoy a coffee break!');
    } else {
      // Evening recommendations
      recommendations.immediate = [
        ...categorized.restaurants.filter(p => 
          ['restaurant', 'bar', 'pub'].includes(p.subcategory || '')
        ).slice(0, 3),
        ...categorized.attractions.filter(p => 
          p.tags.opening_hours?.includes('24/7') || 
          p.category === 'tourism'
        ).slice(0, 2),
      ];
      recommendations.categories = ['dinner', 'nightlife', 'evening attractions'];
      recommendations.tips.push('Time for dinner and evening entertainment!');
    }

    // Add nearby recommendations
    recommendations.nearby = pois
      .filter(poi => !recommendations.immediate.includes(poi))
      .slice(0, 5);

    return recommendations;
  }

  private analyzeAreaContext(locationInfo: any, pois: POI[]): {
    area: string;
    cityType: string;
    touristArea: boolean;
    suggestions: string[];
  } {
    const suggestions: string[] = [];
    let touristArea = false;
    let cityType = 'residential';
    
    // Analyze POI density and types
    const touristPOIs = pois.filter(poi => poi.category === 'tourism').length;
    const restaurantPOIs = pois.filter(poi => 
      poi.category === 'amenity' && 
      ['restaurant', 'cafe', 'bar'].includes(poi.subcategory || '')
    ).length;
    
    if (touristPOIs > 3) {
      touristArea = true;
      cityType = 'tourist';
      suggestions.push('This appears to be a popular tourist area');
      suggestions.push('Consider visiting multiple attractions within walking distance');
    }
    
    if (restaurantPOIs > 5) {
      cityType = 'commercial';
      suggestions.push('Great dining options in this area');
    }
    
    // Extract area name from location info
    const areaName = locationInfo?.address?.suburb || 
                    locationInfo?.address?.neighbourhood || 
                    locationInfo?.address?.city || 
                    'Unknown Area';

    return {
      area: areaName,
      cityType,
      touristArea,
      suggestions,
    };
  }
} 