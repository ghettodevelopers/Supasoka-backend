package com.supasoka;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class SupasokaFirebaseMessagingService extends FirebaseMessagingService {

    private static final String CHANNEL_ID = "supasoka_notifications";
    private static final String CHANNEL_NAME = "Supasoka Notifications";
    private static final String CHANNEL_DESC = "Taarifa muhimu kutoka Supasoka";
    private static final String TAG = "SupasokaFCM";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        android.util.Log.d(TAG, "📱 FCM Message received from: " + remoteMessage.getFrom());

        // Always show notification - whether from notification payload or data payload
        String title = "Supasoka";
        String body = "";
        String type = "general";

        // Priority 1: Check notification payload (sent by FCM)
        if (remoteMessage.getNotification() != null) {
            title = remoteMessage.getNotification().getTitle() != null
                ? remoteMessage.getNotification().getTitle()
                : "Supasoka";
            body = remoteMessage.getNotification().getBody() != null
                ? remoteMessage.getNotification().getBody()
                : "";
            android.util.Log.d(TAG, "📬 Notification payload - Title: " + title);
        }

        // Priority 2: Check data payload (custom data from backend)
        if (remoteMessage.getData().size() > 0) {
            android.util.Log.d(TAG, "📦 Data payload size: " + remoteMessage.getData().size());

            if (remoteMessage.getData().containsKey("title")) {
                String dataTitle = remoteMessage.getData().get("title");
                if (dataTitle != null && !dataTitle.isEmpty()) {
                    title = dataTitle;
                }
            }
            if (remoteMessage.getData().containsKey("message")) {
                String dataMessage = remoteMessage.getData().get("message");
                if (dataMessage != null && !dataMessage.isEmpty()) {
                    body = dataMessage;
                }
            }
            if (remoteMessage.getData().containsKey("body")) {
                String dataBody = remoteMessage.getData().get("body");
                if (dataBody != null && !dataBody.isEmpty()) {
                    body = dataBody;
                }
            }
            if (remoteMessage.getData().containsKey("type")) {
                type = remoteMessage.getData().get("type");
            }

            android.util.Log.d(TAG, "📦 Data - Title: " + title + ", Body: " + body + ", Type: " + type);
        }

        // Always send notification if we have content
        if (!body.isEmpty()) {
            android.util.Log.d(TAG, "🔔 Displaying notification: " + title);
            sendNotification(title, body, type);
        } else {
            android.util.Log.w(TAG, "⚠️ Empty notification body, skipping display");
        }
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        android.util.Log.d(TAG, "🔄 FCM Token refreshed");
        // Token refresh is handled by React Native Firebase
    }

    /**
     * Display notification with maximum priority to ensure status bar visibility
     */
    private void sendNotification(String title, String messageBody, String type) {
        android.util.Log.d(TAG, "🔔 sendNotification called");

        // Create notification channel first (required for Android O+)
        createNotificationChannel();

        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.putExtra("notification_opened", true);
        intent.putExtra("notification_type", type);
        intent.putExtra("notification_title", title);
        intent.putExtra("notification_body", messageBody);

        // Use unique request code for each notification to prevent replacement
        int requestCode = (int) System.currentTimeMillis();

        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        // Build notification with MAXIMUM priority for status bar display
        NotificationCompat.Builder notificationBuilder =
            new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(messageBody)
                .setStyle(new NotificationCompat.BigTextStyle()
                    .bigText(messageBody)
                    .setBigContentTitle(title))
                .setAutoCancel(true)
                .setSound(defaultSoundUri)
                // CRITICAL: Maximum priority for heads-up notification
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                // Show timestamp
                .setShowWhen(true)
                .setWhen(System.currentTimeMillis())
                // Ticker text for status bar
                .setTicker(title + ": " + messageBody)
                // Badge and notification light
                .setNumber(1)
                .setLights(Color.BLUE, 1000, 1000)
                // Vibration pattern
                .setVibrate(new long[]{0, 500, 200, 500})
                // Content intent
                .setContentIntent(pendingIntent)
                // Full screen intent for high importance (optional, shows over other apps)
                .setFullScreenIntent(pendingIntent, false);

        NotificationManager notificationManager =
            (NotificationManager) getSystemService(NOTIFICATION_SERVICE);

        if (notificationManager != null) {
            // Use unique notification ID so notifications don't replace each other
            int notificationId = (int) System.currentTimeMillis();

            android.util.Log.d(TAG, "📤 Posting notification to system with ID: " + notificationId);
            notificationManager.notify(notificationId, notificationBuilder.build());
            android.util.Log.d(TAG, "✅ Notification posted successfully");
        } else {
            android.util.Log.e(TAG, "❌ NotificationManager is null!");
        }
    }

    /**
     * Create notification channel with MAXIMUM importance for Android O+
     * This ensures notifications always show in status bar
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager =
                (NotificationManager) getSystemService(NOTIFICATION_SERVICE);

            if (notificationManager == null) {
                android.util.Log.e(TAG, "❌ NotificationManager is null in createNotificationChannel!");
                return;
            }

            // Check if channel already exists
            NotificationChannel existingChannel = notificationManager.getNotificationChannel(CHANNEL_ID);
            if (existingChannel != null) {
                android.util.Log.d(TAG, "✅ Notification channel already exists with importance: " + existingChannel.getImportance());

                // If importance is not HIGH, recreate the channel
                if (existingChannel.getImportance() < NotificationManager.IMPORTANCE_HIGH) {
                    android.util.Log.w(TAG, "⚠️ Channel importance too low, deleting and recreating...");
                    notificationManager.deleteNotificationChannel(CHANNEL_ID);
                } else {
                    return; // Channel exists with correct importance
                }
            }

            // Create channel with MAXIMUM importance
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH // CRITICAL: HIGH importance for status bar display
            );

            channel.setDescription(CHANNEL_DESC);

            // Enable all notification features
            channel.enableLights(true);
            channel.setLightColor(Color.BLUE);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 500, 200, 500});
            channel.setShowBadge(true);

            // Show on lock screen
            channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);

            // Bypass Do Not Disturb (optional, use carefully)
            channel.setBypassDnd(false);

            // Set sound
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .build();
            channel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION), audioAttributes);

            notificationManager.createNotificationChannel(channel);
            android.util.Log.d(TAG, "✅ Notification channel created with IMPORTANCE_HIGH");
        } else {
            android.util.Log.d(TAG, "📱 Android version < O, notification channel not needed");
        }
    }
}
