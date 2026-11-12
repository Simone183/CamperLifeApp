import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PROMO_MESSAGES } from '../data/promoMessages';

const CURRENT_APP_VERSION = '2.5.20';

/**
 * Helper to schedule notifications safely on Android 12+ (API 31+) without USE_EXACT_ALARM.
 * Uses SCHEDULE_EXACT_ALARM if granted by the user, and automatically falls back to
 * inexact scheduling (allowWhileIdle: false) if the user revoked exact alarms in Android Settings.
 */
async function scheduleNotificationsSafely(notifications: any[]) {
  let canUseExact = true;
  if (Capacitor.getPlatform() === 'android' && typeof (LocalNotifications as any).checkExactNotificationSetting === 'function') {
    try {
      const exactStatus = await (LocalNotifications as any).checkExactNotificationSetting();
      if (exactStatus && exactStatus.exact_alarm !== 'granted') {
        canUseExact = false;
      }
    } catch {
      // Ignore if plugin version doesn't implement checkExactNotificationSetting
    }
  }

  const prepared = notifications.map((n) => ({
    ...n,
    schedule: {
      ...n.schedule,
      allowWhileIdle: canUseExact ? Boolean(n.schedule?.allowWhileIdle ?? true) : false
    }
  }));

  try {
    await LocalNotifications.schedule({ notifications: prepared });
  } catch (err) {
    // Fallback to non-exact alarms if Android throws SecurityException for SCHEDULE_EXACT_ALARM
    console.warn('[LocalPush] Exact alarm restricted by OS, falling back to standard inexact alarm:', err);
    const fallbackNotifs = notifications.map((n) => ({
      ...n,
      schedule: {
        ...n.schedule,
        allowWhileIdle: false
      }
    }));
    await LocalNotifications.schedule({ notifications: fallbackNotifs });
  }
}

/**
 * Schedule native reminders for Camper Deadlines (Revisione, Assicurazione, Bollo, Tagliando, ecc.)
 * Sends notifications 7 days before and 1 day before each active deadline at 09:30.
 */
export async function scheduleCamperDeadlineNotifications(deadlinesInput?: any[]) {
  if (!Capacitor.isNativePlatform()) return { scheduled: 0 };

  try {
    let permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display !== 'granted') return { scheduled: 0 };

    if (Capacitor.getPlatform() === 'android') {
      try {
        await LocalNotifications.createChannel({
          id: 'deadlines_channel',
          name: 'Scadenze & Manutenzioni Camper 📅',
          description: 'Avvisi per scadenza revisione, assicurazione, bollo e manutenzione del camper',
          importance: 5,
          visibility: 1,
          sound: 'default',
          vibration: true,
          lights: true,
          lightColor: '#A45C40'
        });
      } catch (e) {}
    }

    let deadlines = deadlinesInput;
    if (!Array.isArray(deadlines)) {
      try {
        const raw = localStorage.getItem('camper_deadlines');
        deadlines = raw ? JSON.parse(raw) : [];
      } catch {
        deadlines = [];
      }
    }

    if (!Array.isArray(deadlines) || deadlines.length === 0) return { scheduled: 0 };

    // Cancel previous deadline notifications (IDs 2000 to 2999)
    try {
      const pending = await LocalNotifications.getPending();
      const deadlineIds = (pending.notifications || [])
        .filter((n) => n.id >= 2000 && n.id < 3000)
        .map((n) => ({ id: n.id }));
      if (deadlineIds.length > 0) {
        await LocalNotifications.cancel({ notifications: deadlineIds });
      }
    } catch (e) {}

    const now = Date.now();
    const notificationsToSchedule: any[] = [];
    let idCounter = 2000;

    deadlines.forEach((item: any) => {
      if (!item || item.done || !item.dueDate) return;
      const [y, m, d] = String(item.dueDate).split('-').map(Number);
      if (!y || !m || !d) return;

      // Reminders: 7 days before, 1 day before, and day of deadline at 09:30
      const offsets = [
        { daysBefore: 7, label: 'tra 7 giorni' },
        { daysBefore: 1, label: 'domani' },
        { daysBefore: 0, label: 'oggi' }
      ];

      offsets.forEach(({ daysBefore, label }) => {
        if (idCounter >= 2990) return;
        const targetDate = new Date(y, m - 1, d, 9, 30, 0, 0);
        targetDate.setDate(targetDate.getDate() - daysBefore);

        if (targetDate.getTime() > now + 60_000) {
          notificationsToSchedule.push({
            id: idCounter++,
            title: `📅 Scadenza Camper: ${item.title || item.category || 'Promemoria'}`,
            body: `La scadenza "${item.title || item.category}" è prevista ${label} (${item.dueDate}). Controlla lo Scadenziere di ViaCamper!`,
            schedule: { at: targetDate, allowWhileIdle: true },
            sound: 'default',
            channelId: 'deadlines_channel',
            actionTypeId: 'OPEN_APP',
            extra: { type: 'deadline_reminder', deadlineId: item.id }
          });
        }
      });
    });

    if (notificationsToSchedule.length > 0) {
      await scheduleNotificationsSafely(notificationsToSchedule);
      console.log(`[LocalPush] Scheduled ${notificationsToSchedule.length} camper deadline notifications.`);
    }

    return { scheduled: notificationsToSchedule.length };
  } catch (err) {
    console.warn('[LocalPush] Warning scheduling camper deadline notifications:', err);
    return { scheduled: 0 };
  }
}

