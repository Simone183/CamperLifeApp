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

  // Detect if the app is running in a mobile native WebView
  const isMobileNative =
    typeof (window as any).Capacitor !== "undefined" ||
    window.location.protocol.startsWith("capacitor") ||
    window.location.protocol.startsWith("file:") ||
    ((window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "") &&
      window.location.port !== "3000" &&
      window.location.port !== "5173");

  if (isMobileNative) {
    // Public production Cloud Run URL
    const preBase = "https://ais-pre-ajaitltcclogrgumjfdqkq-942333460354.europe-west2.run.app";
    const devBase = "https://ais-dev-ajaitltcclogrgumjfdqkq-942333460354.europe-west2.run.app";
    
    // Default to the public production endpoint for all native mobile apps & external devices
    let base = preBase;
    
    // Only use devBase when explicitly running in AI Studio dev environment
    if (window.location.hostname.includes("ais-dev-") || window.location.href.includes("ais-dev-")) {
      base = devBase;
    }
    
    const cleanBase = base.replace(/\/$/, "");
    const cleanUrl = url.startsWith("/") ? url : `/${url}`;
    return `${cleanBase}${cleanUrl}`;
  }

  return url;
}
