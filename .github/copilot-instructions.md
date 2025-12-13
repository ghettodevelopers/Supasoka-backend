# Supasoka AI Agent Instructions

## Project Overview
**Supasoka** is a multi-platform TV streaming application with:
- **React Native Frontend** (`/`): Mobile app + AdminSupa admin panel
- **Node.js/Express Backend** (`/backend`): Render.com hosted API
- **Database**: Prisma ORM with SQLite (dev) / PostgreSQL (prod)
- **Real-time**: Socket.IO for live notifications and carousel updates
- **Monetization**: AdMob ads, ZenoPay mobile money payments (Tanzania networks)

## Architecture & Data Flow

### Frontend Architecture (React Native)
```
App.js (Root with All Providers)
  ├── AppStateProvider (global app state)
  ├── ApiProvider (channels, categories, carousel)
  ├── NotificationProvider (Socket.IO, push notifications)
  ├── ContactContext (admin contact settings)
  └── AppNavigator (navigation structure)
      ├── HomeScreen (channels grid, carousel, categories)
      ├── PlayerScreen (video player with DRM)
      ├── UserAccount (profile, points, subscription)
      ├── PaymentScreen (multi-network mobile money)
      └── SupportScreen (contact info)
```

### Backend Structure
```
backend/
├── server.js (Express app, Socket.IO setup)
├── routes/ (API endpoints)
│   ├── auth.js (login, register, JWT tokens)
│   ├── channels.js (channel CRUD, access control)
│   ├── users.js (profile, subscription, points)
│   ├── zenopay.js (payment callbacks)
│   ├── admin.js (admin panel endpoints)
│   ├── notifications.js (notification history)
│   └── streaming.js (video playback, DRM tokens)
├── services/
│   ├── notificationService.js (Socket.IO emit, push notifications)
│   ├── channelAccessService.js (subscription logic, free trial)
│   └── auditLogService.js (admin actions logging)
└── prisma/schema.prisma (data models)
```

### Data Flow
1. **User Auth**: Login → JWT token → Stored in AsyncStorage → Used in API headers
2. **Channel Loading**: ApiContext loads from `/api/channels` → Cached in AsyncStorage → DRM configs preloaded
3. **Real-time Updates**: Socket.IO on `carousel-updated`, `notification-new`, `channel-added` events
4. **Payment**: ZenoPay SMS → Callback to `/api/zenopay/callback` → Activates subscription
5. **Points System**: Earned from watching ads → Stored locally → Synced with backend

## Key Files & Patterns

### Frontend Contexts (State Management)
- **AppStateContext.js**: User, points, subscription, watch history, admin access
  - Socket.IO listener for real-time updates
  - Free trial expiry countdown timer
  - Points history tracking
- **ApiContext.js**: Channels, categories, carousel images
  - Offline caching with AsyncStorage
  - DRM service preloading
  - Retry logic for failed requests
- **NotificationContext.js**: Push notifications, real-time events
  - Multiple Socket.IO URLs fallback (Production → Android emulator → localhost)
  - PushNotification integration for badge/alert
- **ContactContext.js**: Admin-managed call/WhatsApp numbers
  - Fetched from `/api/contact-settings`

### Services Pattern
Each service exports singleton/utility functions:
- **api.js**: Axios instance with JWT interceptor, base URL configuration
- **paymentService.js**: Network detection (M-Pesa, TigoPesa, Airtel, HaloPesa), validation
- **drmService.js**: DRM token generation, DRM config preloading for channels
- **userService.js**: User initialization, preference management

### Backend Middleware & Security
- **authMiddleware**: JWT validation, attached to protected routes
- **errorHandler**: Centralized error responses
- **rate limiting**: Express-rate-limit on auth endpoints
- **CORS**: Allowed origins include Render.com, localhost, capacitor://

