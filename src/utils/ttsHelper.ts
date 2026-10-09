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
      targetPitch = 1.18;
    } else {
      targetPitch = 1.18;
    }
  } else if (genderSetting === 'male') {
    selectedVoice = italianVoices.find(v => MALE_VOICE_REGEX.test(v.name)) || null;
    if (selectedVoice) {
      targetPitch = 0.98;
    } else if (italianVoices.length > 0) {
      selectedVoice = italianVoices[0];
      targetPitch = 0.78;
    } else {
      targetPitch = 0.78;
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

export function speakSampleTts(genderSetting: TtsGender, customText?: string) {
  if (typeof window === "undefined" || !('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    const sampleText = customText || (
      genderSetting === 'female'
        ? "Impostazione voce femminile attivata. Tra 100 metri, svolta a destra."
        : genderSetting === 'male'
          ? "Impostazione voce maschile attivata. Tra 100 metri, svolta a destra."
          : "Impostazione voce automatica di sistema attivata. Navigazione pronta."
    );

    const msg = new SpeechSynthesisUtterance(sampleText);
    msg.rate = 1.0;
    applyTtsVoiceAndPitch(msg, genderSetting);

    window.speechSynthesis.speak(msg);
  } catch (e) {
    console.warn("Error speaking sample TTS:", e);
  }
}
