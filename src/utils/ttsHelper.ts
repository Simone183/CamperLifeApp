export type TtsGender = 'auto' | 'female' | 'male';

const FEMALE_VOICE_REGEX = /alice|elsa|federica|sonia|monica|silvia|isabella|paola|giulia|chiara|female|femminile|woman|siri|zira|samantha/i;
const MALE_VOICE_REGEX = /cosimo|luca|diego|paolo|marco|matteo|giorgio|mario|roberto|stefano|male|maschile|man|guy|david|george/i;

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
  
  // Detect if running in native Android/Capacitor WebView (installed Play Store app)
  const isNativeApp = typeof window !== "undefined" && (
    Boolean((window as any).Capacitor) ||
    window.location.protocol.startsWith("file:") ||
    window.location.protocol.startsWith("capacitor:") ||
    window.location.protocol.startsWith("ionic:") ||
    !window.location.hostname.includes("run.app")
  );

  // On native mobile APKs, do not override msg.voice so Android OS uses its native Google Speech Engine directly!
  if (isNativeApp) {
    msg.pitch = genderSetting === 'female' ? 1.08 : genderSetting === 'male' ? 0.92 : 1.0;
    return;
  }

  let voices: SpeechSynthesisVoice[] = [];
  try {
    voices = window.speechSynthesis.getVoices() || [];
  } catch (_) {}

  const italianVoices = voices.filter(
    v => v.lang && (v.lang.startsWith('it') || v.lang.includes('IT') || v.lang.includes('it'))
  );

  let selectedVoice: SpeechSynthesisVoice | null = null;
  let targetPitch = 1.0;

  if (genderSetting === 'female') {
    selectedVoice = italianVoices.find(v => FEMALE_VOICE_REGEX.test(v.name) && v.localService) || italianVoices.find(v => FEMALE_VOICE_REGEX.test(v.name)) || null;
    targetPitch = 1.05;
  } else if (genderSetting === 'male') {
    selectedVoice = italianVoices.find(v => MALE_VOICE_REGEX.test(v.name) && v.localService) || italianVoices.find(v => MALE_VOICE_REGEX.test(v.name)) || null;
    targetPitch = 0.95;
  } else {
    selectedVoice = null;
    targetPitch = 1.0;
  }

  if (selectedVoice && selectedVoice.localService !== false) {
    try {
      msg.voice = selectedVoice;
    } catch (_) {}
  }
  msg.pitch = targetPitch;
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

let activeAudioFallback: HTMLAudioElement | null = null;

export function speakSampleTts(
  genderSetting: TtsGender,
  customText?: string,
  onStart?: () => void,
  onEnd?: () => void
) {
  if (typeof window === "undefined") return;

  unlockGlobalMobileAudio();

  const sampleText = customText || (
    genderSetting === 'female'
      ? "Impostazione voce femminile attivata. Tra 100 metri, svolta a destra."
      : genderSetting === 'male'
        ? "Impostazione voce maschile attivata. Tra 100 metri, svolta a destra."
        : "Impostazione voce automatica di sistema attivata. Navigazione pronta."
  );

  // Stop any active audio fallback
  if (activeAudioFallback) {
    try {
      activeAudioFallback.pause();
      activeAudioFallback = null;
    } catch (_) {}
  }

  setSpeakingState(true);
  onStart?.();

  const playFallbackAudio = () => {
    try {
      const voiceName = genderSetting === 'female' ? 'Bianca' : 'Giorgio';
      const primaryUrl = `https://api.streamelements.com/kappa/v2/speech?voice=${voiceName}&text=${encodeURIComponent(sampleText)}`;
      const secondaryUrl = `https://code.responsivevoice.org/getvoice.php?tl=it&sv=g1&vn=&pitch=0.5&rate=0.5&vol=1&key=free&text=${encodeURIComponent(sampleText)}`;
      
      const audio = new Audio();
      activeAudioFallback = audio;
      
      let called = false;
      const safeDone = () => {
        if (called) return;
        called = true;
        activeAudioFallback = null;
        setSpeakingState(false);
        onEnd?.();
      };

      audio.onended = safeDone;

      let triedSecondary = false;
      const tryPlay = (url: string) => {
        audio.src = url;
        const promise = audio.play();
        if (promise !== undefined) {
          promise.catch(() => {
            if (!triedSecondary) {
              triedSecondary = true;
              tryPlay(secondaryUrl);
            } else {
              safeDone();
            }
          });
        }
      };

      audio.onerror = () => {
        if (!triedSecondary) {
          triedSecondary = true;
          tryPlay(secondaryUrl);
        } else {
          safeDone();
        }
      };

      tryPlay(primaryUrl);
    } catch (_) {
      setSpeakingState(false);
      onEnd?.();
    }
  };

  if ('speechSynthesis' in window) {
    try {
      const synth = window.speechSynthesis;
      if (synth.paused) {
        try { synth.resume(); } catch (_) {}
      }

      const msg = new SpeechSynthesisUtterance(sampleText);
      msg.rate = 1.0;
      msg.lang = 'it-IT';
      applyTtsVoiceAndPitch(msg, genderSetting);

      (window as any)._ttsAnchors = (window as any)._ttsAnchors || [];
      (window as any)._ttsAnchors.push(msg);
      if ((window as any)._ttsAnchors.length > 10) {
        (window as any)._ttsAnchors.shift();
      }

      let finished = false;
      const cleanup = () => {
        if (finished) return;
        finished = true;
        setSpeakingState(false);
        onEnd?.();
      };

      msg.onstart = () => {
        setSpeakingState(true);
      };

      msg.onend = cleanup;
      msg.onerror = (e) => {
        console.warn("Sample SpeechSynthesis error, retrying native default voice:", e);
        try {
          const fallbackMsg = new SpeechSynthesisUtterance(sampleText);
          fallbackMsg.lang = 'it-IT';
          fallbackMsg.rate = 1.0;
          fallbackMsg.onend = cleanup;
          fallbackMsg.onerror = () => {
            cleanup();
            playFallbackAudio();
          };
          synth.cancel();
          synth.resume();
          synth.speak(fallbackMsg);
        } catch (_) {
          cleanup();
          playFallbackAudio();
        }
      };

      // Safety timeout in case speech synth hangs
      setTimeout(() => {
        if (!finished && !synth.speaking) {
          cleanup();
        }
      }, 5000);

      synth.speak(msg);
      return;
    } catch (e) {
      console.warn("Error using SpeechSynthesis, trying audio fallback:", e);
    }
  }

  playFallbackAudio();
}
