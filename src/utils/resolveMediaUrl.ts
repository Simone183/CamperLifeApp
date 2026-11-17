const ROYALTY_FREE_CULINARY_POSTERS = [
  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=80", // Grigliata & Carne alla brace
  "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=900&q=80", // Calici di Vino & Cantine
  "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=80", // Olio Extravergine Nuovo & Bruschetta
  "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&w=900&q=80", // Castagne, Marroni & Sapori d'Autunno
  "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=900&q=80", // Pasta Fresca, Tartufo & Tradizione
  "https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=900&q=80", // Mercatini di Natale & Luci nel Borgo
  "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80", // Spiedo, Arrosti & Polenta
  "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=900&q=80", // Sagra del Pesce & Mare
];

/**
 * Normalizes any legacy sagra flyer URL into a 100% legal, royalty-free culinary poster image
 * without ever connecting to third-party proprietary portals like trovasagre.com.
 */
export function normalizeSagraFlyerUrl(url?: string, titleHint?: string): string {
  const hint = `${url || ""} ${titleHint || ""}`.toLowerCase();
  if (
    !url ||
    url.includes("trovasagre.com") ||
    url.includes("/api/sagre-flyer") ||
    url.startsWith("/sagre-flyers/") ||
    url.startsWith("sagre-flyers/") ||
    url.startsWith("/thumbs/") ||
    url.startsWith("/uploads/flyer_") ||
    url.startsWith("/uploads/batch_") ||
    url.startsWith("/uploads/scrape_") ||
    url.startsWith("/uploads/ext_")
  ) {
    if (hint.includes("vino") || hint.includes("brunello") || hint.includes("vigna") || hint.includes("novello")) {
      return ROYALTY_FREE_CULINARY_POSTERS[1];
    }
    if (hint.includes("olio") || hint.includes("fettunta") || hint.includes("frantoi")) {
      return ROYALTY_FREE_CULINARY_POSTERS[2];
    }
    if (hint.includes("castagn") || hint.includes("marron") || hint.includes("mosciarella")) {
      return ROYALTY_FREE_CULINARY_POSTERS[3];
    }
    if (hint.includes("natale") || hint.includes("mercatin") || hint.includes("lantern") || hint.includes("giftland")) {
      return ROYALTY_FREE_CULINARY_POSTERS[5];
    }
    if (hint.includes("pesce") || hint.includes("mare") || hint.includes("fregola") || hint.includes("cous")) {
      return ROYALTY_FREE_CULINARY_POSTERS[7];
    }
    if (hint.includes("spiedo") || hint.includes("cinghiale") || hint.includes("bistecca") || hint.includes("porchetta")) {
      return ROYALTY_FREE_CULINARY_POSTERS[6];
    }
    if (hint.includes("tartuf") || hint.includes("tortell") || hint.includes("cappell") || hint.includes("gnocch")) {
      return ROYALTY_FREE_CULINARY_POSTERS[4];
    }
    let hash = 0;
    for (let i = 0; i < hint.length; i++) {
      hash = (hash * 31 + hint.charCodeAt(i)) >>> 0;
    }
    return ROYALTY_FREE_CULINARY_POSTERS[hash % ROYALTY_FREE_CULINARY_POSTERS.length];
  }
  return url.trim();
}

/**
 * Resolves a media URL (relative or absolute) to a fully qualified URL
 * especially when running in a mobile/native environment (Capacitor/Cordova)
 * where relative URLs fail to resolve because of the local protocols.
 */
