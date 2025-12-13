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
    
    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        
        // Always show notification - whether from notification payload or data payload
        String title = "Supasoka";
        String body = "";
        
        if (remoteMessage.getNotification() != null) {
            title = remoteMessage.getNotification().getTitle() != null 
                ? remoteMessage.getNotification().getTitle() 
                : "Supasoka";
            body = remoteMessage.getNotification().getBody() != null 
                ? remoteMessage.getNotification().getBody() 
                : "";
        }
        
        // Also check data payload for notifications
        if (remoteMessage.getData().size() > 0) {
            if (remoteMessage.getData().containsKey("title")) {
                title = remoteMessage.getData().get("title");
            }
            if (remoteMessage.getData().containsKey("message")) {
                body = remoteMessage.getData().get("message");
            }
            if (remoteMessage.getData().containsKey("body")) {
                body = remoteMessage.getData().get("body");
            }
        }
        
        if (!body.isEmpty()) {
            sendNotification(title, body);
        }
    }
    
    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        // Token refresh handled by React Native
    }
    
    private void sendNotification(String title, String messageBody) {
        // Create notification channel first (required for Android O+)
        createNotificationChannel();
        
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("notification_opened", true);
        
        // Use unique request code for each notification
        int requestCode = (int) System.currentTimeMillis();
        
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 
            requestCode, 
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        
        NotificationCompat.Builder notificationBuilder =
            new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(messageBody)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(messageBody))
                .setAutoCancel(true)
                .setSound(defaultSoundUri)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setContentIntent(pendingIntent);
        
        NotificationManager notificationManager =
            (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        
        // Use unique notification ID so notifications don't replace each other
        int notificationId = (int) System.currentTimeMillis();
        notificationManager.notify(notificationId, notificationBuilder.build());
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager =
                (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            
            // Check if channel already exists
            NotificationChannel existingChannel = notificationManager.getNotificationChannel(CHANNEL_ID);
            if (existingChannel != null) {
                return;
            }
            
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Taarifa muhimu kutoka Supasoka");
            channel.enableLights(true);
            channel.setLightColor(Color.BLUE);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 500, 200, 500});
            channel.setShowBadge(true);
            channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
            
            // Set sound
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .build();
            channel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION), audioAttributes);
            
            notificationManager.createNotificationChannel(channel);
        }
    }
}
