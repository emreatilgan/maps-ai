import axios from 'axios';
import { Coordinates, POI, BoundingBox, Route } from '@shared/types';

export class OSMService {
  private nominatimBaseUrl = 'https://nominatim.openstreetmap.org';
  private overpassBaseUrl = 'https://overpass-api.de/api/interpreter';

  async getNearbyPOIs(
    lat: number, 
    lon: number, 
    radius: number = 1000, 
    categories: string[] = ['amenity', 'tourism', 'shop', 'leisure']
  ): Promise<POI[]> {
    try {
      // Build Overpass query for nearby POIs
      const overpassQuery = this.buildOverpassQuery(lat, lon, radius, categories);
      
      const response = await axios.post(this.overpassBaseUrl, overpassQuery, {
        headers: {
          'Content-Type': 'text/plain',
        },
        timeout: 10000,
      });

      return this.parseOverpassResponse(response.data);
    } catch (error) {
      console.error('Error fetching nearby POIs:', error);
      return [];
    }
  }

  async getLocationInfo(lat: number, lon: number): Promise<any> {
    try {
      const response = await axios.get(`${this.nominatimBaseUrl}/reverse`, {
        params: {
          lat,
          lon,
          format: 'json',
          zoom: 18,
          addressdetails: 1,
        },
        timeout: 5000,
      });

      return response.data;
    } catch (error) {
      console.error('Error getting location info:', error);
      return null;
    }
  }

  async searchLocations(query: string, bbox?: BoundingBox): Promise<POI[]> {
    try {
      const params: any = {
        q: query,
        format: 'json',
        addressdetails: 1,
        limit: 10,
        extratags: 1,
      };

      if (bbox) {
        params.viewbox = `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`;
        params.bounded = 1;
      }

      const response = await axios.get(`${this.nominatimBaseUrl}/search`, {
        params,
        timeout: 5000,
      });

      return this.parseNominatimSearchResponse(response.data);
    } catch (error) {
      console.error('Error searching locations:', error);
      return [];
    }
  }

  async getRoutes(from: Coordinates, to: Coordinates): Promise<Route | null> {
    try {
      // Using OpenRouteService as an example (requires API key for production)
      // For demo purposes, we'll create a simple direct route
      const distance = this.calculateDistance(from, to);
      const duration = Math.round(distance * 12); // Rough walking time estimate

      return {
        id: `route_${Date.now()}`,
        coordinates: [from, to], // Simple direct route
        distance,
        duration,
        instructions: [
          {
            text: `Head towards destination`,
            distance,
            duration,
            coordinates: from,
          },
          {
            text: `Arrive at destination`,
            distance: 0,
            duration: 0,
            coordinates: to,
          },
        ],
      };
    } catch (error) {
      console.error('Error getting routes:', error);
      return null;
    }
  }

  private buildOverpassQuery(
    lat: number, 
    lon: number, 
    radius: number, 
    categories: string[]
  ): string {
    const categoryQueries = categories.map(category => {
      switch (category) {
        case 'amenity':
          return `node["amenity"~"restaurant|cafe|bar|pub|fast_food|bank|atm|hospital|pharmacy|post_office"](around:${radius},${lat},${lon});`;
        case 'tourism':
          return `node["tourism"~"attraction|museum|monument|viewpoint|information|hotel|hostel"](around:${radius},${lat},${lon});`;
        case 'shop':
          return `node["shop"~"supermarket|convenience|mall|department_store|clothes|books"](around:${radius},${lat},${lon});`;
        case 'leisure':
          return `node["leisure"~"park|garden|playground|sports_centre|swimming_pool"](around:${radius},${lat},${lon});`;
        default:
          return `node["${category}"](around:${radius},${lat},${lon});`;
      }
    }).join('');

    return `
[out:json][timeout:25];
(
${categoryQueries}
);
out geom;
    `.trim();
  }

  private parseOverpassResponse(data: any): POI[] {
    if (!data.elements) return [];

    return data.elements.map((element: any) => {
      const tags = element.tags || {};
      const category = this.determineCategory(tags);
      
      return {
        id: `osm_${element.id}`,
        name: tags.name || tags.brand || 'Unnamed Location',
        coordinates: {
          lat: element.lat,
          lon: element.lon,
        },
        category: category.main,
        subcategory: category.sub,
        description: this.generateDescription(tags),
        address: this.formatAddress(tags),
        website: tags.website || tags['contact:website'],
        phone: tags.phone || tags['contact:phone'],
        openingHours: tags.opening_hours,
        tags,
      };
    }).filter((poi: POI) => poi.name !== 'Unnamed Location');
  }

  private parseNominatimSearchResponse(data: any[]): POI[] {
    return data.map((item: any) => ({
      id: `nominatim_${item.place_id}`,
      name: item.display_name.split(',')[0],
      coordinates: {
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
      },
      category: item.class || 'location',
      subcategory: item.type,
      description: item.display_name,
      address: item.display_name,
      tags: item.extratags || {},
    }));
  }

  private determineCategory(tags: Record<string, string>): { main: string; sub?: string } {
    if (tags.amenity) {
      return { main: 'amenity', sub: tags.amenity };
    }
    if (tags.tourism) {
      return { main: 'tourism', sub: tags.tourism };
    }
    if (tags.shop) {
      return { main: 'shopping', sub: tags.shop };
    }
    if (tags.leisure) {
      return { main: 'leisure', sub: tags.leisure };
    }
    return { main: 'other' };
  }

  private generateDescription(tags: Record<string, string>): string {
    const descriptions: string[] = [];
    
    if (tags.cuisine) descriptions.push(`Cuisine: ${tags.cuisine}`);
    if (tags.description) descriptions.push(tags.description);
    if (tags.wikipedia) descriptions.push('Has Wikipedia entry');
    
    return descriptions.join('. ') || undefined;
  }

  private formatAddress(tags: Record<string, string>): string {
    const addressParts: string[] = [];
    
    if (tags['addr:housenumber']) addressParts.push(tags['addr:housenumber']);
    if (tags['addr:street']) addressParts.push(tags['addr:street']);
    if (tags['addr:city']) addressParts.push(tags['addr:city']);
    if (tags['addr:postcode']) addressParts.push(tags['addr:postcode']);
    
    return addressParts.join(', ') || undefined;
  }

  private calculateDistance(from: Coordinates, to: Coordinates): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = from.lat * Math.PI / 180;
    const φ2 = to.lat * Math.PI / 180;
    const Δφ = (to.lat - from.lat) * Math.PI / 180;
    const Δλ = (to.lon - from.lon) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return Math.round(R * c);
  }
} 