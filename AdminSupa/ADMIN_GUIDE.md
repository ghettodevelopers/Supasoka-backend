# Supasoka Admin Panel - Complete Guide

## Overview

The Supasoka Admin Panel is a comprehensive mobile application for managing the Supasoka streaming platform. Built with React Native and featuring a dark theme with TailwindCSS, it provides full control over users, channels, content, and settings.

## Key Features

### 1. User Management
Control all aspects of user accounts:
- **Activate Users**: Grant access with custom time allocations (days, hours, minutes, seconds)
- **Block/Unblock**: Restrict or restore user access
- **Search**: Find users by unique ID or email
- **Monitor**: View remaining time, points, access level, and activity

### 2. Channel Management with DRM
Complete channel control with security:
- **Add Channels**: Create new streaming channels
- **DRM Protection**: Enable ClearKey DRM for premium content
- **Categories**: Organize by Sports, News, Entertainment, Music, Documentary
- **Priority**: Control channel display order
- **Status Control**: Activate/deactivate channels instantly

### 3. Carousel Management
Manage promotional content:
- **Add Banners**: Upload promotional images
- **Order Control**: Set display sequence
- **Edit/Delete**: Update or remove carousel items

### 4. Real-time Notifications
Instant communication with users:
- **Broadcast**: Send to all users
- **Types**: General, Promotion, Update, Warning
- **Priority**: Low, Normal, High, Urgent
- **Preview**: See notification before sending

### 5. Settings Configuration
System-wide settings:
- **Free Trial**: Set duration for new users
- **Contact Info**: WhatsApp, phone, email support
- **App Settings**: Configure platform parameters

## Getting Started

### Login
1. Open the AdminSupa app
2. Enter your admin email and password
3. Tap "Sign In"

### Dashboard
After login, you'll see:
- Total users count
- Active users (last 24h)
- Channel statistics
- Subscription rate
- Free trial duration
- Quick action buttons

## User Management Guide

### Activating a User

1. Navigate to **Users** screen
2. Search for the user by ID or email
3. Tap **Activate** on the user card
4. Set time allocation:
   - **Days**: Number of days
   - **Hours**: Additional hours
   - **Minutes**: Additional minutes
   - **Seconds**: Additional seconds
5. Tap **Activate User**

**Example**: To give 30 days access:
- Days: 30
- Hours: 0
- Minutes: 0
- Seconds: 0

### Blocking a User

1. Find the user in the Users list
2. Tap **Block** button
3. Confirm the action
4. User will be immediately blocked

### Unblocking a User

1. Find the blocked user (marked with 🚫)
2. Tap **Unblock** button
3. User access is restored

## Channel Management Guide

### Adding a New Channel

1. Navigate to **Channels** screen
2. Tap **+ Add Channel** button
3. Fill in channel details:
   - **Name**: Channel name (e.g., "BBC News")
   - **Stream URL**: HLS stream URL
   - **Category**: Select from dropdown
   - **Logo URL**: Channel logo image URL
   - **Description**: Brief description
   - **Priority**: 0-100 (higher = more prominent)

4. **Optional - Enable DRM Protection**:
   - Toggle "DRM Protection" switch
   - Enter **DRM Key ID** (hex string)
   - Enter **DRM Key** (hex string)
   
5. Tap **Add New Channel**

### DRM Configuration

**What is DRM?**
Digital Rights Management (DRM) protects premium content from unauthorized access.

**ClearKey DRM Setup**:
1. Obtain ClearKey credentials from your content provider
2. When adding/editing a channel, enable DRM
3. Enter the Key ID and Key provided
4. Save the channel

**Important**: Users will need valid keys to play DRM-protected channels.

### Editing a Channel

1. Find the channel in the list
2. Tap **Edit** button
3. Modify any field
4. Update DRM settings if needed
5. Tap **Edit Channel** to save

### Activating/Deactivating Channels

- Tap **Activate** or **Deactivate** button on channel card
- Status changes immediately
- Inactive channels won't appear in user apps

### Deleting a Channel

