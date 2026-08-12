import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

export async function registerPushNotifications(userEmail: string) {
  if (!Capacitor.isNativePlatform()) {
    console.log('[Push] Skipping push notification registration on web platform');
    return;
  }

  try {
    console.log('[Push] Initializing push notifications setup for:', userEmail);
    
    // 1. Remove any existing listeners to prevent duplicates
    try {
      await PushNotifications.removeAllListeners();
    } catch (e) {
      console.warn('[Push] Failed to remove listeners:', e);
    }

    // 2. Setup listeners BEFORE registering (Best Practice)
    try {
      await PushNotifications.addListener('registration', async (token) => {
        console.log('[Push] Token registered successfully:', token.value);
        try {
          const response = await fetch('/api/user/push-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: userEmail,
              token: token.value,
              platform: Capacitor.getPlatform()
            })
          });
          if (response.ok) {
            console.log('[Push] Token sent to backend and stored in Firestore.');
          } else {
            console.error('[Push] Backend rejected push token registration:', response.statusText);
          }
        } catch (err) {
          console.error('[Push] Failed to register token with backend:', err);
        }
      });

      await PushNotifications.addListener('registrationError', (error) => {
        console.error('[Push] Registration error:', error);
      });

      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[Push] Notification received:', notification);
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('[Push] Notification action performed:', action);
      });
      console.log('[Push] Listeners added successfully.');
    } catch (listenerErr) {
      console.error('[Push] Failed to add listeners:', listenerErr);
    }

    // 3. Check current permission status
    let permStatus;
    try {
      permStatus = await PushNotifications.checkPermissions();
    } catch (err) {
      console.error('[Push] Failed to check permissions:', err);
      return;
    }

    if (permStatus.receive === 'prompt') {
      console.log('[Push] Permission is prompt, requesting from user...');
      try {
        permStatus = await PushNotifications.requestPermissions();
      } catch (err) {
        console.error('[Push] Failed to request permissions:', err);
        return;
      }
    }

    if (permStatus.receive !== 'granted') {
      console.warn('[Push] User denied push notification permissions. Status:', permStatus.receive);
      return;
    }

    console.log('[Push] Permission granted, registering device...');

    // 4. Create the default High Importance notification channel for Android 8.0+
    if (Capacitor.getPlatform() === 'android') {
      try {
        await PushNotifications.createChannel({
          id: 'fcm_default_channel',
          name: 'Notifiche Generali',
          description: 'Notifiche push promozionali e di servizio',
          importance: 5, // IMPORTANCE_HIGH (5 is max)
          visibility: 1, // VISIBILITY_PUBLIC (1 is public)
          sound: 'default',
          vibration: true,
        });
        console.log('[Push] Notification channel "fcm_default_channel" created/verified successfully');
      } catch (channelErr) {
        console.error('[Push] Failed to create Android notification channel:', channelErr);
      }
    }

    // 5. Register with APNs / FCM for push notifications
    try {
      await PushNotifications.register();
      console.log('[Push] PushNotifications.register() called successfully');
    } catch (regErr) {
      console.error('[Push] Failed to register with push service:', regErr);
    }

  } catch (err) {
    console.error('[Push] Critical error in push notification registration flow:', err);
  }
}
