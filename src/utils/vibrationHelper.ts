export function vibrate(duration: number = 50) {
  try {
    const saved = localStorage.getItem("camper_app_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.vibrations === false) return;
    }
    
    if (navigator.vibrate) {
      navigator.vibrate(duration);
    }
  } catch (e) {
    console.warn("Vibration not supported:", e);
  }
}
