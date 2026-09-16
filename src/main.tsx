import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "./index.css";
import App from "./App.tsx";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary.tsx";

// 1. Intercettatore API trasparente per ambienti app ibridi nativi (come Capacitor APK)
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

    // Aggiungi monkey-patch sicuro per prevenire QuotaExceededError in localStorage
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const originalSetItem = window.localStorage.setItem.bind(window.localStorage);
        window.localStorage.setItem = function(key: string, value: string) {
          try {
            originalSetItem(key, String(value));
          } catch (e: any) {
            if (e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
              console.warn('LocalStorage quota exceeded for key:', key);
            } else {
              console.warn('LocalStorage setItem error for key:', key, e);
            }
          }
        };
      }
    } catch (storageErr) {
      console.warn("Could not patch localStorage:", storageErr);
    }

    if (isMobileNative && window.fetch) {

      const originalFetch = window.fetch;

      const customFetch = async function (
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
            // Intercettazioni di servizi cartografici pubblici per bypassare il server sandbox quando siamo su mobile nativo
            if (apiPath.startsWith("/api/map-data-proxy")) {
              try {
                let query = "";
                if (init && init.body) {
                  const bodyStr = init.body.toString();
                  if (bodyStr.startsWith("{")) {
                    const parsed = JSON.parse(bodyStr);
                    query = parsed.data || "";
                  } else {
                    query = bodyStr;
                  }
                }
                if (query) {
                  const servers = [
                    "https://overpass-api.de/api/interpreter",
                    "https://lz4.overpass-api.de/api/interpreter",
                    "https://z.overpass-api.de/api/interpreter",
                    "https://overpass.openstreetmap.fr/api/interpreter",
                    "https://overpass.kumi.systems/api/interpreter",
                    "https://overpass.nchc.org.tw/api/interpreter",
                    "https://overpass.private.coffee/api/interpreter",
                  ];
                  const tryOverpass = async (index: number): Promise<Response> => {
                    if (index >= servers.length) {
                      return new Response(JSON.stringify({ elements: [] }), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                      });
                    }
                    const controller = new AbortController();
                    const tId = setTimeout(() => controller.abort(), 6000);
                    try {
                      const res = await originalFetch.call(window, servers[index], {
                        method: "POST",
                        headers: { "Content-Type": "application/x-www-form-urlencoded" },
                        body: `data=${encodeURIComponent(query)}`,
                        signal: controller.signal,
                      });
                      clearTimeout(tId);
                      if (res.ok) return res;
                      return tryOverpass(index + 1);
                    } catch (e) {
                      clearTimeout(tId);
                      return tryOverpass(index + 1);
                    }
                  };
                  return tryOverpass(0);
                }
              } catch (err) {
                console.warn("[Capacitor Proxy] Failed direct OSM proxy:", err);
              }
            }

            if (apiPath.startsWith("/api/nominatim-reverse")) {
              try {
                const urlObj = new URL(urlStr, window.location.href);
                const lat = urlObj.searchParams.get("lat") || "";
                const lon = urlObj.searchParams.get("lon") || "";
                const targetUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&addressdetails=1`;
                return originalFetch.call(window, targetUrl, {
                  headers: { "User-Agent": "ViaCamperApp/2.0" },
                });
              } catch (err) {
                console.warn("[Capacitor Proxy] Failed direct Nominatim Reverse:", err);
              }
            }

            if (apiPath.startsWith("/api/nominatim")) {
              try {
                const urlObj = new URL(urlStr, window.location.href);
                const q = urlObj.searchParams.get("q") || "";
                const targetUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`;
                return originalFetch.call(window, targetUrl, {
                  headers: { "User-Agent": "ViaCamperApp/2.0" },
                });
              } catch (err) {
                console.warn("[Capacitor Proxy] Failed direct Nominatim Search:", err);
              }
            }

            if (apiPath.startsWith("/api/routing-osrm")) {
              try {
                const urlObj = new URL(urlStr, window.location.href);
                const coordinates = urlObj.searchParams.get("coordinates") || "";
                const profile = urlObj.searchParams.get("profile") || "driving";
                const overview = urlObj.searchParams.get("overview") || "full";
                const steps = urlObj.searchParams.get("steps") || "true";
                const targetUrl = `https://router.project-osrm.org/route/v1/${encodeURIComponent(profile)}/${coordinates}?overview=${encodeURIComponent(overview)}&geometries=geojson&steps=${encodeURIComponent(steps)}`;
                return originalFetch.call(window, targetUrl, {
                  headers: { "User-Agent": "ViaCamperApp/2.0" },
                });
              } catch (err) {
                console.warn("[Capacitor Proxy] Failed direct OSRM routing:", err);
              }
            }
          }

          return originalFetch.call(window, input, init);
        } catch (err) {
          return originalFetch.call(window, input, init);
        }
      };

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

const rootElem = document.getElementById("root");
if (rootElem) {
  try {
    const root = createRoot(rootElem);
    root.render(
      <StrictMode>
        <GlobalErrorBoundary>
          <App />
        </GlobalErrorBoundary>
      </StrictMode>,
    );
  } catch (mountErr) {
    console.error("[ViaCamper] Critical mount error:", mountErr);
    const errBox = document.getElementById("v-boot-error");
    if (errBox) {
      errBox.style.display = "block";
      const errMsg = document.getElementById("v-boot-msg");
      if (errMsg) errMsg.textContent = String((mountErr as any)?.message || mountErr);
    }
  }
}
