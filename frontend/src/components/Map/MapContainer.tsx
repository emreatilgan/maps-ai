import React, { useEffect, useRef, useState } from 'react';
import { MapContainer as LeafletMapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Coordinates, POI } from '@shared/types';

// Fix for default markers in react-leaflet
const DefaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const UserLocationIcon = L.icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iOCIgZmlsbD0iIzM4ODJmNiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjQiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapContainerProps {
  userLocation: Coordinates | null;
  onLocationUpdate: (location: Coordinates) => void;
  onPOISelect: (poi: POI) => void;
  markers: POI[];
  selectedPOI: POI | null;
}

// Component to handle map events
function MapEventHandler({ onLocationUpdate, onPOISelect }: {
  onLocationUpdate: (location: Coordinates) => void;
  onPOISelect: (poi: POI | null) => void;
}) {
  const map = useMapEvents({
    click: (e) => {
      // Clear selected POI when clicking on empty map
      onPOISelect(null);
    },
    locationfound: (e) => {
      const location = { lat: e.latlng.lat, lon: e.latlng.lng };
      onLocationUpdate(location);
      map.flyTo(e.latlng, 16);
    },
    locationerror: (e) => {
      console.warn('Location access denied:', e.message);
      // Fallback to default location (New York City)
      const defaultLocation = { lat: 40.7128, lon: -74.0060 };
      onLocationUpdate(defaultLocation);
      map.setView([defaultLocation.lat, defaultLocation.lon], 13);
    }
  });

  return null;
}

// Component to handle location tracking
function LocationTracker({ userLocation }: { userLocation: Coordinates | null }) {
  const map = useMap();

  useEffect(() => {
    // Request user location on mount
    map.locate({ setView: false, maxZoom: 16 });
  }, [map]);

  useEffect(() => {
    if (userLocation) {
      map.setView([userLocation.lat, userLocation.lon], map.getZoom());
    }
  }, [userLocation, map]);

  return null;
}

// Component to render POI markers
function POIMarkers({ markers, onPOISelect, selectedPOI }: {
  markers: POI[];
  onPOISelect: (poi: POI) => void;
  selectedPOI: POI | null;
}) {
  const getCategoryIcon = (category: string): L.Icon => {
    const color = getCategoryColor(category);
    return L.icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg width="25" height="41" viewBox="0 0 25 41" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 21.9 12.5 41 12.5 41S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0Z" fill="${color}"/>
          <circle cx="12.5" cy="12.5" r="6" fill="white"/>
        </svg>
      `)}`,
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'tourism': return '#10b981'; // green
      case 'amenity': return '#f97316'; // orange
      case 'shopping': return '#8b5cf6'; // purple
      case 'leisure': return '#06b6d4'; // cyan
      default: return '#6b7280'; // gray
    }
  };

  return (
    <>
      {markers.map((poi) => (
        <Marker
          key={poi.id}
          position={[poi.coordinates.lat, poi.coordinates.lon]}
          icon={getCategoryIcon(poi.category)}
          eventHandlers={{
            click: () => onPOISelect(poi),
          }}
        >
          <Popup>
            <div className="max-w-xs">
              <h3 className="font-semibold text-gray-900">{poi.name}</h3>
              <p className="text-sm text-gray-600 capitalize">{poi.category}</p>
              {poi.description && (
                <p className="text-sm text-gray-700 mt-1">{poi.description}</p>
              )}
              {poi.address && (
                <p className="text-xs text-gray-500 mt-1">{poi.address}</p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

const MapContainer: React.FC<MapContainerProps> = ({
  userLocation,
  onLocationUpdate,
  onPOISelect,
  markers,
  selectedPOI
}) => {
  const [mapReady, setMapReady] = useState(false);

  const defaultCenter: [number, number] = [40.7128, -74.0060]; // New York City
  const center: [number, number] = userLocation 
    ? [userLocation.lat, userLocation.lon] 
    : defaultCenter;

  return (
    <div className="h-full w-full">
      <LeafletMapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        whenReady={() => setMapReady(true)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapEventHandler 
          onLocationUpdate={onLocationUpdate} 
          onPOISelect={onPOISelect} 
        />
        
        <LocationTracker userLocation={userLocation} />

        {/* User location marker */}
        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lon]}
            icon={UserLocationIcon}
          >
            <Popup>
              <div className="text-center">
                <p className="font-semibold text-primary-600">You are here</p>
                <p className="text-xs text-gray-500">
                  {userLocation.lat.toFixed(6)}, {userLocation.lon.toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* POI markers */}
        <POIMarkers 
          markers={markers} 
          onPOISelect={onPOISelect}
          selectedPOI={selectedPOI}
        />
      </LeafletMapContainer>
    </div>
  );
};

export default MapContainer; 