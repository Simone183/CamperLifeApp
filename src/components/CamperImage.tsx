import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { resolveMediaUrl } from "../utils/resolveMediaUrl";
import { getPhotoFromIndexedDB, savePhotoToIndexedDB } from "../utils/photoStorage";
import { Camera, RefreshCw } from "lucide-react";

// In-memory cache to avoid refetching the same photo multiple times during the session
const base64Cache = new Map<string, string>();

export function useResolvedPhotoUrl(url?: string, photoId?: string): string {
  const [resolvedUrl, setResolvedUrl] = useState<string>("");

  useEffect(() => {
    if (!url && !photoId) {
      setResolvedUrl("");
      return;
    }

    // Direct local Data URLs or Blob URLs work immediately
    if (url && (url.startsWith("data:") || url.startsWith("blob:"))) {
      setResolvedUrl(url);
      if (photoId) {
        savePhotoToIndexedDB(photoId, url).catch(() => {});
      }
      return;
    }

    let active = true;

    const resolve = async () => {
      // Derive effective photo ID from props or URL
      const effectivePhotoId = photoId || (() => {
        if (url?.startsWith("/api/photos/")) return url.replace("/api/photos/", "");
        const match = url?.match(/trip_photo_(\d+)_/);
        if (match) return `photo_${match[1]}`;
        return undefined;
      })();

      // 1. Check in-memory session cache
      if (effectivePhotoId && base64Cache.has(effectivePhotoId)) {
        if (active) setResolvedUrl(base64Cache.get(effectivePhotoId)!);
        return;
      }

      // 2. Check local persistent IndexedDB vault
      if (effectivePhotoId) {
        try {
          const idbData = await getPhotoFromIndexedDB(effectivePhotoId);
          if (idbData && active) {
            base64Cache.set(effectivePhotoId, idbData);
            setResolvedUrl(idbData);
            return;
          }
        } catch (e) {
          console.warn("[CamperImage] IndexedDB lookup error:", e);
        }
      }

      // 3. Check permanent /api/photos/ endpoint
      if (effectivePhotoId) {
        try {
          const resp = await fetch(`/api/photos/${effectivePhotoId}`);
          if (resp.ok) {
            const contentType = resp.headers.get("content-type") || "";
            if (contentType.includes("image/jpeg") || contentType.includes("image/png") || contentType.includes("image/webp")) {
              const blob = await resp.blob();
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64Data = reader.result as string;
                if (base64Data && active) {
                  base64Cache.set(effectivePhotoId, base64Data);
                  savePhotoToIndexedDB(effectivePhotoId, base64Data).catch(() => {});
                  setResolvedUrl(base64Data);
                }
              };
              reader.readAsDataURL(blob);
              return;
            }
          }
        } catch (e) {}
      }

      // 4. Check Firestore directly
      if (effectivePhotoId) {
        try {
          const docRef = doc(db, "shared_photos", effectivePhotoId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            if (data && data.base64 && active) {
              const mime = data.mimeType || "image/jpeg";
              const dataUrl = `data:${mime};base64,${data.base64}`;
              base64Cache.set(effectivePhotoId, dataUrl);
              savePhotoToIndexedDB(effectivePhotoId, dataUrl).catch(() => {});
              setResolvedUrl(dataUrl);
              return;
            }
          }
        } catch (e) {
          console.warn("Failed to fetch photo from Firestore:", e);
        }
      }

      // 5. Fallback to standard URL resolution
      if (active && url) {
        setResolvedUrl(resolveMediaUrl(url));
      }
    };

    resolve();

    return () => {
      active = false;
    };
  }, [url, photoId]);

  return resolvedUrl;
}

export interface CamperImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  photoId?: string;
  onReplace?: (file: File) => void;
  showReplacePrompt?: boolean;
}

export const CamperImage: React.FC<CamperImageProps> = ({
  src,
  photoId,
  onReplace,
  showReplacePrompt = true,
  className,
  alt,
  ...props
}) => {
  const resolvedSrc = useResolvedPhotoUrl(src, photoId);
  const [hasError, setHasError] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setHasError(false);
  }, [resolvedSrc]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onReplace) {
      onReplace(e.target.files[0]);
    }
  };

  // If there's an error or no source
  if (hasError || !resolvedSrc) {
    return (
      <div
        className={`relative w-full h-full min-h-[90px] bg-stone-100 flex flex-col items-center justify-center p-2 text-center select-none border border-dashed border-stone-300 rounded-lg ${
          className || ""
        }`}
      >
        <div className="w-8 h-8 rounded-full bg-stone-200/80 flex items-center justify-center text-stone-500 mb-1">
          <Camera className="w-4 h-4" />
        </div>
        <p className="text-[10px] font-semibold text-stone-600 line-clamp-1 max-w-[90%]">
          {alt || "Foto non disponibile"}
        </p>
        {onReplace && showReplacePrompt && (
          <>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-[#3E4A35] hover:bg-[#2d3627] text-white text-[9px] font-bold rounded-md shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              Ricarica foto
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      referrerPolicy="no-referrer"
      {...props}
    />
  );
};
