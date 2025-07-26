// Coordinates and Location Types
export interface Coordinates {
  lat: number;
  lon: number;
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

// POI (Point of Interest) Types
export interface POI {
  id: string;
  name: string;
  coordinates: Coordinates;
  category: string;
  subcategory?: string;
  description?: string;
  address?: string;
  website?: string;
  phone?: string;
  openingHours?: string;
  rating?: number;
  tags: Record<string, string>;
}

// User Context and Preferences
export interface UserContext {
  location: Coordinates;
  preferences?: string[];
  searchRadius?: number;
  language?: string;
}

// Chat and AI Types
export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  inputType?: 'text' | 'voice' | 'photo';
  location?: Coordinates;
  attachments?: {
    type: 'image' | 'audio' | 'location';
    data: string;
  }[];
}

export interface AIResponse {
  text: string;
  recommendations?: POI[];
  mapActions?: {
    center?: Coordinates;
    markers?: POI[];
    routes?: Route[];
  };
  audioUrl?: string;
}

// Route and Navigation Types
export interface Route {
  id: string;
  coordinates: Coordinates[];
  distance: number;
  duration: number;
  instructions: RouteInstruction[];
}

export interface RouteInstruction {
  text: string;
  distance: number;
  duration: number;
  coordinates: Coordinates;
}

// API Request/Response Types
export interface ChatRequest {
  message: string;
  inputType: 'text' | 'voice' | 'photo';
  location: Coordinates;
  image?: string; // base64 encoded image
}

export interface LocationRequest {
  coordinates: Coordinates;
  radius: number;
  categories?: string[];
}

export interface SearchRequest {
  query: string;
  location: Coordinates;
  radius?: number;
}

// Error Handling
export interface APIError {
  code: string;
  message: string;
  details?: any;
} 