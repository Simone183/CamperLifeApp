import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { resolveApiUrl } from './resolveMediaUrl';

export type TtsGender = 'auto' | 'female' | 'male';

const FEMALE_VOICE_REGEX = /it-it-x-kda|it-it-x-ita|it-it-x-itb|kda-local|kda-network|ita-local|ita-network|itb-local|itb-network|\bkda\b|\bita\b|\bitb\b|iof|alice|elsa|federica|sonia|monica|silvia|isabella|paola|giulia|chiara|fabiola|imelda|irma|palmira|pierina|female|femminile|donna|woman|siri|zira|samantha/i;
const MALE_VOICE_REGEX = /it-it-x-itd|it-it-x-itc|itd-local|itd-network|itc-local|itc-network|\bitd\b|\bitc\b|iom|cosimo|luca|diego|paolo|marco|matteo|giorgio|giuseppe|mario|roberto|stefano|rinaldo|lisandro|calimero|benigno|male|maschile|uomo|\bman\b|guy|david|george/i;

export function isNativeMobileApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if ((window as any).AndroidNativeTTS) return true;
    if (Capacitor && typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform()) {
      return true;
    }
  } catch (_) {}

  const cap = (window as any).Capacitor;
  if (cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) return true;
  if (cap && cap.platform && cap.platform !== 'web') return true;

  const ua = typeof navigator !== "undefined" ? (navigator.userAgent || "") : "";
  if (/;\s*wv\)/i.test(ua) || /Capacitor/i.test(ua)) return true;

  const proto = window.location.protocol || "";
  if (proto.startsWith("capacitor") || proto.startsWith("ionic") || proto.startsWith("file")) {
    return true;
  }

  const host = window.location.hostname || "";
  const port = window.location.port || "";
  if ((host === "localhost" || host === "127.0.0.1") && port !== "3000" && port !== "5173") {
    return true;
  }

  return false;
}

if (typeof window !== "undefined" && 'speechSynthesis' in window) {
  try {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      try { window.speechSynthesis.getVoices(); } catch (_) {}
    };
  } catch (_) {}
}

export function applyTtsVoiceAndPitch(
  msg: SpeechSynthesisUtterance,
  genderSetting: TtsGender = 'auto'
): void {
  if (typeof window === "undefined" || !('speechSynthesis' in window)) return;

  msg.lang = 'it-IT';
  msg.rate = 1.0;

  let voices: SpeechSynthesisVoice[] = [];
  try {
    voices = window.speechSynthesis.getVoices() || [];
  } catch (_) {}

  const italianVoices = voices.filter(
    v => v && v.lang && (v.lang.toLowerCase().startsWith('it') || v.lang.toLowerCase().includes('it-it') || v.lang.toLowerCase().includes('it_it'))
  );

  if (genderSetting === 'female') {
    const femVoice =
      italianVoices.find(v => FEMALE_VOICE_REGEX.test(`${v.name} ${v.voiceURI}`) && v.localService) ||
      italianVoices.find(v => FEMALE_VOICE_REGEX.test(`${v.name} ${v.voiceURI}`)) ||
      italianVoices[0] ||
      null;
    if (femVoice) {
      try { msg.voice = femVoice; } catch (_) {}
    }
    msg.pitch = 1.05;
  } else if (genderSetting === 'male') {
    const maleVoice =
      italianVoices.find(v => MALE_VOICE_REGEX.test(`${v.name} ${v.voiceURI}`) && v.localService) ||
      italianVoices.find(v => MALE_VOICE_REGEX.test(`${v.name} ${v.voiceURI}`)) ||
      null;
    if (maleVoice) {
      try { msg.voice = maleVoice; } catch (_) {}
      msg.pitch = 1.0;
    } else {
      msg.pitch = 0.85;
    }
  } else {
    msg.pitch = 1.0;
  }
}

let isSpeakingState = false;

export function getIsTtsSpeaking(): boolean {
  return isSpeakingState;
}

function setSpeakingState(speaking: boolean) {
  isSpeakingState = speaking;
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent('tts-state-changed', { detail: { isSpeaking: speaking } })
    );
  }
}

let globalAudioCtx: AudioContext | null = null;
let globalSilentAudio: HTMLAudioElement | null = null;

