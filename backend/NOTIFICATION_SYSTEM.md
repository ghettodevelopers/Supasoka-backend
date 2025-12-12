# Notification System Documentation

## Overview

The Supasoka backend features a comprehensive, production-ready notification system with:

- **Real-time notifications** via Socket.IO
- **Push notifications** via Pushy service
- **Scheduled notifications** using node-cron
- **Offline notification queuing** for disconnected users
- **Transaction-based operations** to prevent race conditions
- **Database aggregation** for efficient analytics
- **Comprehensive error handling** with detailed context

## Architecture

### Services

#### 1. **pushyService.js**
Handles push notifications to mobile devices using Pushy API.

**Features:**
- Send to single device
- Send to multiple devices
- Retry mechanism with exponential backoff
- Device token validation

**Usage:**
```javascript
const pushyService = require('./services/pushyService');

await pushyService.sendToDevice(deviceToken, {
  title: 'New Message',
  message: 'You have a new notification',
  type: 'general'
}, { customData: 'value' });
```

#### 2. **notificationHelper.js**
Centralized helper functions for all notification operations.

**Key Functions:**
- `createUserNotifications(notificationId, userIds)` - Create user notification records
- `getTargetUsers(targetUserIds)` - Get users for notification delivery
- `emitToUsers(io, users, eventName, payload)` - Emit to specific users via Socket.IO
- `emitToAllUsers(io, eventName, payload)` - Broadcast to all connected users
- `emitToAdmin(io, eventName, payload)` - Emit to admin dashboard
- `sendPushNotifications(users, notification, data)` - Send push notifications
- `sendCompleteNotification(...)` - Complete notification flow (DB + Socket.IO + Push)
- `sendStatusBarNotification(...)` - Send status bar notifications with autoHide
- `markAsReadWithTransaction(userId, notificationId)` - Mark as read (prevents race conditions)
- `markAsClickedWithTransaction(userId, notificationId)` - Track clicks (prevents race conditions)
- `getUnreadCount(userId)` - Get unread notification count

#### 3. **scheduledNotificationService.js**
Manages scheduled notifications using node-cron.

**Features:**
- Automatic processing every 30 seconds (configurable)
- Sends notifications at scheduled time
- Marks notifications as sent
- Handles failures gracefully

**Usage:**
```javascript
const scheduledNotificationService = require('./services/scheduledNotificationService');

// Initialize with Socket.IO instance
scheduledNotificationService.initialize(io);

// Schedule a notification
await scheduledNotificationService.scheduleNotification(notificationId, scheduledAt);

// Cancel scheduled notification
await scheduledNotificationService.cancelScheduledNotification(notificationId);
```

#### 4. **notificationService.js**
Enhanced notification service with offline queue management.

**Features:**
- Offline notification queuing (max 50 per user)
- Automatic delivery on reconnection
- Channel update notifications
- Device validation

## API Endpoints

### User Endpoints

#### GET `/api/notifications`
Get user notifications with pagination.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `unread` (boolean) - Filter unread only

