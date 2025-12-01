const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Import routes
const authRoutes = require('./routes/auth');
const channelRoutes = require('./routes/channels');
const userRoutes = require('./routes/users');
const notificationService = require('./services/notificationService');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const streamingRoutes = require('./routes/streaming');
const settingsRoutes = require('./routes/settings');
const zenoPayRoutes = require('./routes/zenopay');

// Import middleware
const { authMiddleware } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Enhanced CORS configuration for Namecheap and Capacitor compatibility
// IMPORTANT: Update 'yourdomain.com' with your actual Namecheap domain before deployment
const allowedOrigins = [
  ...(process.env.ALLOWED_ORIGINS?.split(',') || []),
  // Production Namecheap domain - UPDATE THIS WITH YOUR ACTUAL DOMAIN
  "https://api.yourdomain.com", // Main API domain
  "https://yourdomain.com",      // Main website domain
  // Development origins
  "http://localhost:3001",
  "http://localhost:3000",
  "http://localhost:5000",
  // Mobile app origins (Capacitor/Ionic)
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
  "https://localhost"
];

const app = express();

// Trust proxy for reverse proxies (Namecheap, Nginx, etc.)
// This ensures rate limiting and IP detection work correctly
app.set('trust proxy', 1);

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  },
  allowEIO3: true, // Enable Engine.IO v3 compatibility
  transports: ['websocket', 'polling'] // Support both transports for mobile
});

// Use environment PORT variable or fallback to 10000
const PORT = process.env.PORT || 10000;

// Rate limiting with proper proxy support
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Trust proxy for rate limiting behind reverse proxies
  trustProxy: true,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/';
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // For development, be more permissive
      if (process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  optionsSuccessStatus: 200 // For legacy browser support
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/', limiter);

// Root endpoint - friendly welcome message
app.get('/', (req, res) => {
  res.json({
    message: 'Supasoka Backend is running! 🚀',
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth',
      channels: '/api/channels',
      admin: '/api/admin'
    }
  });
});

// HEALTH CHECK ENDPOINT - Required for production deployments
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'production',
      database: 'connected',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: 'Database connection failed'
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/streaming', streamingRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/payments/zenopay', zenoPayRoutes); // ZenoPay payment routes

// Socket.IO for real-time updates
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);

  socket.on('join-admin', () => {
    socket.join('admin-room');
    logger.info(`Admin joined: ${socket.id}`);
  });

  socket.on('join-admin-room', () => {
    socket.join('admin-room');
    logger.info(`Admin joined room: ${socket.id}`);
  });

  socket.on('join-user', (userId) => {
    if (userId) {
      socket.join(`user-${userId}`);
      socket.userId = userId; // Store userId for later use
      logger.info(`User ${userId} joined: ${socket.id}`);
    }
  });

  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });

  // Handle connection errors
  socket.on('error', (error) => {
    logger.error(`Socket error for ${socket.id}:`, error);
  });
});

// Make io available to routes
app.set('io', io);

// Scheduled Notifications Processor
async function processScheduledNotifications() {
  try {
    // Skip if database is not available
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost:5432')) {
      return; // Silently skip when no database
    }
    
    const now = new Date();
    const dueNotifications = await prisma.notification.findMany({
      where: {
        isActive: true,
        sentAt: null,
        scheduledAt: { lte: now }
      }
    });

    if (!dueNotifications.length) return;

    for (const notif of dueNotifications) {
      // Determine target users
      let users;
      if (Array.isArray(notif.targetUsers) && notif.targetUsers.length > 0) {
        users = await prisma.user.findMany({
          where: { id: { in: notif.targetUsers } },
          select: { id: true }
        });
      } else {
        users = await prisma.user.findMany({ select: { id: true } });
      }

      // Broadcast via Socket.IO
      await notificationService.sendRealTimeNotification(io, users, notif.title, notif.message, {
        type: notif.type,
        notificationId: notif.id
      });

      // Mark as sent
      const updated = await prisma.notification.update({
        where: { id: notif.id },
        data: { sentAt: new Date() }
      });

      // Inform admin dashboard to refresh
      io.to('admin-room').emit('notification-updated', { notification: updated });

      // Also emit immediate notification to user rooms for consistency
      users.forEach(user => {
        io.to(`user-${user.id}`).emit('immediate-notification', {
          id: updated.id,
          title: updated.title,
          message: updated.message,
          type: updated.type,
          timestamp: updated.createdAt
        });
      });
    }
  } catch (err) {
    logger.error('Error processing scheduled notifications:', err);
  }
}

// Run scheduler every 30 seconds
const SCHEDULE_INTERVAL_MS = parseInt(process.env.NOTIFICATION_SCHEDULE_INTERVAL_MS || '30000', 10);
setInterval(processScheduledNotifications, SCHEDULE_INTERVAL_MS);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  server.close(() => {
    logger.info('Process terminated');
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  server.close(() => {
    logger.info('Process terminated');
  });
});

// Start server
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  logger.info(`🚀 Supasoka Backend Server running on ${HOST}:${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
});

module.exports = { app, io, prisma };
