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
    selectedVoice = italianVoices.find(v => FEMALE_VOICE_REGEX.test(v.name)) || null;
    if (selectedVoice) {
      targetPitch = 1.02;
    } else if (italianVoices.length > 0) {
      selectedVoice = italianVoices[0];
      targetPitch = 1.05;
    } else {
      targetPitch = 1.05;
    }
  } else if (genderSetting === 'male') {
    selectedVoice = italianVoices.find(v => MALE_VOICE_REGEX.test(v.name)) || null;
    if (selectedVoice) {
      targetPitch = 0.95;
    } else if (italianVoices.length > 0) {
      selectedVoice = italianVoices[0];
      targetPitch = 0.92;
    } else {
      targetPitch = 0.92;
    }
  } else {
    // Auto
    if (italianVoices.length > 0) {
      selectedVoice = italianVoices[0];
    }
    targetPitch = 1.0;
  }

  if (selectedVoice) {
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

let activeAudioFallback: HTMLAudioElement | null = null;

export function speakSampleTts(
  genderSetting: TtsGender,
  customText?: string,
  onStart?: () => void,
  onEnd?: () => void
) {
  if (typeof window === "undefined") return;

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
      const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=it&client=tw-ob&q=${encodeURIComponent(sampleText)}`;
      const audio = new Audio(audioUrl);
      activeAudioFallback = audio;
      audio.onended = () => {
        activeAudioFallback = null;
        setSpeakingState(false);
        onEnd?.();
      };
      audio.onerror = () => {
        activeAudioFallback = null;
        setSpeakingState(false);
        onEnd?.();
      };
      audio.play().catch(() => {
        activeAudioFallback = null;
        setSpeakingState(false);
        onEnd?.();
      });
    } catch (_) {
      setSpeakingState(false);
      onEnd?.();
    }
  };

  if ('speechSynthesis' in window) {
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      synth.resume();

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
        console.warn("Sample SpeechSynthesis error, trying audio fallback:", e);
        cleanup();
        playFallbackAudio();
      };

      // Safety timeout in case speech synth hangs
      setTimeout(() => {
        if (!finished && !synth.speaking) {
          cleanup();
          playFallbackAudio();
        }
      }, 4000);

      synth.speak(msg);
      return;
    } catch (e) {
      console.warn("Error using SpeechSynthesis, trying audio fallback:", e);
    }
  }

  playFallbackAudio();
}
