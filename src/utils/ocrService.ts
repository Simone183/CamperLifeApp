import { db } from "../lib/firebase";
import { doc, setDoc, onSnapshot, deleteDoc } from "firebase/firestore";
import { compressImage } from "./photoCompressor";
import { cleanTravelStoryText } from "./cleanStoryText";
import { resolveApiUrl } from "./resolveMediaUrl";

export type OcrProgressCallback = (statusText: string) => void;

/**
 * High-accuracy OCR extraction service powered by Google Gemini AI Vision.
 * 1. Direct Server API call via resolveApiUrl (Works on Web, PWA, and Mobile Native APK)
 * 2. Realtime Firebase Firestore AI Task Bridge (Fallback if direct API is blocked)
 */
export async function extractStoryFromImage(
  imageDataUrl: string,
  mimeType: string = "image/jpeg",
  mode: "literal" | "elaborate" = "elaborate",
  onProgress?: OcrProgressCallback
): Promise<string> {
  if (!imageDataUrl) {
    throw new Error("Nessuna immagine fornita per la scansione OCR.");
  }

  onProgress?.("Ottimizzazione e nitidezza dell'immagine...");

  // Optimize resolution for high-detail handwriting OCR (1600px - 1920px)
  let optimizedImage = imageDataUrl;
  try {
    optimizedImage = await compressImage(imageDataUrl, "high");
  } catch (compErr) {
    console.warn("[OCR Service] Compressione pre-OCR non riuscita, uso anteprima originale:", compErr);
  }

  // --- STRATEGY 1: Direct Server API Call (Preferred for all platforms via resolveApiUrl) ---
  try {
    onProgress?.(
      mode === "literal"
        ? "Trascrizione letterale con IA Gemini..."
        : "Elaborazione racconto di viaggio con IA Gemini..."
    );
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const apiUrl = resolveApiUrl("/api/extract-story-ocr");
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: optimizedImage, mimeType, mode }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.text && data.text.trim()) {
        console.log("[OCR Service] Strategy 1 (Direct API) succeeded!");
        return cleanTravelStoryText(data.text);
      }
      if (data.error) {
        console.warn("[OCR Service] Direct API error response:", data.error);
      }
    } else {
      console.warn(`[OCR Service] Direct API HTTP ${res.status}`);
    }
  } catch (httpErr: any) {
    console.warn("[OCR Service] Direct HTTP attempt failed or timed out, trying Firestore Task Bridge:", httpErr?.message);
  }

  // --- STRATEGY 2: Firebase Firestore AI Task Bridge ---
  if (db) {
    try {
      onProgress?.("Connessione con l'IA di ViaCamper via Firestore...");
      const taskId = `ocr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const taskRef = doc(db, "ai_ocr_tasks", taskId);

      // Create pending task for server loop
      await setDoc(taskRef, {
        taskId,
        image: optimizedImage,
        mimeType: mimeType || "image/jpeg",
        mode: mode || "elaborate",
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
          reject(new Error("Timeout attesa risposta IA (30s)"));
        }, 30000);

        const unsubscribe = onSnapshot(taskRef, async (snap) => {
          if (!snap.exists()) return;
          const data = snap.data();
          if (data?.status === "completed") {
            clearTimeout(timeout);
            unsubscribe();
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
        console.log("[OCR Service] Strategy 2 (Firestore Bridge) succeeded!");
        return cleanTravelStoryText(textFromFirestore);
      }
    } catch (fbErr: any) {
      console.warn("[OCR Service] Firestore AI Task Bridge error:", fbErr?.message);
    }
  }

  // If both AI strategies failed, report a clear error rather than outputting Tesseract gibberish
  throw new Error(
    "Impossibile collegarsi all'intelligenza artificiale Gemini per la decodifica del foglio. Assicurati che la connessione Internet sia attiva e riprova."
  );
}

export interface OcrPageInput {
  dataUrl: string;
  mimeType?: string;
}

/**
 * Multi-page OCR extraction service for multi-page documents, notes, and diary sheets.
 */
export async function extractStoryFromMultipleImages(
  pages: OcrPageInput[],
  mode: "literal" | "elaborate" = "elaborate",
  onProgress?: (statusText: string, currentPage: number, totalPages: number) => void
): Promise<string> {
  if (!pages || pages.length === 0) {
    throw new Error("Nessuna immagine fornita per la scansione OCR.");
  }

  if (pages.length === 1) {
    return extractStoryFromImage(
      pages[0].dataUrl,
      pages[0].mimeType || "image/jpeg",
      mode,
      (status) => onProgress?.(status, 1, 1)
    );
  }

  // --- STRATEGY 1: Direct Server API Call with multi-image payload ---
  try {
    onProgress?.(
      `Elaborazione di ${pages.length} pagine con IA Gemini...`,
      1,
      pages.length
    );
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const apiUrl = resolveApiUrl("/api/extract-story-ocr");
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        images: pages.map((p) => p.dataUrl),
        mimeType: pages[0]?.mimeType || "image/jpeg",
        mode,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.text && data.text.trim()) {
        console.log("[OCR Service] Multi-page Direct API succeeded!");
        return cleanTravelStoryText(data.text);
      }
    }
  } catch (err: any) {
    console.warn("[OCR Service] Multi-page direct API call failed, falling back to page-by-page processing:", err?.message);
  }

  // --- FALLBACK: Sequential page-by-page extraction ---
  const results: string[] = [];
  for (let i = 0; i < pages.length; i++) {
    const pageNum = i + 1;
    onProgress?.(`Scansione Pagina ${pageNum} di ${pages.length}...`, pageNum, pages.length);

    const pageText = await extractStoryFromImage(
      pages[i].dataUrl,
      pages[i].mimeType || "image/jpeg",
      mode,
      (status) => onProgress?.(`[Pagina ${pageNum}/${pages.length}] ${status}`, pageNum, pages.length)
    );

    if (pageText && pageText.trim()) {
      results.push(pageText.trim());
    }
  }

  if (results.length === 0) {
    throw new Error("Nessun testo rilevato nelle pagine caricate.");
  }

  if (mode === "literal") {
    return results.map((res, idx) => `--- Pagina ${idx + 1} ---\n${res}`).join("\n\n");
  }

  return cleanTravelStoryText(results.join("\n\n"));
}
