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
    // Standard GCS/Cloud Run production host urls
    const devBase = "https://ais-dev-ajaitltcclogrgumjfdqkq-942333460354.europe-west2.run.app";
    const preBase = "https://ais-pre-ajaitltcclogrgumjfdqkq-942333460354.europe-west2.run.app";
    
    let base = devBase;
    
    // Choose the base URL according to the current app host/deployment type
    if (window.location.hostname.includes("ais-pre-") || window.location.href.includes("ais-pre-")) {
      base = preBase;
    }
    
    const cleanBase = base.replace(/\/$/, "");
    const cleanUrl = url.startsWith("/") ? url : `/${url}`;
    return `${cleanBase}${cleanUrl}`;
  }

  return url;
}
