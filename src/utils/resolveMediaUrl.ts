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

  // Local static files bundled in the app must remain relative for offline / native access
  if (
    url.includes("soste_catalog.json") ||
    url.endsWith(".json") ||
    url.endsWith(".png") ||
    url.endsWith(".jpg") ||
    url.endsWith(".svg") ||
    url.endsWith(".ico")
  ) {
    return url.startsWith("/") ? url : `/${url}`;
  }

  // Detect if the app is running in a mobile native WebView (Capacitor/Cordova)
  const isWeb =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("run.app") ||
      window.location.hostname.includes("webcontainer") ||
      window.location.port === "3000" ||
      window.location.port === "5173");

  const cap = typeof window !== "undefined" ? (window as any).Capacitor : undefined;
  const isCapacitorNative = Boolean(cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform());

  const isMobileNative =
    !isWeb &&
    (isCapacitorNative ||
      (typeof window !== "undefined" &&
        (window.location.protocol.startsWith("capacitor") ||
          window.location.protocol.startsWith("file:") ||
          window.location.protocol.startsWith("ionic:"))));

  if (isMobileNative) {
    // Public production Cloud Run URL
    const preBase = "https://ais-pre-tv6qat75tur3z7i63xxkna-942333460354.europe-west2.run.app";
    const devBase = "https://ais-dev-tv6qat75tur3z7i63xxkna-942333460354.europe-west2.run.app";
    
    // Default to the public production endpoint for all native mobile apps & external devices
    let base = preBase;
    
    // Only use devBase when explicitly running in AI Studio dev environment
    if (typeof window !== "undefined" && (window.location.hostname.includes("ais-dev-") || window.location.href.includes("ais-dev-"))) {
      base = devBase;
    }
    
    const cleanBase = base.replace(/\/$/, "");
    const cleanUrl = url.startsWith("/") ? url : `/${url}`;
    return `${cleanBase}${cleanUrl}`;
  }

  return url;
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
  return resolveMediaUrl(apiPath);
}
