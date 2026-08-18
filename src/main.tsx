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
                    "https://overpass.private.coffee/api/interpreter"
                  ];
                  const tryOverpass = async (index: number): Promise<Response> => {
                    if (index >= servers.length) {
                      console.warn("[Capacitor Proxy] All Overpass servers busy/offline. Returning silent empty fallback.");
                      return new Response(JSON.stringify({ elements: [] }), {
                        status: 200,
                        headers: { "Content-Type": "application/json" }
                      });
                    }
                    const controller = new AbortController();
                    const tId = setTimeout(() => controller.abort(), 6000);
                    try {
                      const res = await originalFetch.call(window, servers[index], {
                        method: "POST",
                        headers: { "Content-Type": "application/x-www-form-urlencoded" },
                        body: `data=${encodeURIComponent(query)}`,
                        signal: controller.signal
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
                  headers: { "User-Agent": "ViaCamperApp/2.0" }
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
                  headers: { "User-Agent": "ViaCamperApp/2.0" }
                });
              } catch (err) {
                console.warn("[Capacitor Proxy] Failed direct Nominatim Search:", err);
              }
            }

            if (apiPath.startsWith("/api/google-places/search")) {
              try {
                const urlObj = new URL(urlStr, window.location.href);
                const q = urlObj.searchParams.get("q") || "";
                const key = urlObj.searchParams.get("key") || "";
                const lat = urlObj.searchParams.get("lat") || "";
                const lng = urlObj.searchParams.get("lng") || "";

                // Se abbiamo una chiave Google Maps valida, interroghiamo direttamente Google Places
                if (key && key !== "YOUR_API_KEY") {
                  let googleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&key=${encodeURIComponent(key)}&language=it`;
                  if (lat && lng) {
                    googleUrl += `&location=${lat},${lng}&radius=50000`;
                  }
                  const gRes = await originalFetch.call(window, googleUrl);
                  if (gRes.ok) {
                    const gData = await gRes.json();
                    if (gData.status === "OK" && Array.isArray(gData.results)) {
                      const places = gData.results.map((p: any) => ({
                        id: `google-${p.place_id}`,
                        place_id: p.place_id,
                        name: p.name,
                        address: p.formatted_address || p.vicinity || "",
                        lat: p.geometry?.location?.lat,
                        lng: p.geometry?.location?.lng,
                        rating: p.rating || null,
                        user_ratings_total: p.user_ratings_total || null,
                        types: p.types || [],
                        photoUrl: p.photos?.[0]?.photo_reference
                          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photo_reference=${p.photos[0].photo_reference}&key=${key}`
                          : null,
                        source: "google_places"
                      }));
                      return new Response(JSON.stringify({ source: "google", places }), {
                        status: 200,
                        headers: { "Content-Type": "application/json" }
                      });
                    }
                  }
                }

                // Fallback diretto OpenStreetMap Nominatim per l'APK mobile nativo
                const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=10&addressdetails=1`;
                const nRes = await originalFetch.call(window, nomUrl, {
                  headers: { "User-Agent": "ViaCamperApp/2.0 (viacamperapp@gmail.com)" }
                });
                if (nRes.ok) {
                  const nData = await nRes.json();
                  const places = (nData || []).map((item: any) => ({
                    id: `osm-${item.place_id}`,
                    place_id: String(item.place_id),
                    name: item.display_name.split(",")[0] || "Località",
                    address: item.display_name,
                    lat: parseFloat(item.lat),
                    lng: parseFloat(item.lon),
                    rating: null,
                    user_ratings_total: null,
                    types: [item.type, item.class].filter(Boolean),
                    photoUrl: null,
                    source: "nominatim"
                  }));
                  return new Response(JSON.stringify({ source: "nominatim", places }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" }
                  });
                }
              } catch (err) {
                console.warn("[Capacitor Proxy] Failed direct places search:", err);
              }
            }

            if (apiPath.startsWith("/api/brouter")) {
              try {
                const urlObj = new URL(urlStr, window.location.href);
                const start = urlObj.searchParams.get("start") || "";
                const end = urlObj.searchParams.get("end") || "";
                const avoidHighways = urlObj.searchParams.get("avoidHighways") || "false";
                const avoidTolls = urlObj.searchParams.get("avoidTolls") || "false";
                const nogos = urlObj.searchParams.get("nogos") || "";

                const params = new URLSearchParams();
                params.append("lonlats", `${start}|${end}`);
                params.append("profile", "car-eco");
                params.append("format", "geojson");
                if (avoidHighways === 'true') {
                  params.append("avoid_motorways", "1");
                }
                if (avoidTolls === 'true') {
                  params.append("avoid_toll", "1");
                }
                if (nogos) {
                  params.append("nogos", nogos);
                }

                const targetUrl = `https://brouter.de/brouter?${params.toString()}`;
                return originalFetch.call(window, targetUrl, {
                  headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                  }
                });
              } catch (err) {
                console.warn("[Capacitor Proxy] Failed direct BRouter routing:", err);
              }
            }

            if (apiPath.startsWith("/api/osrm")) {
              try {
                const urlObj = new URL(urlStr, window.location.href);
                const start = urlObj.searchParams.get("start") || "";
                const end = urlObj.searchParams.get("end") || "";
                const heading = urlObj.searchParams.get("heading") || "";
                const avoidHighways = urlObj.searchParams.get("avoidHighways") || "false";
                const avoidTolls = urlObj.searchParams.get("avoidTolls") || "false";

                const bearingsParam = (heading !== undefined && heading !== null && heading !== "" && !isNaN(Number(heading)))
                  ? `&bearings=${Math.round((Number(heading) % 360 + 360) % 360)},45;`
                  : "";

                const getRouteFromOSM = async (): Promise<Response> => {
                  const servers = [
                    `https://routing.openstreetmap.de/routed-car/route/v1/driving/${start};${end}?overview=full&geometries=geojson&steps=true&continue_straight=true&radiuses=100;100${bearingsParam}`,
                    `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson&steps=true&continue_straight=true&radiuses=100;100${bearingsParam}`
                  ];
                  for (const url of servers) {
                    try {
                      const res = await originalFetch.call(window, url, {
                        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
                      });
                      if (res.ok) {
                        const clone = res.clone();
                        const json = await clone.json();
                        if (json && json.code === "Ok") {
                          return res;
                        }
                      }
                    } catch (e) {}
                  }

                  const bparams = new URLSearchParams();
                  bparams.append("lonlats", `${start}|${end}`);
                  bparams.append("profile", "car-eco");
                  bparams.append("format", "geojson");
                  if (avoidHighways === 'true') {
                    bparams.append("avoid_motorways", "1");
                  }
                  if (avoidTolls === 'true') {
                    bparams.append("avoid_toll", "1");
                  }
                  const brouterUrl = `https://brouter.de/brouter?${bparams.toString()}`;
                  const bres = await originalFetch.call(window, brouterUrl, {
                    headers: { "User-Agent": "Mozilla/5.0" }
                  });
                  if (bres.ok) {
                    const bdata = await bres.json();
                    if (bdata && bdata.features && bdata.features[0]) {
                      const feature = bdata.features[0];
                      const coordinates = feature.geometry?.coordinates || [];
                      const trackLength = parseFloat(feature.properties?.["track-length"] || "0");
                      const converted = {
                        code: "Ok",
                        routes: [
                          {
                            geometry: {
                              coordinates: coordinates,
                              type: "LineString"
                            },
                            legs: [
                              {
                                steps: [],
                                distance: trackLength,
                                duration: trackLength / 13
                              }
                            ],
                            distance: trackLength,
                            duration: trackLength / 13
                          }
                        ]
                      };
                      return new Response(JSON.stringify(converted), {
                        status: 200,
                        headers: { "Content-Type": "application/json" }
                      });
                    }
                  }
                  throw new Error("Routing failed");
                };

                return getRouteFromOSM().catch(err => {
                  console.error("[Capacitor Proxy] Failed direct OSRM routing:", err);
                  return originalFetch.call(window, urlStr);
                });
              } catch (err) {
                console.warn("[Capacitor Proxy] Failed direct OSRM routing:", err);
              }
            }

            // SE HAI UN URL DI PRODUZIONE PUBBLICO (es. Cloud Run pubblico, Railway, Render), inseriscilo qui.
            // Se questo URL è configurato, l'app sul telefono dei beta tester proverà prima questo, bypassando i blocchi di Google AI Studio!
            const productionBase = ""; 

            // Definiamo i backend di sandbox predefiniti (richiedono autenticazione sviluppatore Google se aperti fuori dall'editor)
            const preBase =
              "https://ais-pre-ajaitltcclogrgumjfdqkq-942333460354.europe-west2.run.app";
            const devBase =
              "https://ais-dev-ajaitltcclogrgumjfdqkq-942333460354.europe-west2.run.app";

            // Proviamo a contattare i server.
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

            // Se l'utente ha impostato una URL di produzione pubblica, proviamo prima quella!
            if (productionBase) {
              return tryFetch(productionBase).catch((err) => {
                console.warn(
                  `[Capacitor API Proxy] Production server failed (${err.message || err}), falling back to Pre-production...`,
                );
                return tryFetch(preBase).catch(() => tryFetch(devBase));
              });
            }

            // Altrimenti eseguiamo con fallback automatico sui server di test sandbox
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
