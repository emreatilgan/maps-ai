import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import express from 'express';
import cors from 'cors';
import multer from 'multer';

// Import routes
import chatRoutes from './routes/chat';
import locationRoutes from './routes/location';
import navigationRoutes from './routes/navigation';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure multer for file uploads
const upload = multer({
  dest: process.env.UPLOAD_PATH || '/tmp/uploads',
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  },
});

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/navigation', navigationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File too large',
      message: 'Maximum file size is 10MB',
    });
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: err.message || 'Something went wrong',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AI City Guide backend running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌍 CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
});

export default app; 