export function unlockGlobalMobileAudio() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      if (!globalAudioCtx) {
        try { globalAudioCtx = new AudioCtx(); } catch (_) {}
      }
      if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
        try { globalAudioCtx.resume(); } catch (_) {}
      }
      if (globalAudioCtx) {
        try {
          const osc = globalAudioCtx.createOscillator();
          const gain = globalAudioCtx.createGain();
          gain.gain.value = 0.0001;
          osc.connect(gain);
          gain.connect(globalAudioCtx.destination);
          osc.start(0);
          osc.stop(globalAudioCtx.currentTime + 0.05);
        } catch (_) {}
      }
    }

    if (!globalSilentAudio) {
      try {
        globalSilentAudio = new Audio(
          "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=="
        );
        globalSilentAudio.loop = true;
        globalSilentAudio.volume = 0.01;
      } catch (_) {}
    }
    if (globalSilentAudio) {
      globalSilentAudio.play().catch(() => {});
    }

    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.getVoices();
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch (_) {}
    }
  } catch (_) {}
}

let sharedAudioCtx: AudioContext | null = null;

export function getSharedAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (_) {
    return null;
  }
}

function decodeAudioBufferPromise(ctx: AudioContext, arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    try {
      let isResolved = false;
      const resFn = (buf: AudioBuffer) => {
        if (!isResolved) {
          isResolved = true;
          resolve(buf);
        }
      };
      const rejFn = (err: any) => {
        if (!isResolved) {
          isResolved = true;
          reject(err);
        }
      };

      const result = ctx.decodeAudioData(arrayBuffer, resFn, rejFn);
      if (result && typeof (result as any).then === 'function') {
        (result as any).then(resFn).catch(rejFn);
      }
    } catch (e) {
      reject(e);
    }
  });
}

export function playOfflineChime(): void {
  // Intentionally no-op for voice fallback to avoid metallic tones when user tests or uses voice navigation
}

