import { Coordinates } from '@shared/types';

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export class GeolocationService {
  private static instance: GeolocationService;
  private watchId: number | null = null;
  private lastKnownPosition: Coordinates | null = null;

  static getInstance(): GeolocationService {
    if (!GeolocationService.instance) {
      GeolocationService.instance = new GeolocationService();
    }
    return GeolocationService.instance;
  }

  isSupported(): boolean {
    return 'geolocation' in navigator;
  }

  async getCurrentPosition(options?: GeolocationOptions): Promise<Coordinates> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      const defaultOptions: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // 1 minute
        ...options,
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coordinates: Coordinates = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          };
          this.lastKnownPosition = coordinates;
          resolve(coordinates);
        },
        (error) => {
          console.error('Geolocation error:', error);
          
          let errorMessage = 'Failed to get your location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        defaultOptions
      );
    });
  }

  watchPosition(
    callback: (coordinates: Coordinates) => void,
    errorCallback?: (error: Error) => void,
    options?: GeolocationOptions
  ): number | null {
    if (!this.isSupported()) {
      if (errorCallback) {
        errorCallback(new Error('Geolocation is not supported by this browser'));
      }
      return null;
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000, // 30 seconds
      ...options,
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coordinates: Coordinates = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };
        this.lastKnownPosition = coordinates;
        callback(coordinates);
      },
      (error) => {
        console.error('Geolocation watch error:', error);
        
        if (errorCallback) {
          let errorMessage = 'Failed to watch your location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          errorCallback(new Error(errorMessage));
        }
      },
      defaultOptions
    );

    return this.watchId;
  }

  clearWatch(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  getLastKnownPosition(): Coordinates | null {
    return this.lastKnownPosition;
  }

  calculateDistance(from: Coordinates, to: Coordinates): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (from.lat * Math.PI) / 180;
    const φ2 = (to.lat * Math.PI) / 180;
    const Δφ = ((to.lat - from.lat) * Math.PI) / 180;
    const Δλ = ((to.lon - from.lon) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  }

  calculateBearing(from: Coordinates, to: Coordinates): number {
    const φ1 = (from.lat * Math.PI) / 180;
    const φ2 = (to.lat * Math.PI) / 180;
    const Δλ = ((to.lon - from.lon) * Math.PI) / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
  }

  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${meters}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  }

  formatCoordinates(coordinates: Coordinates, precision: number = 4): string {
    return `${coordinates.lat.toFixed(precision)}, ${coordinates.lon.toFixed(precision)}`;
  }
}

export const geolocationService = GeolocationService.getInstance(); 