**Response:**
```json
{
  "notifications": [...],
  "unreadCount": 5,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

#### PATCH `/api/notifications/:id/read`
Mark notification as read (transaction-based).

**Response:**
```json
{
  "userNotification": {...},
  "alreadyRead": false
}
```

#### POST `/api/notifications/:id/click`
Track notification click (transaction-based).

**Response:**
```json
{
  "userNotification": {...},
  "alreadyClicked": false
}
```

#### GET `/api/notifications/unread-count`
Get unread notification count.

**Response:**
```json
{
  "unreadCount": 5
}
```

#### POST `/api/notifications/register-device`
Register device token for push notifications.

**Body:**
```json
{
  "deviceToken": "pushy-device-token",
  "deviceId": "optional-device-id"
}
```

#### POST `/api/notifications/test-notification`
Test Socket.IO real-time notification.

**Response:**
```json
{
  "message": "Test notification sent successfully",
  "notification": {...},
  "userStatus": {
    "online": true,
    "connectedSockets": 1
  }
}
```

#### POST `/api/notifications/test-push`
Test push notification via Pushy.

**Response:**
```json
{
  "message": "Test push notification sent successfully",
  "result": {...},
  "deviceToken": "abc123..."
}
```

### Admin Endpoints

#### GET `/api/notifications/admin/all`
Get all notifications with analytics (optimized with DB aggregation).

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `type` (optional) - Filter by notification type

**Response:**
```json
{
  "notifications": [
    {
      "id": "...",
      "title": "...",
      "message": "...",
      "analytics": {
        "totalSent": 100,
        "delivered": 95,
        "read": 80,
        "clicked": 50,
        "deliveryRate": "95.0",
        "readRate": "80.0",
        "clickRate": "50.0"
      }
    }
  ],
  "pagination": {...}
}
```

#### POST `/api/notifications/admin/create`
Create notification (immediate or scheduled).

**Body:**
```json
{
  "title": "New Update",
  "message": "Check out our new features!",
  "type": "update",
  "targetUsers": ["user-id-1", "user-id-2"],
  "scheduledAt": "2024-12-15T10:00:00Z",
  "sendPush": true
}
```

**Notification Types:**
- `general`
- `subscription`
- `update`
- `maintenance`
- `match_started`
- `goal`
- `movie`
- `channel_update`
- `admin_message`
- `access_granted`
- `carousel_update`
- `settings_update`

#### POST `/api/notifications/admin/send-immediate`
Send immediate notification to users.

**Body:**
```json
{
  "title": "Breaking News",
  "message": "Important update!",
  "type": "general",
  "targetUsers": null,
  "sendPush": true
}
```

**Response:**
```json
{
  "notification": {...},
  "stats": {
    "totalUsers": 100,
    "userNotificationsCreated": 100,
    "socketEmissions": 75,
    "offlineUsers": 25,
    "pushNotificationsSent": 80
  }
}
```

#### POST `/api/notifications/admin/send-status-bar`
Send status bar notification (mobile popup with autoHide).

**Body:**
```json
{
  "title": "Quick Alert",
  "message": "This is a status bar notification",
  "targetUsers": null,
  "priority": "high"
}
```

**Priority Levels:**
- `low` - Auto-hide after 5 seconds
- `normal` - Auto-hide after 8 seconds
- `high` - No auto-hide (user must dismiss)

## Socket.IO Events

### Client → Server

#### `join-user`
Join user room to receive notifications.

```javascript
socket.emit('join-user', userId);
```

#### `join-admin-room`
Join admin room for dashboard updates.

```javascript
socket.emit('join-admin-room');
```

### Server → Client

#### `new-notification`
New notification received.

```javascript
socket.on('new-notification', (notification) => {
  // notification: { id, title, message, type, timestamp }
});
```

#### `status-bar-notification`
Status bar notification (mobile popup).

```javascript
socket.on('status-bar-notification', (notification) => {
  // notification: { id, title, message, priority, autoHide, timestamp }
});
```

#### `offline-notification`
Queued notification delivered on reconnection.

```javascript
socket.on('offline-notification', (notification) => {
  // Handle offline notification
});
```

#### `notification-created` (Admin)
New notification created (admin dashboard).

```javascript
socket.on('notification-created', (data) => {
  // data: { notification, stats }
});
```

#### `scheduled-notification-sent` (Admin)
Scheduled notification sent.

```javascript
socket.on('scheduled-notification-sent', (data) => {
  // data: { notificationId, title, scheduledAt, sentAt, stats }
});
```

## Configuration

### Environment Variables

Add to `.env` file:

```env
# Push Notifications (Pushy)
PUSHY_API_KEY="your-pushy-api-key-here"

