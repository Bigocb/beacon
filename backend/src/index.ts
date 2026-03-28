import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { graphql, buildSchema, execute, parse } from 'graphql';
import { makeExecutableSchema } from 'graphql-tools';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { authMiddleware, AuthenticatedRequest } from './middleware/auth';
import { initializeDatabase } from './db/init';

import authRoutes from './api/auth';
import usersRoutes from './api/users';
import savesRoutes from './api/saves';
import syncRoutes from './api/sync';
import favoritesRoutes from './api/favorites';
import notesRoutes from './api/notes';
import tagsRoutes from './api/tags';
import metadataRoutes from './api/metadata';
import milestonesRoutes from './api/milestones';
import foldersRoutes from './api/folders';

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
app.use('/folders', foldersRoutes);
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

// Build GraphQL schema with executable resolvers
let schema: any;
try {
  const typeDefsString = typeDefs.loc?.source.body || '';

  // Debug: Check if file_path is in the schema string
  console.log(`📋 [Schema] typeDefsString length: ${typeDefsString.length} chars`);
  if (typeDefsString.includes('file_path')) {
    console.log('✅ [Schema] file_path found in type defs');
  } else {
    console.warn('⚠️  [Schema] file_path NOT found in type defs!');
    console.warn('First 500 chars:', typeDefsString.substring(0, 500));
  }

  // Wrap resolvers to inject context
  const wrappedResolvers = {
    Query: Object.entries(resolvers.Query as any).reduce((acc: any, [key, value]) => {
      acc[key] = (parent: any, args: any, context: any, info: any) => {
        return (value as any)(parent, args, context);
      };
      return acc;
    }, {}),
    Mutation: Object.entries(resolvers.Mutation as any).reduce((acc: any, [key, value]) => {
      acc[key] = (parent: any, args: any, context: any, info: any) => {
        return (value as any)(parent, args, context);
      };
      return acc;
    }, {}),
  };

  console.log('🔨 [Schema] Building executable schema...');
  schema = makeExecutableSchema({
    typeDefs: typeDefsString,
    resolvers: wrappedResolvers,
  });
  console.log('✅ [Schema] Schema built successfully');

  // Debug: Check Save type fields
  const SaveType = schema.getType('Save');
  if (SaveType) {
    const fields = SaveType.getFields ? SaveType.getFields() : SaveType._fields;
    console.log('📝 [Schema] Save type fields:', Object.keys(fields || {}));
  }
} catch (err) {
  console.error('❌ Failed to build GraphQL schema:', err);
  process.exit(1);
}

// Setup GraphQL endpoint
app.post('/graphql', authMiddleware, express.json(), async (req: any, res: any) => {
  const { query, variables } = req.body;

  if (!query) {
    return res.status(400).json({ errors: [{ message: 'No query provided' }] });
  }

  try {
    const authReq = req as AuthenticatedRequest;
    const context = { req: authReq };

    // Execute GraphQL query with proper context injection
    const result = await graphql({
      schema,
      source: query,
      variableValues: variables,
      contextValue: context
    });

    res.json(result);
  } catch (error: any) {
    console.error('GraphQL error:', error);
    res.status(500).json({ errors: [{ message: error.message }] });
  }
});

app.get('/graphql', (req, res) => {
  res.json({ message: 'GraphQL endpoint at POST /graphql' });
});

// Start server
(async () => {
  try {
    await initializeDatabase();

    const PORT = process.env.PORT || 3000;
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Database: ${process.env.DB_NAME || 'minecraft_tracker'}`);
      console.log(`📡 GraphQL available at http://localhost:${PORT}/graphql`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
})();
