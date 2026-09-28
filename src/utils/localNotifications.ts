import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PROMO_MESSAGES } from '../data/promoMessages';

/**
 * Schedule local notifications to arrive every 2 days on native mobile devices.
 * If force is true or if less than 10 pending notifications remain, it cancels
 * old pending notifications and schedules 50 fresh notifications (one every 48 hours).
 */
export async function scheduleLocalPromoNotifications(force = false) {
  if (!Capacitor.isNativePlatform()) {
    console.log('[LocalPush] Skipping local notifications on web platform');
    return { success: false, reason: 'web_platform', count: 0 };
  }

  try {
    // 1. Check and request permissions
    let permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display === 'prompt' || permStatus.display === 'prompt-with-rationale') {
      permStatus = await LocalNotifications.requestPermissions();
    }

    if (permStatus.display !== 'granted') {
      console.warn('[LocalPush] Permission denied for local notifications:', permStatus.display);
      return { success: false, reason: 'permission_denied', count: 0 };
    }

    // 2. Create notification channel on Android (High Importance for popup & sound)
    if (Capacitor.getPlatform() === 'android') {
      try {
        await LocalNotifications.createChannel({
          id: 'promo_channel',
          name: 'Consigli & Notifiche ViaCamper',
          description: 'Suggerimenti, avvisi e curiosità sull\'app ViaCamper',
          importance: 4, // IMPORTANCE_HIGH (sound + heads-up banner)
          visibility: 1, // VISIBILITY_PUBLIC (lock screen)
          sound: 'default',
          vibration: true,
          lights: true,
          lightColor: '#3E4A35'
        });
      } catch (chErr) {
        console.warn('[LocalPush] Notice creating Android promo_channel:', chErr);
      }
    }

    // 3. Check existing pending notifications
    const pending = await LocalNotifications.getPending();
    const existingCount = pending.notifications ? pending.notifications.length : 0;

    // If not forcing, and we already have 10 or more pending notifications queued, skip
    if (!force && existingCount >= 10) {
      console.log(`[LocalPush] ${existingCount} notifications already queued. Skipping schedule.`);
      return { success: true, count: existingCount, action: 'skipped_existing' };
    }

    // 4. Cancel existing promo notifications before rescheduling to avoid duplicates
    if (existingCount > 0) {
      try {
        const idsToCancel = pending.notifications.map((n) => ({ id: n.id }));
        await LocalNotifications.cancel({ notifications: idsToCancel });
        console.log(`[LocalPush] Cancelled ${idsToCancel.length} stale pending notifications.`);
      } catch (cancelErr) {
        console.warn('[LocalPush] Warning cancelling old notifications:', cancelErr);
      }
    }

    // 5. Build 50 promo notifications scheduled every 2 days (48h interval)
    console.log('[LocalPush] Scheduling 50 fresh promo notifications (one every 2 days at 14:00)');

    const notifications = PROMO_MESSAGES.slice(0, 50).map((msg, index) => {
      const scheduleDate = new Date();
      // Schedule first item 2 days from now, then +2 days for each subsequent item
      scheduleDate.setDate(scheduleDate.getDate() + (index + 1) * 2);
      scheduleDate.setHours(14, 0, 0, 0); // 14:00 (2 PM)

      return {
        id: index + 100, // Unique IDs 100 to 149
        title: msg.title,
        body: msg.body,
        schedule: { at: scheduleDate },
        sound: 'default',
        channelId: 'promo_channel',
        actionTypeId: 'OPEN_APP',
        extra: { promoIndex: index, type: 'promo_local' }
      };
    });

    await LocalNotifications.schedule({ notifications });
    console.log('[LocalPush] Scheduled 50 local promo notifications successfully!');
    return { success: true, count: notifications.length, action: 'scheduled_50' };

  } catch (err: any) {
    console.error('[LocalPush] Failed to schedule notifications:', err);
    return { success: false, reason: err?.message || String(err), count: 0 };
  }
}

/**
 * Send an immediate test notification in 3 seconds to verify popup and sound on mobile
 */
export async function sendTestLocalNotification(): Promise<{ success: boolean; message: string }> {
  if (!Capacitor.isNativePlatform()) {
    return { success: false, message: 'Le notifiche locali funzionano sull\'app mobile Android/iOS.' };
  }

  try {
    let permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display === 'prompt' || permStatus.display === 'prompt-with-rationale') {
      permStatus = await LocalNotifications.requestPermissions();
    }

    if (permStatus.display !== 'granted') {
      return { success: false, message: 'Permesso notifiche non concesso nel sistema operativo.' };
    }

    if (Capacitor.getPlatform() === 'android') {
      try {
        await LocalNotifications.createChannel({
          id: 'promo_channel',
          name: 'Consigli & Notifiche ViaCamper',
          description: 'Suggerimenti, avvisi e curiosità sull\'app ViaCamper',
          importance: 4,
          visibility: 1,
          sound: 'default',
          vibration: true,
          lights: true,
          lightColor: '#3E4A35'
        });
      } catch (e) {}
    }

    const testDate = new Date(Date.now() + 3000); // 3 seconds from now

    await LocalNotifications.schedule({
      notifications: [
        {
          id: 999,
          title: '🔔 Prova Notifica ViaCamper',
          body: 'Notifica di test programmata con successo! L\'app ti invierà avvisi ogni 2 giorni.',
          schedule: { at: testDate },
          sound: 'default',
          channelId: 'promo_channel',
          extra: { type: 'test_notification' }
        }
      ]
    });

    return { success: true, message: 'Notifica di prova programmata tra 3 secondi!' };
  } catch (err: any) {
    return { success: false, message: 'Errore invio notifica di prova: ' + (err?.message || err) };
  }
}

/**
 * Get count of currently scheduled pending notifications on device
 */
export async function getScheduledNotificationsCount(): Promise<number> {
  if (!Capacitor.isNativePlatform()) return 0;
  try {
    const pending = await LocalNotifications.getPending();
    return pending.notifications ? pending.notifications.length : 0;
  } catch {
    return 0;
  }
}
