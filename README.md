# 🗺️ AI City Guide

An AI-powered city guide application that combines OpenStreetMap data with Mistral AI to provide tourists with intelligent, multi-modal assistance for exploring cities.

## 🚀 Features

### Multi-Modal Input
- **Text Chat**: Ask questions about nearby attractions, restaurants, and services
- **Voice Input**: Speak naturally to get instant recommendations
- **Photo Analysis**: Take photos of landmarks to get historical and cultural information

### Smart Recommendations
- Context-aware suggestions based on current location
- Time-based recommendations (breakfast, lunch, dinner, activities)
- Category-based filtering (restaurants, attractions, shopping, services)

### Interactive Map
- Real-time GPS location tracking
- OpenStreetMap integration with custom markers
- POI (Points of Interest) visualization
- Location-based search and discovery

### AI-Powered Responses
- Natural language processing with Mistral Large
- Visual analysis with Pixtral for landmark identification
- Contextual recommendations based on surroundings
- Audio responses for hands-free interaction

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   External APIs │
│   (React)       │    │   (Node.js)     │    │                 │
│                 │    │                 │    │                 │
│ • Map Interface │◄──►│ • Route Handler │◄──►│ • Mistral AI    │
│ • Voice Input   │    │ • Data Processor│    │ • OpenStreetMap │
│ • Photo Upload  │    │ • AI Orchestrator│    │ • Nominatim     │
│ • Audio Output  │    │ • Location Logic│    │ • Overpass API  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Leaflet.js** for interactive maps
- **Tailwind CSS** for styling
- **Vite** for build tooling
- **Web APIs**: Geolocation, Speech Recognition, Speech Synthesis

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **Mistral AI** SDK for language and vision models
- **Axios** for HTTP requests
- **Multer** for file uploads

### External Services
- **OpenStreetMap** for map tiles and POI data
- **Nominatim** for geocoding and reverse geocoding
- **Overpass API** for complex POI queries
- **Mistral Large** for text processing
- **Pixtral** for image analysis

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Mistral AI API key

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd maps-ai
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Environment Configuration**
   
   Create `.env` files:
   
   **Backend** (`backend/.env`):
   ```bash
   MISTRAL_API_KEY=your_mistral_api_key_here
   NODE_ENV=development
   PORT=3001
   FRONTEND_URL=http://localhost:5173
   CORS_ORIGIN=http://localhost:5173
   ```

4. **Start Development Servers**
   ```bash
   # Start both frontend and backend
   npm run dev
   
   # Or start individually
   npm run dev:frontend  # Frontend on http://localhost:5173
   npm run dev:backend   # Backend on http://localhost:3001
   ```

## 🔧 Development

### Project Structure
```
maps-ai/
├── frontend/           # React frontend application
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── services/   # API and utility services
│   │   └── utils/      # Helper functions
├── backend/            # Node.js backend API
│   ├── src/
│   │   ├── controllers/# Request handlers
│   │   ├── services/   # Business logic
│   │   ├── routes/     # API routes
│   │   └── middleware/ # Express middleware
├── shared/             # Shared TypeScript types
│   └── types/          # Common interfaces
└── README.md
```

### Available Scripts

```bash
# Development
npm run dev                 # Start both frontend and backend
npm run dev:frontend        # Start frontend only
npm run dev:backend         # Start backend only

# Build
npm run build              # Build both applications
npm run build:frontend     # Build frontend for production
npm run build:backend      # Build backend for production

# Dependencies
npm run install:all        # Install all dependencies
```

## 🌐 API Endpoints

### Chat Endpoints
- `POST /api/chat/text` - Text-based AI queries
- `POST /api/chat/voice` - Voice input processing  
- `POST /api/chat/photo` - Photo analysis

### Location Endpoints
- `GET /api/location/nearby` - Get nearby POIs
- `GET /api/location/info` - Location details
- `GET /api/location/context` - Enriched location context
- `GET /api/location/search` - Search locations
- `GET /api/location/recommendations` - Get recommendations

### Navigation Endpoints
- `POST /api/navigation/route` - Calculate routes
- `GET /api/navigation/directions` - Get directions

## 🚀 Deployment

### Local Development
The application is configured for local development with hot reloading and real-time updates.

### Production Deployment (Koyeb)

1. **Build the applications**
   ```bash
   npm run build
   ```

2. **Deploy to Koyeb**
   - Frontend: Deploy the `frontend/dist` folder as a static site
   - Backend: Deploy the `backend` folder as a Node.js service

3. **Environment Variables**
   Configure the following in Koyeb:
   - `MISTRAL_API_KEY`: Your Mistral AI API key
   - `NODE_ENV`: `production`
   - `FRONTEND_URL`: Your frontend domain
   - `CORS_ORIGIN`: Your frontend domain

## 🎯 Usage

### For Tourists

1. **Enable Location Services**: Allow the app to access your location for personalized recommendations

2. **Ask Questions**: Use any of these methods:
   - **Text**: Type questions like "What's a good restaurant nearby?"
   - **Voice**: Tap the microphone and speak naturally
   - **Photo**: Take a picture of a landmark to learn about it

3. **Explore the Map**: 
   - View nearby attractions, restaurants, and services
   - Click on markers for detailed information
   - Get directions to interesting places

4. **Get Smart Recommendations**:
   - Time-based suggestions (breakfast spots in morning, dinner in evening)
   - Category-based filtering
   - Contextual information about your surroundings

### Example Queries

- "What are the best coffee shops within walking distance?"
- "Tell me about the history of this building" (with photo)
- "I'm hungry, where should I eat lunch?"
- "What attractions are nearby?"
- "How do I get to the nearest metro station?"

## 🔒 Privacy & Security

- **Location Data**: Used only for providing relevant recommendations
- **Voice Data**: Processed locally using Web Speech API
- **Photos**: Sent to Mistral AI for analysis, not stored permanently
- **No Personal Data Storage**: The app doesn't store personal information

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenStreetMap** for providing free, editable map data
- **Mistral AI** for advanced language and vision models
- **React-Leaflet** for seamless map integration
- **Tailwind CSS** for beautiful, responsive styling

## 🐛 Troubleshooting

### Common Issues

1. **Location not working**: Ensure location services are enabled in your browser
2. **Voice input not responding**: Check microphone permissions
3. **API errors**: Verify your Mistral AI API key is correct
4. **Map not loading**: Check internet connection and firewall settings

### Getting Help

- Check the [Issues](https://github.com/your-username/maps-ai/issues) page
- Create a new issue with detailed information about your problem
- Include browser version, operating system, and error messages

---

**Built with ❤️ for hackathon participants and city explorers worldwide!** 