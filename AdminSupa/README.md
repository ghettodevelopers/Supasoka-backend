# AdminSupa - Supasoka Admin Panel

AdminSupa is the administrative mobile application for managing the Supasoka streaming platform. Built with Expo and React Native, it provides a comprehensive interface for managing users, channels, carousel images, and other platform features.

## Features

- **Dashboard**: Overview of platform statistics (users, channels, activity)
- **User Management**: View, activate/deactivate users, manage subscriptions
- **Channel Management**: Add, edit, delete streaming channels
- **Carousel Management**: Manage promotional carousel images
- **Secure Authentication**: Admin-only access with JWT authentication

## Tech Stack

- **Expo SDK 54**
- **React Native 0.81**
- **React Navigation** (Drawer & Stack)
- **React Native Paper** (Material Design UI)
- **Axios** (API communication)
- **Expo Secure Store** (Secure token storage)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your mobile device (for testing)

### Installation

1. Navigate to the AdminSupa directory:
```bash
cd AdminSupa
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://supasoka-backend.onrender.com/api",
      "socketUrl": "https://supasoka-backend.onrender.com"
    }
  }
}
```

3. Start the development server:
```bash
npm start
```

4. Run on device:
```bash
npm run android  # For Android
npm run ios      # For iOS
```

## Tech Stack

- **React Native** - Expo SDK 54
- **NativeWind** - TailwindCSS for React Native
- **React Navigation** - Drawer navigation
- **Socket.IO Client** - Real-time communication
- **Axios** - HTTP client
- **Expo Secure Store** - Secure token storage
- **React Native Paper** - UI components

## Admin Features

### Dashboard
- View total users, active users, and subscribed users
- Monitor channel statistics
- Track featured channels
- Free trial duration display
- Quick action buttons

### User Management
- **Activate Users** - Set custom time (days, hours, minutes, seconds)
- **Block/Unblock** - Control user access with reasons
- **Search** - Find users by ID or email
- **View Details** - Remaining time, points, access level
- **Real-time Updates** - Instant user status changes

### Channel Management
- **Add Channels** - Name, stream URL, category, logo, description
- **DRM Protection** - Enable ClearKey DRM with Key ID and Key
- **Priority System** - Set channel display order
- **Toggle Status** - Activate/deactivate channels
- **Categories** - Sports, News, Entertainment, Music, Documentary
- **Edit/Delete** - Full channel management

### Carousel Management
- **Add Images** - Title, subtitle, image URL, display order
- **Image Picker** - Select from gallery
- **Order Control** - Set display sequence
- **Edit/Delete** - Manage carousel content

### Notifications
- **Send to All Users** - Broadcast notifications
- **Message Types** - General, Promotion, Update, Warning
- **Priority Levels** - Low, Normal, High, Urgent
- **Live Preview** - See notification before sending
- **Real-time Delivery** - Instant push to user apps

### Settings
- **Free Trial** - Configure duration (days, hours, minutes, seconds)
- **Contact Settings** - WhatsApp, phone, email support
- **App Information** - Version, platform, API status

## DRM Configuration

When enabling DRM for a channel:

1. Toggle "DRM Protection" switch
2. Select DRM type (ClearKey)
3. Enter **Key ID** (hex string)
4. Enter **Key** (hex string)
5. Save channel

The user app will request these keys when playing DRM-protected content.

## API Endpoints Used

- `/auth/admin/login` - Admin authentication
- `/admin/stats` - Dashboard statistics
- `/admin/users` - User management
- `/channels` - Channel CRUD operations
- `/admin/carousel-images` - Carousel management
- `/admin/notifications/send-realtime` - Send notifications
- `/admin/free-trial` - Free trial settings
- `/admin/contact-settings` - Contact information

## Real-time Events

Socket.IO events listened by admin:
- `user-activated` - User activation notifications
- `payment-received` - Payment confirmations
- `channel-updated` - Channel changes
- `carousel-updated` - Carousel changes

## Security

- JWT token authentication
- Secure token storage with Expo Secure Store
- Admin-only routes protected by middleware
- HTTPS communication with backend

## Default Admin Credentials

Contact your backend administrator for admin credentials.

## Support

For issues or questions, contact the development team.

## Project Structure

```
AdminSupa/
├── src/
│   ├── screens/          # Screen components
│   │   ├── LoginScreen.js
│   │   ├── DashboardScreen.js
│   │   ├── UsersScreen.js
│   │   ├── ChannelsScreen.js
│   │   └── CarouselScreen.js
│   ├── navigation/       # Navigation configuration
│   │   └── AppNavigator.js
│   ├── contexts/         # React contexts
│   │   └── AuthContext.js
│   ├── services/         # API services
│   │   └── api.js
│   ├── components/       # Reusable components
│   └── utils/           # Utility functions
├── assets/              # Images, fonts, etc.
├── App.js              # Main app component
├── app.json            # Expo configuration
└── package.json        # Dependencies

```

## API Endpoints Used

- `POST /api/auth/admin/login` - Admin login
- `GET /api/admin/profile` - Get admin profile
- `GET /api/admin/dashboard/stats` - Dashboard statistics
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users/:id/status` - Update user status
- `GET /api/channels` - List all channels
- `POST /api/admin/channels` - Create channel
- `PUT /api/admin/channels/:id` - Update channel
- `DELETE /api/admin/channels/:id` - Delete channel
- `GET /api/admin/carousel` - List carousel items
- `POST /api/admin/carousel` - Create carousel item
- `PUT /api/admin/carousel/:id` - Update carousel item
- `DELETE /api/admin/carousel/:id` - Delete carousel item

## Security

- JWT tokens stored securely using Expo Secure Store
- Admin-only middleware on backend routes
- Automatic token refresh on 401 responses
- Secure HTTPS communication with backend

## Development

### Running on Android Emulator
```bash
npm run android
```

### Running on iOS Simulator
```bash
npm run ios
```

### Running on Web
```bash
npm run web
```

## Troubleshooting

### Connection Issues
- Ensure backend API is running and accessible
- Check API URL in `app.json`
- Verify network connectivity

### Authentication Issues
- Verify admin credentials in backend
- Check token storage permissions
- Clear app data and retry

## License

Proprietary - Supasoka Platform

## Support

For issues or questions, contact the Supasoka development team.
