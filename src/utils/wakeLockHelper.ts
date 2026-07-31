/**
 * Utility to manage Screen Wake Lock (prevents device screen standby during active navigation).
 */

let wakeLockSentinel: any = null;
let fallbackVideoElement: HTMLVideoElement | null = null;
let isRequested = false;
let heartbeatInterval: any = null;

// Tiny 1x1 blank silent MP4 video data URI to keep screen awake on iOS Safari / WebViews where Screen Wake Lock API might fail or be restricted
const SILENT_VIDEO_DATA_URI =
  "data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28ybXA0MQAAAAhmcmVlAAAAAG1kYXQAAAAAMG1vb3YAAABsbXZoZAAAAADOH/2Azh/9gAAB1AAB1AABAAAAAAEAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAMAAGd0cmFjawAAABx0aGQAAAAADh/9gA4f/YAAAAABAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAMBtZGlhAAAAIG1kaGQAAAAADh/9gA4f/YAAAAABAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAGaaGRscgAAAAAAAAAAdmlkZQAAAAAAAAAAAAAAAFZpZGVvSGFuZGxlcgAAAAFhbWluZgAAABR2bWhkAAAAAQAAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAUZzdGJsAAAAaHN0c2QAAAAAAAAAAQAAAFhhdmMxAAAAAAABAAAAAQAAAAAAAAB4AEYA8AAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB//AAAAGGF2Y0MAcACo/2AAMAAyAAAAAwAQAAADACAAAAAYc3R0cwAAAAAAAAABAAAAAQAAA4QAAAAAc3RzYwAAAAAAAAABAAAAAQAAAAEAAAABAAAAAHN0c3oAAAAAAAAAEAAAAAEAAAA4AAAAAHN0Y28AAAAAAAAAAQAAACQ=";

async function requestWakeLockNative(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && (navigator as any).wakeLock) {
    try {
      if (wakeLockSentinel && !wakeLockSentinel.released) {
        return true;
      }
      wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      wakeLockSentinel.addEventListener('release', () => {
        wakeLockSentinel = null;
        if (isRequested) {
          // Immediately schedule re-acquisition
          setTimeout(() => {
            if (isRequested) requestWakeLockNative();
          }, 500);
        }
      });
      return true;
    } catch (err) {
      console.warn('[WakeLock] Native Screen Wake Lock request failed:', err);
    }
  }
  return false;
}

function startFallbackVideo() {
  if (typeof document === 'undefined') return;
  if (!fallbackVideoElement) {
    try {
      const video = document.createElement('video');
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.setAttribute('muted', '');
      video.setAttribute('loop', '');
      video.setAttribute('autoplay', '');
      video.style.position = 'fixed';
      video.style.top = '0';
      video.style.left = '0';
      video.style.width = '1px';
      video.style.height = '1px';
      video.style.opacity = '0.001';
      video.style.pointerEvents = 'none';
      video.style.zIndex = '-9999';
      video.src = SILENT_VIDEO_DATA_URI;
      video.muted = true;
      video.loop = true;

      // Event listeners to force replay if OS pauses video after long standby
      video.addEventListener('pause', () => {
        if (isRequested && fallbackVideoElement) {
          fallbackVideoElement.play().catch(() => {});
        }
      });
      video.addEventListener('ended', () => {
        if (isRequested && fallbackVideoElement) {
          fallbackVideoElement.currentTime = 0;
          fallbackVideoElement.play().catch(() => {});
        }
      });
      video.addEventListener('stalled', () => {
        if (isRequested && fallbackVideoElement) {
          fallbackVideoElement.play().catch(() => {});
        }
      });

      document.body.appendChild(video);
      fallbackVideoElement = video;

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((e) => {
          console.warn('[WakeLock] Fallback video play blocked:', e);
        });
      }
    } catch (err) {
      console.warn('[WakeLock] Fallback video creation error:', err);
    }
  } else if (fallbackVideoElement.paused) {
    fallbackVideoElement.play().catch(() => {});
  }
}

function stopFallbackVideo() {
  if (fallbackVideoElement) {
    try {
      fallbackVideoElement.pause();
      if (fallbackVideoElement.parentNode) {
        fallbackVideoElement.parentNode.removeChild(fallbackVideoElement);
      }
    } catch (e) {}
    fallbackVideoElement = null;
  }
}

let handleVisibilityChange: (() => void) | null = null;
let handleFocus: (() => void) | null = null;

function runHeartbeat() {
  if (!isRequested) return;
  
  // Re-acquire native wake lock if lost or released
  if (!wakeLockSentinel || wakeLockSentinel.released) {
    requestWakeLockNative();
  }

  // Ensure fallback video continues playing continuously
  if (fallbackVideoElement) {
    if (fallbackVideoElement.paused || fallbackVideoElement.ended) {
      fallbackVideoElement.currentTime = 0;
      fallbackVideoElement.play().catch(() => {});
    }
  } else {
    startFallbackVideo();
  }
}

export async function requestScreenWakeLock(): Promise<boolean> {
  isRequested = true;

  if (typeof document !== 'undefined' && !handleVisibilityChange) {
    handleVisibilityChange = async () => {
      if (isRequested && document.visibilityState === 'visible') {
        const success = await requestWakeLockNative();
        startFallbackVideo();
        if (!success) {
          startFallbackVideo();
        }
      }
    };
    handleFocus = async () => {
      if (isRequested) {
        await requestWakeLockNative();
        startFallbackVideo();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handleFocus);
  }

  // Start continuous 5-second keep-alive heartbeat while navigation is active
  if (!heartbeatInterval) {
    heartbeatInterval = setInterval(runHeartbeat, 5000);
  }

  const nativeSuccess = await requestWakeLockNative();
  startFallbackVideo();

  return nativeSuccess;
}

export async function releaseScreenWakeLock() {
  isRequested = false;

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  if (typeof document !== 'undefined') {
    if (handleVisibilityChange) {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      handleVisibilityChange = null;
    }
    if (handleFocus) {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handleFocus);
      handleFocus = null;
    }
  }

  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
    } catch (e) {}
    wakeLockSentinel = null;
  }

  stopFallbackVideo();
}

export function isWakeLockActive(): boolean {
  return isRequested && (wakeLockSentinel !== null || (fallbackVideoElement !== null && !fallbackVideoElement.paused));
}
