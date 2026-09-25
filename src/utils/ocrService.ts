import { db } from "../lib/firebase";
import { doc, setDoc, onSnapshot, deleteDoc } from "firebase/firestore";
import { compressImage } from "./photoCompressor";
import { cleanTravelStoryText } from "./cleanStoryText";

export type OcrProgressCallback = (statusText: string) => void;

/**
 * Robust OCR extraction service with 3-tier redundancy:
 * 1. Direct server HTTP endpoint (fast for Web & local dev)
 * 2. Realtime Firebase Firestore AI Task Bridge (bypasses Cloud Run IAP / cookie check for native mobile APK)
 * 3. On-device local OCR via Tesseract.js (works offline without internet or server)
 */
export async function extractStoryFromImage(
  imageDataUrl: string,
  mimeType: string = "image/jpeg",
  onProgress?: OcrProgressCallback
): Promise<string> {
  if (!imageDataUrl) {
    throw new Error("Nessuna immagine fornita per la scansione OCR.");
  }

  onProgress?.("Ottimizzazione dell'immagine in corso...");

  // 1. Optimize image resolution & size (1280px, ~150-250KB) to ensure super fast upload and fit Firestore 1MB limits
  let optimizedImage = imageDataUrl;
  try {
    optimizedImage = await compressImage(imageDataUrl, "medium");
  } catch (compErr) {
    console.warn("[OCR Service] Compressione pre-OCR non riuscita, uso anteprima:", compErr);
  }

  // Detect if running in native mobile (Capacitor APK)
  const isMobileNative =
    typeof (window as any).Capacitor !== "undefined" ||
    window.location.protocol.startsWith("capacitor") ||
    window.location.protocol.startsWith("file:") ||
    (typeof window !== "undefined" &&
      window.location.hostname === "localhost" &&
      window.location.port !== "3000" &&
      window.location.port !== "5173");

  // --- STRATEGY 1: Direct HTTP call (ideal when running on Web / Dev server) ---
  if (!isMobileNative) {
    try {
      onProgress?.("Analisi con Intelligenza Artificiale...");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch("/api/extract-story-ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: optimizedImage, mimeType }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.text && data.text.trim()) {
          return cleanTravelStoryText(data.text);
        }
      }
    } catch (httpErr: any) {
      console.warn("[OCR Service] Direct HTTP attempt failed or bypassed, trying Firestore bridge:", httpErr?.message);
    }
  }

  // --- STRATEGY 2: Firebase Firestore AI Task Bridge (Directly reaches server without CORS / cookie issues) ---
  if (db) {
    try {
      onProgress?.("Connessione con l'IA di ViaCamper...");
      const taskId = `ocr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const taskRef = doc(db, "ai_ocr_tasks", taskId);

      // Create pending task
      await setDoc(taskRef, {
        taskId,
        image: optimizedImage,
        mimeType: mimeType || "image/jpeg",
        status: "pending",
        createdAt: Date.now(),
      });

      onProgress?.("Trascrizione del racconto in corso...");

      // Wait for server to process via Firestore listener
      const textFromFirestore = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(async () => {
          unsubscribe();
          try {
            await deleteDoc(taskRef);
          } catch {}
          reject(new Error("Timeout attesa risposta IA (15s)"));
        }, 15000);

        const unsubscribe = onSnapshot(taskRef, async (snap) => {
          if (!snap.exists()) return;
          const data = snap.data();
          if (data?.status === "completed") {
            clearTimeout(timeout);
            unsubscribe();
            // Clean up temporary document
            try {
              await deleteDoc(taskRef);
            } catch {}
            resolve(cleanTravelStoryText(data.text || ""));
          } else if (data?.status === "error") {
            clearTimeout(timeout);
            unsubscribe();
            try {
              await deleteDoc(taskRef);
            } catch {}
            reject(new Error(data.error || "Errore elaborazione server"));
          }
        }, (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      if (textFromFirestore && textFromFirestore.trim()) {
        return cleanTravelStoryText(textFromFirestore);
      }
    } catch (fbErr: any) {
      console.warn("[OCR Service] Firestore AI Task Bridge error, falling back to local OCR engine:", fbErr?.message);
    }
  }

  // --- STRATEGY 3: On-Device Local OCR (Tesseract.js) ---
  // Works 100% on the device even offline without internet
  try {
    onProgress?.("Lettura con motore OCR locale sul dispositivo...");
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("ita");
    
    onProgress?.("Riconoscimento del testo e della grafia...");
    const ret = await worker.recognize(optimizedImage);
    await worker.terminate();

    const localText = ret?.data?.text?.trim() || "";
    if (localText) {
      return cleanTravelStoryText(localText);
    }
    throw new Error("Nessun testo leggibile trovato nell'immagine.");
  } catch (localErr: any) {
    console.error("[OCR Service] All OCR strategies failed:", localErr);
    throw new Error(
      "Impossibile leggere il testo dall'immagine. Assicurati che il foglio sia ben illuminato e il testo a fuoco, oppure inseriscilo manualmente."
    );
  }
}
