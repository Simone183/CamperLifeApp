// 1. Intercettatore API trasparente per ambienti app ibridi nativi (come Capacitor APK)
// Deve essere eseguito prima di qualsiasi altra importazione o caricamento di componenti!
try {
  if (typeof window !== "undefined") {
    const isMobileNative =
      typeof (window as any).Capacitor !== "undefined" ||
      window.location.protocol.startsWith("capacitor") ||
      window.location.protocol.startsWith("file:") ||
      ((window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname === "") &&
        window.location.port !== "3000" &&
        window.location.port !== "5173");

    console.log("[Capacitor API Proxy Init] Location:", {
      href: window.location.href,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      port: window.location.port,
      isMobileNative,
    });

    if (isMobileNative && window.fetch) {
      const originalFetch = window.fetch;

      const customFetch = function (
        input: RequestInfo | URL,
        init?: RequestInit,
      ) {
        try {
          let urlStr = "";
          if (typeof input === "string") {
            urlStr = input;
          } else if (input instanceof URL) {
            urlStr = input.href;
          } else if (input && (input as any).url) {
            urlStr = (input as any).url;
          }

          let isApiCall = false;
          let apiPath = "";

          if (urlStr) {
            if (urlStr.startsWith("/api/")) {
              isApiCall = true;
              apiPath = urlStr;
            } else {
              try {
                const parsedUrl = new URL(urlStr, window.location.href);
                if (parsedUrl.pathname.startsWith("/api/")) {
                  isApiCall = true;
                  apiPath = parsedUrl.pathname + parsedUrl.search;
                }
              } catch (e) {
                if (urlStr.includes("/api/")) {
                  isApiCall = true;
                  const idx = urlStr.indexOf("/api/");
                  apiPath = urlStr.substring(idx);
                }
              }
            }
          }

          if (isApiCall && apiPath) {
            // Definiamo i backend disponibili (sia pre-produzione che sviluppo)
            const preBase =
              "https://ais-pre-ajaitltcclogrgumjfdqkq-942333460354.europe-west2.run.app";
            const devBase =
              "https://ais-dev-ajaitltcclogrgumjfdqkq-942333460354.europe-west2.run.app";

            // Proviamo a contattare i server. Se uno fallisce (es. offline, cold start o CORS), proviamo l'altro.
            const tryFetch = async (base: string): Promise<Response> => {
              const cleanBase = base.replace(/\/$/, "");
              const targetUrl = `${cleanBase}${apiPath}`;
              console.log(
                `[Capacitor API Proxy] Attempting API call from ${urlStr} to ${targetUrl}`,
              );

              // Se init.body è un Request o simile, gestiamolo con cura
              let fetchInit = init ? { ...init } : undefined;

              if (typeof input === "string") {
                return originalFetch.call(window, targetUrl, fetchInit);
              } else if (input instanceof URL) {
                return originalFetch.call(
                  window,
                  new URL(targetUrl),
                  fetchInit,
                );
              } else {
                const newRequest = new Request(targetUrl, input as Request);
                return originalFetch.call(window, newRequest, fetchInit);
              }
            };

            // Eseguiamo con fallback automatico bidirezionale:
            // Proviamo prima il pre-production; se fallisce o non risponde, passiamo al dev server
            return tryFetch(preBase).catch((err) => {
              console.warn(
                `[Capacitor API Proxy] Pre-production server failed (${err.message || err}), falling back to Development server...`,
              );
              return tryFetch(devBase);
            });
          }
        } catch (err) {
          console.warn("Errore nell'intercettatore di fetch:", err);
        }
        return originalFetch.call(window, input, init);
      };

      // Ridefinizione sicura di window.fetch
      try {
        Object.defineProperty(window, "fetch", {
          configurable: true,
          enumerable: true,
          writable: true,
          value: customFetch,
        });
      } catch (e) {
        try {
          (window as any).fetch = customFetch;
        } catch (e2) {
          console.warn("Non è stato possibile sovrascrivere window.fetch:", e2);
        }
      }
    }
  }
} catch (globalErr) {
  console.warn(
    "Errore globale nell'inizializzazione dell'intercettatore fetch:",
    globalErr,
  );
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </StrictMode>,
);