1. Tap the trash icon on channel card
2. Confirm deletion
3. Channel is permanently removed

## Carousel Management Guide

### Adding Carousel Images

1. Navigate to **Carousel** screen
2. Tap **+ Add Image** button
3. Fill in details:
   - **Title**: Main heading
   - **Subtitle**: Description
   - **Image URL**: Banner image URL
   - **Display Order**: Lower numbers appear first
4. Tap **Add Carousel Image**

**Image Requirements**:
- Aspect ratio: 16:9
- Format: JPG, PNG
- Recommended size: 1920x1080px
- Host on CDN or cloud storage

### Editing Carousel Images

1. Find the image in the list
2. Tap **Edit** button
3. Update fields
4. Tap **Edit Carousel Image**

### Deleting Carousel Images

1. Tap trash icon on image card
2. Confirm deletion

## Notifications Guide

### Sending Notifications

1. Navigate to **Notifications** screen
2. Enter notification details:
   - **Title**: Notification heading
   - **Message**: Notification content
   - **Type**: Select category
   - **Priority**: Set urgency level

3. Review in the preview section
4. Tap **Send to All Users**
5. Confirm to send

**Notification Types**:
- **General**: Regular updates
- **Promotion**: Special offers
- **Update**: App or content updates
- **Warning**: Important alerts

**Priority Levels**:
- **Low**: Non-urgent information
- **Normal**: Standard notifications
- **High**: Important updates
- **Urgent**: Critical alerts

## Settings Guide

### Configuring Free Trial

1. Navigate to **Settings** screen
2. Under "Free Trial Duration":
   - Set **Days**, **Hours**, **Minutes**, **Seconds**
3. Tap **Update Free Trial**

**Example**: 15-second trial:
- Days: 0
- Hours: 0
- Minutes: 0
- Seconds: 15

### Updating Contact Settings

1. Scroll to "Contact Settings"
2. Enter:
   - **WhatsApp Number**: With country code (e.g., +255...)
   - **Call Number**: Support phone number
   - **Support Email**: Contact email
3. Tap **Update Contact Settings**

## Real-time Features

The admin app uses Socket.IO for real-time updates:

- **User Activations**: See when users are activated
- **Payments**: Get notified of successful payments
- **Channel Updates**: Instant channel status changes
- **System Events**: Real-time platform monitoring

## Best Practices

### User Management
- Set reasonable time allocations
- Document block reasons
- Regularly review active users
- Monitor subscription rates

### Channel Management
- Test stream URLs before adding
- Use high-quality logos
- Set appropriate priorities
- Enable DRM for premium content
- Keep descriptions clear and concise

### Carousel Management
- Use high-resolution images
- Update regularly for freshness
- Maintain consistent branding
- Test on different screen sizes

### Notifications
- Keep messages concise
- Use appropriate types and priorities
- Don't spam users
- Test before sending to all

### Security
- Never share admin credentials
- Logout when not in use
- Use strong passwords
- Monitor admin activity logs

## Troubleshooting

### Cannot Login
- Check email and password
- Verify internet connection
- Ensure backend is running
- Contact super admin

### Channels Not Appearing
- Check if channel is activated
- Verify stream URL is valid
- Check category filter
- Refresh the list

### DRM Not Working
- Verify Key ID and Key are correct
- Check DRM type is ClearKey
- Ensure content supports DRM
- Test with DRM-capable player

### Notifications Not Sending
- Check internet connection
- Verify notification content
- Ensure users are active
- Check backend logs

### Real-time Updates Not Working
- Check Socket.IO connection status
- Verify backend is running
- Check network connectivity
- Restart the app

## Support

For technical support or questions:
- Email: support@supasoka.com
- WhatsApp: [Contact number from settings]
- Phone: [Contact number from settings]

## Version Information

- **App Version**: 1.0.0
- **Platform**: React Native (Expo)
- **Backend API**: Supasoka Backend
- **Minimum Requirements**: iOS 13+ / Android 8+

---

**Last Updated**: November 2025
**Maintained by**: Supasoka Development Team
