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

  const resolvedEmail = userEmail || localStorage.getItem('camper_user_email') || 'sambucci.simone@gmail.com';
  const cleanEmail = resolvedEmail.toLowerCase().trim();

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

        let lastGps: { lat: number; lng: number } | null = null;
        try {
          const storedGps = localStorage.getItem('last_known_gps_location');
          if (storedGps) lastGps = JSON.parse(storedGps);
        } catch (e) {}

        // A. Direct Firestore save (Guaranteed delivery even if server API is slow)
        try {
          const pushTokenDocRef = doc(db, 'push_tokens', cleanEmail);
          const pushDocPayload: any = {
            email: cleanEmail,
            token: tokenValue,
            platform: Capacitor.getPlatform(),
            updatedAt: new Date().toISOString()
          };
          if (lastGps && typeof lastGps.lat === 'number' && typeof lastGps.lng === 'number') {
            pushDocPayload.lat = lastGps.lat;
            pushDocPayload.lng = lastGps.lng;
          }
          await setDoc(pushTokenDocRef, pushDocPayload, { merge: true });

          const userDocRef = doc(db, 'users', cleanEmail);
          const userDocPayload: any = {
            pushToken: tokenValue,
            pushPlatform: Capacitor.getPlatform(),
            lastTokenUpdate: new Date().toISOString()
          };
          if (lastGps && typeof lastGps.lat === 'number' && typeof lastGps.lng === 'number') {
            userDocPayload.lastLocation = { lat: lastGps.lat, lng: lastGps.lng, updatedAt: new Date().toISOString() };
          }
          await setDoc(userDocRef, userDocPayload, { merge: true });

          // Also ensure admin push token is saved if this is the superadmin user
          if (cleanEmail === 'sambucci.simone@gmail.com' || cleanEmail === 'viacamperapp@gmail.com') {
            const adminDocRef = doc(db, 'push_tokens', 'sambucci.simone@gmail.com');
            await setDoc(adminDocRef, pushDocPayload, { merge: true });
          }

          console.log('[Push] Token and location successfully saved directly in Firestore push_tokens & users collections.');
        } catch (fsErr) {
          console.warn('[Push] Direct Firestore token save notice:', fsErr);
        }

        // B. Backend API save via resolveMediaUrl
        try {
          const targetUrl = resolveMediaUrl('/api/user/push-token');
          await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              token: tokenValue,
              platform: Capacitor.getPlatform(),
              lat: lastGps?.lat,
              lng: lastGps?.lng
            })
          });
          console.log('[Push] Token successfully registered with backend server.');
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
          } else if (data.type === 'weather_alert') {
            window.dispatchEvent(new CustomEvent('open-weather-modal'));
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

    if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
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
      // Small pause to guarantee native activity lifecycle and providers have fully settled
      await new Promise((resolve) => setTimeout(resolve, 600));
      await PushNotifications.register();
      console.log('[Push] PushNotifications.register() called successfully');
    } catch (regErr) {
      console.error('[Push] Failed to register with push service:', regErr);
    }

  } catch (err) {
    console.error('[Push] Critical error in push notification registration flow:', err);
  }
}

export async function updateUserLocationOnServer(lat: number, lng: number, userEmail?: string) {
  try {
    const email = userEmail || localStorage.getItem('camper_user_email') || localStorage.getItem('user_email') || 'sambucci.simone@gmail.com';
    const cleanEmail = email.toLowerCase().trim();

    // Direct Firestore update for location
    try {
      const pushTokenDocRef = doc(db, 'push_tokens', cleanEmail);
      await setDoc(pushTokenDocRef, {
        email: cleanEmail,
        lat,
        lng,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      const userDocRef = doc(db, 'users', cleanEmail);
      await setDoc(userDocRef, {
        lastLocation: { lat, lng, updatedAt: new Date().toISOString() }
      }, { merge: true });
    } catch (e) {}

    // Backend API update
    const targetUrl = resolveMediaUrl('/api/user/location');
    await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        lat,
        lng,
        platform: Capacitor.getPlatform()
      })
    });
  } catch (err) {
    // Silent catch
  }
}
