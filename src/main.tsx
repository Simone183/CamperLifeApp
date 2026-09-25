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

    const checkIsMobileNative = (): boolean => {
      if (typeof window === "undefined") return false;
      // 1. Any web browser environment (Cloud Run, local Vite dev) is strictly WEB, not mobile native
      if (
        window.location.hostname.includes("run.app") ||
        window.location.hostname.includes("webcontainer") ||
        window.location.port === "3000" ||
        window.location.port === "5173"
      ) {
        return false;
      }
      // 2. Capacitor native runtime check
      const cap = (window as any).Capacitor;
      if (cap && typeof cap.isNativePlatform === "function") {
        return Boolean(cap.isNativePlatform());
      }
      // 3. Custom protocols used exclusively by native mobile wrappers (Capacitor/Cordova)
      const isCustomProto =
        window.location.protocol.startsWith("capacitor") ||
        window.location.protocol.startsWith("file:") ||
        window.location.protocol.startsWith("ionic:");
      return isCustomProto;
    };

    if (window.fetch) {
      const originalFetch = window.fetch;

      const customFetch = async function (
        input: RequestInfo | URL,
        init?: RequestInit,
      ) {
        try {
          if (!checkIsMobileNative()) {
            return originalFetch.call(window, input, init);
          }

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
            // 1. Intercettazione Overpass OSM proxy
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

            // 2. Nominatim Reverse
            if (apiPath.startsWith("/api/nominatim-reverse")) {
              try {
                const urlObj = new URL(urlStr, window.location.href);
                const lat = urlObj.searchParams.get("lat") || "";
                const lon = urlObj.searchParams.get("lon") || "";
                const targetUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&addressdetails=1`;
                const res = await originalFetch.call(window, targetUrl, {
                  headers: { "User-Agent": "ViaCamperApp/2.0" },
                });
                if (res.ok) return res;
              } catch (err) {
                console.warn("[Capacitor Proxy] Failed direct Nominatim Reverse:", err);
              }
            }

            // 3. Nominatim Search
            if (apiPath.startsWith("/api/nominatim")) {
              try {
                const urlObj = new URL(urlStr, window.location.href);
                const q = urlObj.searchParams.get("q") || "";
                const targetUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`;
                const res = await originalFetch.call(window, targetUrl, {
                  headers: { "User-Agent": "ViaCamperApp/2.0" },
                });
                if (res.ok) return res;
              } catch (err) {
                console.warn("[Capacitor Proxy] Failed direct Nominatim Search:", err);
              }
            }

            // 4. OSRM Driving Route (/api/osrm and /api/routing-osrm)
            if (apiPath.startsWith("/api/osrm") || apiPath.startsWith("/api/routing-osrm")) {
              try {
                const urlObj = new URL(urlStr, window.location.href);
                const start = urlObj.searchParams.get("start") || "";
                const end = urlObj.searchParams.get("end") || "";
                const coordinates = urlObj.searchParams.get("coordinates") || "";
                const heading = urlObj.searchParams.get("heading") || "";

                let pair = "";
                if (start && end) {
                  pair = `${start};${end}`;
                } else if (coordinates) {
                  pair = coordinates.replace(/,/g, ";");
                }

                if (pair) {
                  const bearingsParam = (heading && !isNaN(Number(heading)))
                    ? `&bearings=${Math.round((Number(heading) % 360 + 360) % 360)},45;`
                    : "";

                  const servers = [
                    `https://routing.openstreetmap.de/routed-car/route/v1/driving/${pair}?overview=full&geometries=geojson&steps=true&continue_straight=true${bearingsParam}`,
                    `https://router.project-osrm.org/route/v1/driving/${pair}?overview=full&geometries=geojson&steps=true&continue_straight=true${bearingsParam}`,
                    `https://routing.openstreetmap.de/routed-car/route/v1/driving/${pair}?overview=full&geometries=geojson&steps=true&continue_straight=true`,
                    `https://router.project-osrm.org/route/v1/driving/${pair}?overview=full&geometries=geojson&steps=true&continue_straight=true`,
                  ];

                  for (const sUrl of servers) {
                    try {
                      const controller = new AbortController();
                      const tId = setTimeout(() => controller.abort(), 4500);
                      const sRes = await originalFetch.call(window, sUrl, {
                        headers: { "User-Agent": "ViaCamperApp/2.0" },
                        signal: controller.signal,
                      });
                      clearTimeout(tId);
                      if (sRes.ok) {
                        const sData = await sRes.json();
                        if (sData && sData.code === "Ok" && sData.routes && sData.routes.length > 0) {
                          return new Response(JSON.stringify(sData), {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                          });
                        }
                      }
                    } catch (_) {}
                  }

                  // Fallback BRouter convertito a formato OSRM
                  if (start && end) {
                    try {
                      const brouterUrl = `https://brouter.de/brouter?lonlats=${encodeURIComponent(`${start}|${end}`)}&profile=car-eco&format=geojson`;
                      const controller = new AbortController();
                      const tId = setTimeout(() => controller.abort(), 6000);
                      const bRes = await originalFetch.call(window, brouterUrl, {
                        headers: { "User-Agent": "ViaCamperApp/2.0" },
                        signal: controller.signal,
                      });
                      clearTimeout(tId);
                      if (bRes.ok) {
                        const bData = await bRes.json();
                        if (bData && bData.features && bData.features[0] && bData.features[0].geometry) {
                          const feature = bData.features[0];
                          const coords = feature.geometry.coordinates || [];
                          const trackLength = parseFloat(feature.properties?.["track-length"] || "0");
                          const converted = {
                            code: "Ok",
                            routes: [
                              {
                                geometry: {
                                  coordinates: coords,
                                  type: "LineString",
                                },
                                legs: [
                                  {
                                    steps: [],
                                    distance: trackLength,
                                    duration: trackLength / 13,
                                  },
                                ],
                                distance: trackLength,
                                duration: trackLength / 13,
                              },
                            ],
                          };
                          return new Response(JSON.stringify(converted), {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                          });
                        }
                      }
                    } catch (_) {}
                  }
                }
              } catch (err) {
                console.warn("[Capacitor Proxy] Failed direct OSRM routing:", err);
              }
            }

            // 5. BRouter Proxy
            if (apiPath.startsWith("/api/brouter")) {
              try {
                const urlObj = new URL(urlStr, window.location.href);
                const start = urlObj.searchParams.get("start") || "";
                const end = urlObj.searchParams.get("end") || "";
                const lonlats = urlObj.searchParams.get("lonlats") || (start && end ? `${start}|${end}` : "");
                if (lonlats) {
                  try {
                    const brouterUrl = `https://brouter.de/brouter?lonlats=${encodeURIComponent(lonlats)}&profile=car-eco&format=geojson`;
                    const controller = new AbortController();
                    const tId = setTimeout(() => controller.abort(), 6000);
                    const bRes = await originalFetch.call(window, brouterUrl, {
                      headers: { "User-Agent": "ViaCamperApp/2.0" },
                      signal: controller.signal,
                    });
                    clearTimeout(tId);
                    if (bRes.ok) return bRes;
                  } catch (_) {}
                }
              } catch (err) {
                console.warn("[Capacitor Proxy] Failed direct BRouter:", err);
              }
            }

            // 6. Per qualsiasi altra richiesta /api/* non intercettata sopra, inoltra al Cloud Run di produzione
            const remoteBase = "https://ais-pre-tv6qat75tur3z7i63xxkna-942333460354.europe-west2.run.app";
            const targetUrl = `${remoteBase}${apiPath.startsWith("/") ? apiPath : `/${apiPath}`}`;
            try {
              return await originalFetch.call(window, targetUrl, init);
            } catch (remoteErr) {
              console.warn("[Capacitor Proxy] Remote Cloud Run fallback error:", remoteErr);
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
