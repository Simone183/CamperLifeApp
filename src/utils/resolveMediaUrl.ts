/**
 * Resolves a media URL (relative or absolute) to a fully qualified URL
 * especially when running in a mobile/native environment (Capacitor/Cordova)
 * where relative URLs fail to resolve because of the local protocols.
 */
export function resolveMediaUrl(url?: string): string {
  if (!url) return "";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }

  // Check if this is a dynamic backend route or upload path
  const isDynamicServerPath =
    url.startsWith("/uploads/") ||
    url.startsWith("uploads/") ||
    url.startsWith("/api/") ||
    url.startsWith("api/");

  // Local static bundled files in public/ must remain relative for offline / native access
  if (
    !isDynamicServerPath &&
    (url.includes("soste_catalog.json") ||
      url.startsWith("/icons/") ||
      url.startsWith("icons/") ||
      url.startsWith("/assets/") ||
      url.startsWith("assets/") ||
      url === "/logo.png" ||
      url === "logo.png" ||
      url === "/favicon.ico" ||
      url.endsWith(".svg") ||
      url.endsWith(".ico"))
  ) {
    return url.startsWith("/") ? url : `/${url}`;
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
    // Public production Cloud Run URL
    const preBase = "https://ais-pre-tv6qat75tur3z7i63xxkna-942333460354.europe-west2.run.app";
    const devBase = "https://ais-dev-tv6qat75tur3z7i63xxkna-942333460354.europe-west2.run.app";
    
    // Default to the public production endpoint for all native mobile apps & external devices
    let base = preBase;
    
    // Only use devBase when explicitly running in AI Studio dev environment
    if (typeof window !== "undefined" && (window.location.hostname.includes("ais-dev-") || window.location.href.includes("ais-dev-"))) {
      base = devBase;
    }

    if (isMobileNative) {
      const cleanBase = base.replace(/\/$/, "");
      const cleanUrl = url.startsWith("/") ? url : `/${url}`;
      return `${cleanBase}${cleanUrl}`;
    }
  }

  return url.startsWith("/") ? url : `/${url}`;
}

/**
 * Resolves an API path (e.g. /api/user-trips/sync) to full URL when on native mobile
 */
export function resolveApiUrl(apiPath: string): string {
  if (!apiPath) return "";
  // Local static bundled files must NEVER be routed to remote endpoints
  if (
    apiPath.includes("soste_catalog.json") ||
    (apiPath.endsWith(".json") && !apiPath.startsWith("/api/"))
  ) {
    return apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
  }

  if (apiPath.startsWith("http://") || apiPath.startsWith("https://")) {
    return apiPath;
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
    const cleanPath = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
    return `${cleanBase}${cleanPath}`;
  }

  return apiPath;
}