### Database Patterns (Prisma)
- **User model**: Email, password hash, subscription status, subscription expiry
- **Channel model**: Title, DRM config (Widevine/Fairplay/ClearKey), isFree, categories
- **Subscription model**: User, type, expiryDate, auto-renewal settings
- **Notification model**: User, type, title, body, read status, timestamp
- **Carousel model**: Title, imageUrl, featured channels

## Critical Developer Workflows

### Local Development
```bash
# Terminal 1: Frontend
npm start                  # Metro bundler
npm run android           # Android emulator

# Terminal 2: Backend
cd backend
npm run dev              # Nodemon with .env for localhost:5000
# .env must have: DATABASE_URL="file:./dev.db"

# AdminSupa (separate build)
cd AdminSupa
npm start
```

### Environment Configuration
- **Frontend**: Uses `api.js` service (base URL from `config/api.js`)
  - Production: `https://supasoka-backend.onrender.com`
  - Development: `http://localhost:5000` or `http://10.0.2.2:5000` (Android)
- **Backend**: Uses `.env` files
  - `.env`: Local development
  - `.env.production`: Render.com deployment
  - Critical vars: `DATABASE_URL`, `JWT_SECRET`, `ZENOPAY_API_KEY`

### Building & Testing
```bash
# Frontend validation
npm run lint            # ESLint check
npm test                # Jest tests

# Backend validation
cd backend
npm test                # Jest tests
npm run health-check    # Verify /health endpoint

# APK builds
npm run android -- --mode=release
```

## Project-Specific Patterns

### Error Handling
- **Network errors**: Fallback to cached data, show toast "Offline mode"
- **Auth errors (401)**: Clear token, redirect to login
- **Validation errors**: Show validation toast with specific field
- **Backend errors (5xx)**: Log to Sentry, retry with exponential backoff

### Socket.IO Events (Real-time)
Frontend listens for:
- `carousel-updated`: Fetch new carousel images
- `notification-new`: Add to notifications list, update badge
- `channel-added`: Append to channels, refresh screen
- `subscription-granted`: Update user subscription status

### Payment Flow (Mobile Money)
1. User selects network → `PaymentScreen` shows required fields
2. Frontend calls ZenoPay API → Opens SMS USSD dialog
3. Backend receives callback at `/api/zenopay/callback` (webhook)
4. Backend activates subscription, emits `subscription-granted` via Socket.IO
5. Frontend receives event, updates UI

### Admin Features
- **AdminSupa** (separate React Native app in `/AdminSupa`)
- Login with backend `/api/admin/login`
- Manage channels, carousel, send notifications
- All changes broadcast via Socket.IO to user app
- Uses same backend, separate authentication token

## Common Tasks & Commands

### Add New API Endpoint
1. Create route in `backend/routes/name.js`
2. Add to `backend/server.js` with `app.use('/api/name', nameRoutes)`
3. Update `contexts/ApiContext.js` or service to call it
4. Test with network tab in React Native debugger

### Add New Screen
1. Create `screens/NewScreen.js` with React Native components
2. Add to AppNavigator stack or bottom tabs
3. Use context hooks: `useAppState()`, `useApi()`, `useNotification()`

### Test Socket.IO Events
Use `AdminSupa` → DashboardScreen to trigger events. Frontend listeners in contexts should respond with toast + state update.

### Database Migrations
```bash
cd backend
npx prisma migrate dev --name description  # Create migration
npx prisma studio                           # GUI for data inspection
npx prisma db push                          # Deploy to Render.com
```

## Deployment Notes
- **Frontend**: EAS Build → Google Play Store
- **AdminSupa**: Internal deployment to TestFlight/internal track
- **Backend**: `render.yaml` configured, auto-deploys on `git push`
- **Database**: PostgreSQL on Render.com (migrations via `npm run build`)

## Known Constraints
- Android emulator requires `10.0.2.2:5000` for localhost backend
- AdMob test ads in development (IDs defined in `services/adMobService.js`)
- DRM playback requires Widevine support (Android 9+, encrypted HTTPS URLs)
- ZenoPay API requires valid merchant credentials in `.env.production`