/**
 * Schedule local notifications to arrive every 2 days on native mobile devices.
 * Automatically detects Play Store app updates and forces fresh rescheduling.
 * If force is true, app version changed, or less than 25 pending notifications remain,
 * it cancels old pending notifications and schedules 50 fresh notifications.
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
          importance: 5, // IMPORTANCE_MAX (sound + heads-up banner)
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

    // Always keep camper deadline reminders synced
    await scheduleCamperDeadlineNotifications();

    // 3. Check existing pending notifications & app update state
    const pending = await LocalNotifications.getPending();
    const promoPending = (pending.notifications || []).filter((n) => n.id >= 100 && n.id < 200);
    const existingCount = promoPending.length;
    const lastVersion = localStorage.getItem('camper_last_scheduled_app_version');

    let shouldForce = force;
    if (lastVersion !== CURRENT_APP_VERSION) {
      console.log(`[LocalPush] Play Store app update detected (${lastVersion || 'none'} -> ${CURRENT_APP_VERSION}). Forcing fresh reschedule!`);
      shouldForce = true;
    }

    // If not forcing, and we already have 25 or more pending notifications queued, skip
    if (!shouldForce && existingCount >= 25) {
      console.log(`[LocalPush] ${existingCount} notifications already queued. Skipping schedule.`);
      return { success: true, count: existingCount, action: 'skipped_existing' };
    }

    // 4. Cancel existing promo notifications before rescheduling to avoid duplicates
    if (existingCount > 0) {
      try {
        const idsToCancel = promoPending.map((n) => ({ id: n.id }));
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
        schedule: { at: scheduleDate, allowWhileIdle: true },
        sound: 'default',
        channelId: 'promo_channel',
        actionTypeId: 'OPEN_APP',
        extra: { promoIndex: index, type: 'promo_local' }
      };
    });

    await scheduleNotificationsSafely(notifications);
    try {
      localStorage.setItem('camper_last_scheduled_app_version', CURRENT_APP_VERSION);
    } catch (e) {}
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

    await scheduleNotificationsSafely([
      {
        id: 999,
        title: '🔔 Prova Notifica ViaCamper',
        body: 'Notifica di test programmata con successo! L\'app ti invierà avvisi ogni 2 giorni.',
        schedule: { at: testDate, allowWhileIdle: true },
        sound: 'default',
        channelId: 'promo_channel',
        extra: { type: 'test_notification' }
      }
    ]);

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

/**
 * Send an immediate Android push notification for severe weather alerts (MeteoAlarm / Community)
 */
export async function sendWeatherAlertPushNotification(title: string, body: string, alertId: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[WeatherPush] Triggering Web Notification on web/PWA platform...');
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(`⚠️ ${title}`, {
            body: body,
            icon: '/pwa-192x192.png',
            tag: alertId
          });
          return true;
        } else if (Notification.permission !== 'denied') {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') {
            new Notification(`⚠️ ${title}`, {
              body: body,
              icon: '/pwa-192x192.png',
              tag: alertId
            });
            return true;
          }
        }
      }
    } catch (e) {
      console.warn('[WeatherPush] Web notification warning:', e);
    }
    return false;
  }

  try {
    let permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display === 'prompt' || permStatus.display === 'prompt-with-rationale') {
      permStatus = await LocalNotifications.requestPermissions();
    }

    if (permStatus.display !== 'granted') {
      console.warn('[WeatherPush] Local notification permission not granted:', permStatus.display);
      return false;
    }

    // Android High Importance Channel with Sound & Vibration
    if (Capacitor.getPlatform() === 'android') {
      try {
        await LocalNotifications.createChannel({
          id: 'weather_alert_channel',
          name: 'Allerte Meteo ViaCamper ⚡',
          description: 'Allarmi meteorologici immediati per la sicurezza del camper',
          importance: 5, // MAX importance (sound + heads-up banner)
          visibility: 1, // VISIBILITY_PUBLIC
          sound: 'default',
          vibration: true,
          lights: true,
          lightColor: '#EF4444'
        });
      } catch (chErr) {
        console.warn('[WeatherPush] Channel creation notice:', chErr);
      }
    }

    // Create 32-bit positive integer ID from alertId string hash
    const numericId = (Math.abs(alertId.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)) % 100000) + 5000;

    await scheduleNotificationsSafely([
      {
        id: numericId,
        title: `⚠️ ${title}`,
        body: body,
        schedule: { at: new Date(Date.now() + 200), allowWhileIdle: true },
        sound: 'default',
        channelId: 'weather_alert_channel',
        extra: { type: 'weather_alert', alertId }
      }
    ]);

    console.log('[WeatherPush] Android weather alert push notification sent successfully for ID:', alertId);
    return true;
  } catch (err: any) {
    console.error('[WeatherPush] Error triggering weather alert push notification:', err);
    return false;
  }
}
