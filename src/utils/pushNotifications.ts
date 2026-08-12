import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

export async function registerPushNotifications(userEmail: string) {
  if (!Capacitor.isNativePlatform()) {
    console.log('[Push] Skipping push notification registration on web platform');
    return;
  }

  try {
    console.log('[Push] Initializing push notifications setup for:', userEmail);
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      console.log('[Push] Permission is prompt, requesting from user...');
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('[Push] User denied push notification permissions. Status:', permStatus.receive);
      return;
    }

    console.log('[Push] Permission granted, registering device...');
    // Register with APNs / FCM for push notifications
    await PushNotifications.register();

    // Remove any existing listeners to prevent duplication
    await PushNotifications.removeAllListeners();

    // On success, we will get a registration token
    PushNotifications.addListener('registration', async (token) => {
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

    PushNotifications.addListener('registrationError', (error) => {
      console.error('[Push] Registration error:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Notification received:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[Push] Notification action performed:', action);
    });

  } catch (err) {
    console.error('[Push] Error in push notification registration:', err);
  }
}
