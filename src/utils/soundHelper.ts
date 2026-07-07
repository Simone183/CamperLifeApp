import { vibrate } from './vibrationHelper';

let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playTapSound() {
  vibrate(30);
  try {
    const saved = localStorage.getItem("camper_app_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.sounds === false) return; // Sounds disabled
    }
    
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    console.warn("Web Audio API not supported or user interaction required:", e);
  }
}

export function playAlertSound() {
  try {
    const saved = localStorage.getItem("camper_app_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.sounds === false) return; // Sounds disabled
    }
    
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Double beep
    [0, 0.15].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(880, now + delay);
      
      gain.gain.setValueAtTime(0.1, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.12);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + delay);
      osc.stop(now + delay + 0.12);
    });
  } catch (e) {
    console.warn("Web Audio API error:", e);
  }
}