export function playTextToSpeechWebAudio(
  text: string,
  genderSetting: TtsGender = 'auto',
  onStart?: () => void,
  onEnd?: () => void
): () => void {
  if (typeof window === "undefined" || !text || !text.trim()) {
    onEnd?.();
    return () => {};
  }

  const cleanText = text.trim();
  let isCancelled = false;
  let activeSource: AudioBufferSourceNode | null = null;
  let activeHtmlAudio: HTMLAudioElement | null = null;
  let safetyTimer: any = null;
  let startWatchdog: any = null;
  let nativeDoneListener: (() => void) | null = null;

  const cleanupListeners = () => {
    if (safetyTimer) {
      clearTimeout(safetyTimer);
      safetyTimer = null;
    }
    if (startWatchdog) {
      clearTimeout(startWatchdog);
      startWatchdog = null;
    }
    if (nativeDoneListener && typeof window !== "undefined") {
      window.removeEventListener('android-native-tts-done', nativeDoneListener);
      nativeDoneListener = null;
    }
  };

  const finish = () => {
    if (isCancelled) return;
    isCancelled = true;
    cleanupListeners();
    onEnd?.();
  };

  const cancelFn = () => {
    if (isCancelled) return;
    isCancelled = true;
    cleanupListeners();
    try {
      if ((window as any).AndroidNativeTTS && typeof (window as any).AndroidNativeTTS.stop === 'function') {
        (window as any).AndroidNativeTTS.stop();
      }
    } catch (_) {}
    try {
      if (isNativeMobileApp()) {
        TextToSpeech.stop().catch(() => {});
      }
    } catch (_) {}
    if (activeSource) {
      try { activeSource.stop(); } catch (_) {}
      activeSource = null;
    }
    if (activeHtmlAudio) {
      try {
        activeHtmlAudio.onended = null;
        activeHtmlAudio.onerror = null;
        activeHtmlAudio.pause();
      } catch (_) {}
      activeHtmlAudio = null;
    }
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch (_) {}
    onEnd?.();
  };

  const maxDurationMs = Math.min(14000, Math.max(4000, cleanText.length * 140));

  // Offline / Local Device SpeechSynthesis Fallback (or primary for 'female' since Android's local voice is 225 Hz female)
  const playViaLocalDeviceTts = () => {
    if (isCancelled) { finish(); return; }

    // 1. Try AndroidNativeTTS bridge if in native APK
    try {
      const androidBridge = (window as any).AndroidNativeTTS;
      if (androidBridge && typeof androidBridge.isReady === 'function' && androidBridge.isReady()) {
        nativeDoneListener = () => finish();
        window.addEventListener('android-native-tts-done', nativeDoneListener, { once: true });
        safetyTimer = setTimeout(() => finish(), maxDurationMs);
        let started = false;
        if (typeof androidBridge.speakWithGender === 'function') {
          started = androidBridge.speakWithGender(cleanText, genderSetting, 1.0, 1.0, true);
        } else {
          const bridgePitch = genderSetting === 'female' ? 1.05 : genderSetting === 'male' ? 0.90 : 1.0;
          started = androidBridge.speak(cleanText, bridgePitch, 1.0, true);
        }
        if (started) {
          onStart?.();
          return;
        } else {
          cleanupListeners();
        }
      }
    } catch (_) {
      cleanupListeners();
    }

    // 2. Try Capacitor Community TextToSpeech if in native APK
    if (isNativeMobileApp()) {
      try {
        safetyTimer = setTimeout(() => finish(), maxDurationMs);
        let didStart = false;
        const startTimer = setTimeout(() => {
          if (!isCancelled) {
            didStart = true;
            onStart?.();
          }
        }, 60);

        TextToSpeech.speak({
          text: cleanText,
          lang: 'it-IT',
          rate: 1.0,
          pitch: genderSetting === 'female' ? 1.05 : 1.0,
          volume: 1.0,
          category: 'playback',
        })
          .then(() => {
            clearTimeout(startTimer);
            if (!didStart && !isCancelled) onStart?.();
            finish();
          })
          .catch(() => {
            clearTimeout(startTimer);
            finish();
          });
        return;
      } catch (_) {
        cleanupListeners();
      }
    }

    // 3. Browser SpeechSynthesis
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(cleanText);
        applyTtsVoiceAndPitch(msg, genderSetting);
        (window as any)._activeSampleUtterance = msg;
        safetyTimer = setTimeout(() => finish(), maxDurationMs);
        msg.onstart = () => {
          if (!isCancelled) onStart?.();
        };
        msg.onend = () => {
          (window as any)._activeSampleUtterance = null;
          finish();
        };
        msg.onerror = () => {
          (window as any)._activeSampleUtterance = null;
          finish();
        };
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(msg);
        return;
      } catch (_) {}
    }

    finish();
  };

  // HTML5 <audio referrerpolicy="no-referrer"> for Google Translate TTS stream (126 Hz Natural Italian Male Voice)
  const playViaHtmlAudioElement = (proxyUrl: string) => {
    if (isCancelled) { finish(); return; }
    try {
      const directTranslateUrl = `https://translate.google.com/translate_tts?client=tw-ob&tl=it&q=${encodeURIComponent(cleanText.slice(0, 190))}`;
      const audio = new Audio();
      activeHtmlAudio = audio;
      try {
        audio.setAttribute('referrerpolicy', 'no-referrer');
        (audio as any).referrerPolicy = 'no-referrer';
      } catch (_) {}
      audio.preload = 'auto';
      audio.volume = 1.0;

      safetyTimer = setTimeout(() => finish(), maxDurationMs);

      let triedDirectTranslate = false;

      audio.onplay = () => {
        if (!isCancelled) onStart?.();
      };

      audio.onended = () => {
        activeHtmlAudio = null;
        finish();
      };

      audio.onerror = () => {
        if (isCancelled) return;
        if (!triedDirectTranslate) {
          triedDirectTranslate = true;
          try {
            audio.setAttribute('referrerpolicy', 'no-referrer');
            (audio as any).referrerPolicy = 'no-referrer';
            audio.src = directTranslateUrl;
            const playPromise = audio.play();
            if (playPromise && typeof playPromise.catch === 'function') {
              playPromise.catch(() => {
                activeHtmlAudio = null;
                playViaLocalDeviceTts();
              });
            }
          } catch (_) {
            activeHtmlAudio = null;
            playViaLocalDeviceTts();
          }
        } else {
          activeHtmlAudio = null;
          playViaLocalDeviceTts();
        }
      };

      audio.src = proxyUrl;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          if (isCancelled) return;
          if (!triedDirectTranslate) {
            triedDirectTranslate = true;
            try {
              audio.setAttribute('referrerpolicy', 'no-referrer');
              (audio as any).referrerPolicy = 'no-referrer';
              audio.src = directTranslateUrl;
              audio.play().catch(() => {
                activeHtmlAudio = null;
                playViaLocalDeviceTts();
              });
            } catch (_) {
              activeHtmlAudio = null;
              playViaLocalDeviceTts();
            }
          } else {
            activeHtmlAudio = null;
            playViaLocalDeviceTts();
          }
        });
      }
    } catch (_) {
      playViaLocalDeviceTts();
    }
  };

  // Google Translate TTS via Server /api/tts + WebAudio API:
  // Google Translate's Italian voice (`tl=it`) is the exact 126 Hz Natural Male Voice heard in the reference video!
  // We play it at natural pitch (detune = 0) for both 'male' (Voce Uomo) and 'auto' (Google Auto).
  const playViaGoogleMaleNeuralStream = () => {
    if (isCancelled) { finish(); return; }
    const proxyUrl = resolveApiUrl(`/api/tts?text=${encodeURIComponent(cleanText)}&gender=${genderSetting}`);
    const ctx = getSharedAudioContext();

    if (!ctx) {
      playViaHtmlAudioElement(proxyUrl);
      return;
    }

    fetch(proxyUrl)
      .then(res => {
        if (!res.ok) throw new Error("HTTP status " + res.status);
        const ct = (res.headers.get("content-type") || "").toLowerCase();
        if (ct.includes("text/html")) {
          throw new Error("Received HTML instead of audio");
        }
        return res.arrayBuffer();
      })
      .then(arrayBuffer => {
        if (isCancelled) return null;
        if (!arrayBuffer || arrayBuffer.byteLength < 100) {
          throw new Error("Audio buffer too small");
        }
        return decodeAudioBufferPromise(ctx, arrayBuffer);
      })
      .then(decodedBuffer => {
        if (isCancelled) { finish(); return; }
        if (!decodedBuffer) throw new Error("Empty decoded buffer");
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        const source = ctx.createBufferSource();
        source.buffer = decodedBuffer;
        // Natural pitch (0 detune) for 'male' and 'auto' matches the 126 Hz Google Male voice from the reference video!
        try {
          if (source.detune) {
            source.detune.value = genderSetting === 'female' ? 220 : 0;
          }
        } catch (_) {}
        source.connect(ctx.destination);
        activeSource = source;
        safetyTimer = setTimeout(() => finish(), maxDurationMs);
        source.onended = () => {
          activeSource = null;
          finish();
        };
        onStart?.();
        source.start(0);
      })
      .catch(() => {
        if (!isCancelled) {
          playViaHtmlAudioElement(proxyUrl);
        }
      });
  };

  // Routing by selected voice:
  // - 'male' (Voce Uomo) and 'auto' (Google Auto): use the 126 Hz Google Male Neural stream (/api/tts -> translate_tts at detune 0),
  //   which is the exact voice in the reference video!
  // - 'female' (Voce Donna): use the device's 225 Hz Female voice (SpeechSynthesis / AndroidNativeTTS), falling back to stream if needed.
  if (genderSetting === 'female') {
    playViaLocalDeviceTts();
  } else {
    playViaGoogleMaleNeuralStream();
  }

  return cancelFn;
}

let activeSampleCancelFn: (() => void) | null = null;

export function speakSampleTts(
  genderSetting: TtsGender,
  customText?: string,
  onStart?: () => void,
  onEnd?: () => void
) {
  if (typeof window === "undefined") return;

  unlockGlobalMobileAudio();

  if (activeSampleCancelFn) {
    try { activeSampleCancelFn(); } catch (_) {}
    activeSampleCancelFn = null;
  }

  const sampleText =
    customText ||
    "Navigatore Camper pronto. Percorso verificato per l'altezza e la larghezza del tuo mezzo.";

  setSpeakingState(true);

  activeSampleCancelFn = playTextToSpeechWebAudio(
    sampleText,
    genderSetting,
    () => {
      onStart?.();
    },
    () => {
      activeSampleCancelFn = null;
      setSpeakingState(false);
      onEnd?.();
    }
  );
}
