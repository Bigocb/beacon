import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import authRoutes from './api/auth';
import usersRoutes from './api/users';
import savesRoutes from './api/saves';
import syncRoutes from './api/sync';
import favoritesRoutes from './api/favorites';
import notesRoutes from './api/notes';
import tagsRoutes from './api/tags';
import metadataRoutes from './api/metadata';
import milestonesRoutes from './api/milestones';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// CORS configuration that allows both web (5173) and desktop (5174+) apps
const allowedOrigins = [
  'http://localhost:5173',  // Web app
  'http://localhost:5174',  // Desktop app (Vite dev server)
  'http://localhost:5175',  // Desktop app (alternative port)
  'http://localhost:5176',  // Desktop app (alternative port)
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:5176',
];

const corsOrigin = process.env.CORS_ORIGIN || allowedOrigins;

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: corsOrigin,
    credentials: true,
  },
});

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/saves', savesRoutes);
app.use('/api/sync', syncRoutes);
app.use('/favorites', favoritesRoutes);
app.use('/api', notesRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api', metadataRoutes);
app.use('/api', milestonesRoutes);

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Export io for use in route handlers
export { io };

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Database: ${process.env.DB_NAME || 'minecraft_tracker'}`);
});
