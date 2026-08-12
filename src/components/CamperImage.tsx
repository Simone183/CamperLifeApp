import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { resolveMediaUrl } from "../utils/resolveMediaUrl";

// Cache to avoid refetching the same photo multiple times during the session
const base64Cache = new Map<string, string>();

export function useResolvedPhotoUrl(url?: string): string {
  const [resolvedUrl, setResolvedUrl] = useState<string>("");

  useEffect(() => {
    if (!url) {
      setResolvedUrl("");
      return;
    }

    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("data:") ||
      url.startsWith("blob:")
    ) {
      setResolvedUrl(url);
      return;
    }

    // Check if it's a Firestore photo API path (e.g., /api/photos/photo_12345)
    if (url.startsWith("/api/photos/")) {
      const photoId = url.replace("/api/photos/", "");
      
      // Return cached version if exists
      if (base64Cache.has(photoId)) {
        setResolvedUrl(base64Cache.get(photoId)!);
        return;
      }

      let active = true;
      const fetchFromFirestore = async () => {
        try {
          const docRef = doc(db, "shared_photos", photoId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            if (data && data.base64 && active) {
              const mime = data.mimeType || "image/jpeg";
              const dataUrl = `data:${mime};base64,${data.base64}`;
              base64Cache.set(photoId, dataUrl);
              setResolvedUrl(dataUrl);
              return;
            }
          }
        } catch (e) {
          console.error("Failed to fetch photo from Firestore:", e);
        }
        
        // Fallback to standard resolution if Firestore fetch fails
        if (active) {
          setResolvedUrl(resolveMediaUrl(url));
        }
      };

      fetchFromFirestore();
      return () => {
        active = false;
      };
    }

    // Otherwise, standard resolve
    setResolvedUrl(resolveMediaUrl(url));
  }, [url]);

  return resolvedUrl;
}

interface CamperImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
}

export const CamperImage: React.FC<CamperImageProps> = ({ src, ...props }) => {
  const resolvedSrc = useResolvedPhotoUrl(src);
  return <img src={resolvedSrc} {...props} referrerPolicy="no-referrer" />;
};