# Notification Scheduling (milliseconds)
NOTIFICATION_SCHEDULE_INTERVAL_MS=30000
```

### Getting Pushy API Key

1. Sign up at [https://pushy.me](https://pushy.me)
2. Create a new app
3. Copy the API key from the dashboard
4. Add to `.env` file

## Database Schema

### Notification Table
```prisma
model Notification {
  id                String             @id @default(cuid())
  title             String
  message           String
  type              String             @default("general")
  targetUsers       String?
  isActive          Boolean            @default(true)
  scheduledAt       DateTime?
  sentAt            DateTime?
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  userNotifications UserNotification[]
}
```

### UserNotification Table
```prisma
model UserNotification {
  id             String       @id @default(cuid())
  userId         String
  notificationId String
  isRead         Boolean      @default(false)
  readAt         DateTime?
  clicked        Boolean      @default(false)
  clickedAt      DateTime?
  deliveredAt    DateTime?
  createdAt      DateTime     @default(now())
  notification   Notification @relation(...)
  user           User         @relation(...)

  @@unique([userId, notificationId])
}
```

## Features

### 1. Scheduled Notifications
Notifications with `scheduledAt` are automatically sent at the specified time.

```javascript
// Create scheduled notification
POST /api/notifications/admin/create
{
  "title": "Scheduled Update",
  "message": "This will be sent at the scheduled time",
  "scheduledAt": "2024-12-15T10:00:00Z"
}
```

### 2. Offline Notification Queue
Users who are offline when notifications are sent will receive them upon reconnection.

- Max 50 notifications queued per user
- Automatic delivery on `join-user` event
- FIFO queue (oldest notifications delivered first)

### 3. Race Condition Prevention
Read and click operations use database transactions to prevent race conditions.

```javascript
// Transaction-based read operation
const result = await notificationHelper.markAsReadWithTransaction(userId, notificationId);
// Returns: { success, alreadyRead, userNotification }
```

### 4. Optimized Analytics
Admin analytics endpoint uses database aggregation instead of loading all data into memory.

```javascript
// Efficient DB aggregation
const analytics = await prisma.userNotification.groupBy({
  by: ['notificationId'],
  _count: { id: true },
  _sum: { isRead: true, clicked: true }
});
```

### 5. Status Bar Notifications
Mobile-optimized notifications with priority-based auto-hide.

```javascript
POST /api/notifications/admin/send-status-bar
{
  "title": "Quick Alert",
  "message": "Important message",
  "priority": "high" // low: 5s, normal: 8s, high: no auto-hide
}
```

## Error Handling

All endpoints include detailed error context:

```json
{
  "error": "Failed to send notification",
  "context": {
    "adminEmail": "admin@example.com",
    "notificationId": "abc123"
  }
}
```

Logs include full context for debugging:
```javascript
logger.error(`Failed to send notification ${notificationId} - Admin: ${adminEmail}:`, error);
```

## Best Practices

1. **Always register device tokens** for push notifications
2. **Use transactions** for read/click operations to prevent race conditions
3. **Target specific users** when possible to reduce load
4. **Monitor offline queue** size to prevent memory issues
5. **Use appropriate notification types** for better organization
6. **Set priority correctly** for status bar notifications
7. **Schedule notifications** during off-peak hours when possible

## Testing

### Test Real-time Notifications
```bash
POST /api/notifications/test-notification
Authorization: Bearer <user-token>
```

### Test Push Notifications
```bash
POST /api/notifications/test-push
Authorization: Bearer <user-token>
```

### Test Scheduled Notifications
```bash
POST /api/notifications/admin/create
Authorization: Bearer <admin-token>
{
  "title": "Test Scheduled",
  "message": "Will be sent in 1 minute",
  "scheduledAt": "2024-12-11T20:35:00Z"
}
```

## Troubleshooting

### Push notifications not working
1. Verify `PUSHY_API_KEY` is set in `.env`
2. Check user has registered device token
3. Verify device token is valid
4. Check Pushy dashboard for delivery status

### Scheduled notifications not sending
1. Verify cron job is running (check logs for "Scheduled notification service started")
2. Check notification has `scheduledAt` in the past
3. Verify notification `isActive` is true
4. Check notification hasn't already been sent (`sentAt` is null)

### Offline notifications not delivered
1. Verify user emits `join-user` event on connection
2. Check offline queue size (max 50 per user)
3. Verify Socket.IO connection is established

### Analytics showing incorrect data
1. Verify `deliveredAt` is set when creating user notifications
2. Check database indexes are created
3. Ensure `isRead` and `clicked` are boolean values (not integers)

## Performance Optimization

1. **Database Indexes**: Ensure all indexes in schema are created
2. **Pagination**: Always use pagination for large result sets
3. **Aggregation**: Use DB aggregation instead of in-memory processing
4. **Batch Operations**: Use `createMany` with `skipDuplicates: true`
5. **Connection Pooling**: Configure Prisma connection pool size

## Security Considerations

1. **Authentication**: All endpoints require authentication
2. **Authorization**: Admin endpoints require admin role
3. **Input Validation**: All inputs validated with express-validator
4. **Rate Limiting**: API rate limiting configured in server.js
5. **SQL Injection**: Prisma ORM prevents SQL injection
6. **XSS Prevention**: Helmet middleware configured

## Maintenance

### Clear old notifications
```javascript
// Delete notifications older than 90 days
await prisma.notification.deleteMany({
  where: {
    createdAt: {
      lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    }
  }
});
```

### Monitor queue sizes
```javascript
const queueSize = notificationService.getOfflineNotificationCount(userId);
if (queueSize > 40) {
  logger.warn(`Large offline queue for user ${userId}: ${queueSize}`);
}
```

## Support

For issues or questions:
1. Check logs in `backend/logs/`
2. Review this documentation
3. Check Pushy dashboard for push notification issues
4. Verify environment variables are set correctly