export function resolveMediaUrl(url?: string): string {
  if (!url) return "";
  const normalized = normalizeSagraFlyerUrl(url);
  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("blob:")
  ) {
    return normalized;
  }

  // Check if this is a dynamic backend route or upload path
  const isDynamicServerPath =
    normalized.startsWith("/uploads/") ||
    normalized.startsWith("uploads/") ||
    normalized.startsWith("/api/") ||
    normalized.startsWith("api/");

  // Local static bundled files in public/ must remain relative for offline / native access
  if (
    !isDynamicServerPath &&
    (normalized.includes("soste_catalog.json") ||
      normalized.startsWith("/icons/") ||
      normalized.startsWith("icons/") ||
      normalized.startsWith("/assets/") ||
      normalized.startsWith("assets/") ||
      normalized === "/logo.png" ||
      normalized === "logo.png" ||
      normalized === "/favicon.ico" ||
      normalized.endsWith(".svg") ||
      normalized.endsWith(".ico"))
  ) {
    return normalized.startsWith("/") ? normalized : `/${normalized}`;
  }

  // Detect if the app is running in a mobile native WebView (Capacitor/Cordova)
  const isWeb =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("run.app") ||
      window.location.hostname.includes("webcontainer") ||
      (window.location.hostname === "localhost" && (window.location.port === "3000" || window.location.port === "5173")) ||
      (window.location.hostname === "127.0.0.1" && (window.location.port === "3000" || window.location.port === "5173")));

  const cap = typeof window !== "undefined" ? (window as any).Capacitor : undefined;
  const isCapacitorNative = Boolean(
    (cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform()) ||
    (cap && cap.platform && cap.platform !== "web") ||
    (typeof window !== "undefined" && (
      window.location.protocol.startsWith("capacitor") ||
      window.location.protocol.startsWith("ionic:") ||
      window.location.protocol.startsWith("file:") ||
      (window.location.hostname === "localhost" && window.location.port === "") ||
      (window.location.hostname === "localhost" && window.location.port === "80")
    ))
  );

  const isMobileNative = (!isWeb || isCapacitorNative);

  if (isMobileNative || isDynamicServerPath) {
    const preBase = "https://ais-pre-tv6qat75tur3z7i63xxkna-942333460354.europe-west2.run.app";
    const devBase = "https://ais-dev-tv6qat75tur3z7i63xxkna-942333460354.europe-west2.run.app";
    let base = preBase;
    if (typeof window !== "undefined" && (window.location.hostname.includes("ais-dev-") || window.location.href.includes("ais-dev-"))) {
      base = devBase;
    }

    if (isMobileNative) {
      const cleanBase = base.replace(/\/$/, "");
      const cleanUrl = normalized.startsWith("/") ? normalized : `/${normalized}`;
      return `${cleanBase}${cleanUrl}`;
    }
  }

  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

/**
 * Resolves an API path (e.g. /api/user-trips/sync) to full URL when on native mobile
 */
export function resolveApiUrl(apiPath: string): string {
  if (!apiPath) return "";
  const normalized = normalizeSagraFlyerUrl(apiPath);
  if (
    normalized.includes("soste_catalog.json") ||
    (normalized.endsWith(".json") && !normalized.startsWith("/api/"))
  ) {
    return normalized.startsWith("/") ? normalized : `/${normalized}`;
  }

  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("blob:")
  ) {
    return normalized;
  }

  const isWeb =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("run.app") ||
      window.location.hostname.includes("webcontainer") ||
      (window.location.hostname === "localhost" && (window.location.port === "3000" || window.location.port === "5173")) ||
      (window.location.hostname === "127.0.0.1" && (window.location.port === "3000" || window.location.port === "5173")));

  const cap = typeof window !== "undefined" ? (window as any).Capacitor : undefined;
  const isCapacitorNative = Boolean(
    (cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform()) ||
    (cap && cap.platform && cap.platform !== "web") ||
    (typeof window !== "undefined" && (
      window.location.protocol.startsWith("capacitor") ||
      window.location.protocol.startsWith("ionic:") ||
      window.location.protocol.startsWith("file:") ||
      (window.location.hostname === "localhost" && window.location.port === "") ||
      (window.location.hostname === "localhost" && window.location.port === "80")
    ))
  );

  const isMobileNative = (!isWeb || isCapacitorNative);

  if (isMobileNative) {
    const preBase = "https://ais-pre-tv6qat75tur3z7i63xxkna-942333460354.europe-west2.run.app";
    const devBase = "https://ais-dev-tv6qat75tur3z7i63xxkna-942333460354.europe-west2.run.app";
    let base = preBase;
    if (typeof window !== "undefined" && (window.location.hostname.includes("ais-dev-") || window.location.href.includes("ais-dev-"))) {
      base = devBase;
    }
    const cleanBase = base.replace(/\/$/, "");
    const cleanPath = normalized.startsWith("/") ? normalized : `/${normalized}`;
    return `${cleanBase}${cleanPath}`;
  }

  return normalized;
}
