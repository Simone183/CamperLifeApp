import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PROMO_MESSAGES } from '../data/promoMessages';

export async function scheduleLocalPromoNotifications() {
  if (!Capacitor.isNativePlatform()) {
    console.log('[LocalPush] Skipping local notifications on web platform');
    return;
  }

  try {
    // Check permissions
    let permStatus = await LocalNotifications.checkPermissions();
    
    if (permStatus.display === 'prompt' || permStatus.display === 'prompt-with-rationale') {
      permStatus = await LocalNotifications.requestPermissions();
    }
    
    if (permStatus.display !== 'granted') {
      console.warn('[LocalPush] Permission denied for local notifications');
      return;
    }

    // Check if we already scheduled them
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      console.log('[LocalPush] Notifications already scheduled:', pending.notifications.length);
      return;
    }

    console.log('[LocalPush] Scheduling 50 promo notifications (one every 2 days)');

    const notifications = PROMO_MESSAGES.slice(0, 50).map((msg, index) => {
      // Schedule the first one starting 2 days from now, then +2 days for each subsequent
      const scheduleDate = new Date();
      scheduleDate.setDate(scheduleDate.getDate() + (index + 1) * 2);
      // Set to 14:00 (2 PM) roughly to ensure it arrives at a good time
      scheduleDate.setHours(14, 0, 0, 0);

      return {
        id: index + 100, // Unique ID starting at 100
        title: msg.title,
        body: msg.body,
        schedule: { at: scheduleDate },
        sound: 'default',
        smallIcon: 'ic_launcher_foreground', // Uses default app icon
        channelId: 'promo_channel' // We'll create this below
      };
    });

    if (Capacitor.getPlatform() === 'android') {
        await LocalNotifications.createChannel({
            id: 'promo_channel',
            name: 'Consigli ViaCamper',
            description: 'Suggerimenti e curiosità sull\'app ViaCamper',
            importance: 3, // Default importance
            visibility: 1
        });
    }

    await LocalNotifications.schedule({ notifications });
    console.log('[LocalPush] Scheduled successfully!');

  } catch (err) {
    console.error('[LocalPush] Failed to schedule notifications:', err);
  }
}
