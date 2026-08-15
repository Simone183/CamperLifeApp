import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { resolveMediaUrl } from './resolveMediaUrl';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { playAlertSound } from './soundHelper';

export async function registerPushNotifications(userEmail: string) {
  if (!Capacitor.isNativePlatform()) {
    console.log('[Push] Skipping native push notification registration on web platform');
    return;
  }

  if (!userEmail) {
    console.warn('[Push] Cannot register push token: user email is empty');
    return;
  }

  const cleanEmail = userEmail.toLowerCase().trim();

  try {
    console.log('[Push] Initializing push notifications setup for:', cleanEmail);
    
    // 1. Remove any existing listeners to prevent duplicates
    try {
      await PushNotifications.removeAllListeners();
    } catch (e) {
      console.warn('[Push] Failed to remove previous listeners:', e);
    }

    // 2. Setup listeners BEFORE registering (Best Practice)
    try {
      await PushNotifications.addListener('registration', async (token) => {
        const tokenValue = token?.value;
        if (!tokenValue) return;
        console.log('[Push] FCM Token generated successfully:', tokenValue);

        // A. Direct Firestore save (Guaranteed delivery even if server API is slow)
        try {
          const pushTokenDocRef = doc(db, 'push_tokens', cleanEmail);
          await setDoc(pushTokenDocRef, {
            email: cleanEmail,
            token: tokenValue,
            platform: Capacitor.getPlatform(),
            updatedAt: new Date().toISOString()
          }, { merge: true });

          const userDocRef = doc(db, 'users', cleanEmail);
          await setDoc(userDocRef, {
            pushToken: tokenValue,
            pushPlatform: Capacitor.getPlatform(),
            lastTokenUpdate: new Date().toISOString()
          }, { merge: true });

          console.log('[Push] Token successfully saved directly in Firestore push_tokens & users collections.');
        } catch (fsErr) {
          console.warn('[Push] Direct Firestore token save notice:', fsErr);
        }

        // B. Backend API save via resolveMediaUrl
        try {
          const targetUrl = resolveMediaUrl('/api/user/push-token');
          const response = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              token: tokenValue,
              platform: Capacitor.getPlatform()
            })
          });
          if (response.ok) {
            console.log('[Push] Token successfully registered with backend server.');
          } else {
            console.warn('[Push] Backend response for token:', response.status, response.statusText);
          }
        } catch (err) {
          console.warn('[Push] Backend fetch for token failed (Firestore direct save active):', err);
        }
      });

      await PushNotifications.addListener('registrationError', (error) => {
        console.error('[Push] Registration error from FCM:', error);
      });

      // Handle Foreground Notifications (When app is OPEN and active)
      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[Push] Foreground notification received:', notification);
        playAlertSound();

        const notifTitle = notification.title || '🔔 Nuova notifica ViaCamper';
        const notifBody = notification.body || '';

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: {
              message: `${notifTitle}\n${notifBody}`,
              duration: 7000
            }
          })
        );
      });

      // Handle Background / App Closed tap (When user taps notification from Android status bar)
      await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('[Push] User tapped notification:', action);
        const data = action?.notification?.data;
        if (data) {
          if (data.type === 'new_registration' || data.type === 'user_approval' || data.type === 'users') {
            window.dispatchEvent(new CustomEvent('navigate-admin-users'));
          } else if (data.type === 'places' || data.type === 'new_place') {
            window.dispatchEvent(new CustomEvent('navigate-admin-places'));
          } else if (data.type === 'community' || data.type === 'new_message') {
            window.dispatchEvent(new CustomEvent('navigate-community'));
          }
        }
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

    console.log('[Push] Permission granted, creating channel and registering device...');

    // 4. Create the default High Importance notification channel for Android 8.0+
    if (Capacitor.getPlatform() === 'android') {
      try {
        await PushNotifications.createChannel({
          id: 'fcm_default_channel',
          name: 'Notifiche Generali ViaCamper',
          description: 'Notifiche push istantanee per approvazioni, eventi e messaggi',
          importance: 5, // IMPORTANCE_HIGH (5 is max heads-up popup)
          visibility: 1, // VISIBILITY_PUBLIC (1 shows on lockscreen)
          sound: 'default',
          vibration: true,
          lights: true,
          lightColor: '#3E4A35'
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
