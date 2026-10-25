import fs from 'fs';
import path from 'path';

/**
 * configure-android-auto.js
 * Configura in modo completo e nativo il supporto ad Android Auto per ViaCamper:
 * 1. Aggiunge le dipendenze Car App Library (androidx.car.app:car-app) a build.gradle
 * 2. Registra CarAppService (con foregroundServiceType="location"), queries TTS e permessi in AndroidManifest.xml
 * 3. Crea il descrittore XML res/xml/automotive_app_desc.xml
 * 4. Implementa il servizio e le schermate native:
 *    - ViaCamperCarAppService & ViaCamperCarSession
 *    - MainMapScreen (Mappa live che segue il camper in tempo reale; i 4 pulsanti Cerca, Soste, Spesa, GPS sono dentro il pannello sinistro senza pulsanti sovrapposti in alto)
 *    - ActiveCarNavigationScreen (Navigatore Camper Interno turn-by-turn direttamente sullo schermo dell'autoradio con guida vocale e ricalcolo dinamico)
 *    - SearchLocationScreen (Ricerca località/aree sosta con Geocoder + Nominatim OSM live)
 *    - MovementsListScreen, CamperPlacesScreen, NavigatorChooserScreen, AddFuelLogScreen, AddMovementScreen
 *    - AutoDataBridge (Gestione GPS live multi-provider, routing OSRM in italiano e sincronizzazione bidirezionale con il telefono)
 *    - MainActivity (Bridge nativo AndroidNativeTTS + sincronizzazione istantanea destinazioni Android Auto verso React)
 */

export function configureAndroidAuto() {
  const root = process.cwd();
  const androidAppDir = path.join(root, 'android', 'app');
  const mainDir = path.join(androidAppDir, 'src', 'main');
  const resDir = path.join(mainDir, 'res');
  const javaDir = path.join(mainDir, 'java', 'com', 'ViaCamper', 'myapp', 'auto');
  const buildGradlePath = path.join(androidAppDir, 'build.gradle');
  const manifestPath = path.join(mainDir, 'AndroidManifest.xml');
  const xmlDir = path.join(resDir, 'xml');

  if (!fs.existsSync(androidAppDir)) {
    console.log('[Android Auto] android/app directory non presente in locale (verrà eseguito in GitHub Actions).');
    return;
  }

  console.log('[Android Auto] Configurazione in corso...');

  // 1. Assicura cartelle
  if (!fs.existsSync(xmlDir)) fs.mkdirSync(xmlDir, { recursive: true });
  if (!fs.existsSync(javaDir)) fs.mkdirSync(javaDir, { recursive: true });

  // 2. Crea res/xml/automotive_app_desc.xml
  const autoDescXml = `<?xml version="1.0" encoding="utf-8"?>
<automotiveApp>
    <uses name="template" />
</automotiveApp>
`;
  fs.writeFileSync(path.join(xmlDir, 'automotive_app_desc.xml'), autoDescXml, 'utf-8');
  console.log('[Android Auto] Creato automotive_app_desc.xml');

  // 3. Modifica AndroidManifest.xml per aggiungere CarAppService, metadati e permessi
  if (fs.existsSync(manifestPath)) {
    let manifest = fs.readFileSync(manifestPath, 'utf-8');

    // Permessi necessari per navigazione continua, notifiche push in background ad app chiusa (Android 12/13/14) e audio guida in auto
    const permissionsToAdd = [
      '    <uses-permission android:name="android.permission.INTERNET" />',
      '    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
      '    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
      '    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />',
      '    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />',
      '    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />',
      '    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
      '    <uses-permission android:name="android.permission.VIBRATE" />',
      '    <uses-permission android:name="android.permission.WAKE_LOCK" />',
      '    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />',
      '    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />',
      '    <uses-permission android:name="android.permission.USE_EXACT_ALARM" />',
      '    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />',
      '    <uses-permission android:name="androidx.car.app.ACCESS_SURFACE" />',
      '    <uses-permission android:name="androidx.car.app.MAP_TEMPLATES" />',
      '    <uses-permission android:name="androidx.car.app.NAVIGATION_TEMPLATES" />'
    ];

    for (const perm of permissionsToAdd) {
      if (!manifest.includes(perm.trim())) {
        manifest = manifest.replace('<application', `${perm}\n    <application`);
      }
    }

    // Android 11+ (API 30+) Package Visibility per motore vocale nativo TTS_SERVICE
    if (!manifest.includes('android.intent.action.TTS_SERVICE')) {
      const ttsQueryBlock = `    <queries>\n        <intent>\n            <action android:name="android.intent.action.TTS_SERVICE" />\n        </intent>\n    </queries>\n    <application`;
      manifest = manifest.replace('<application', ttsQueryBlock);
    }

    // Service & Receiver declarations per CarApp + Background Weather Alert Engine ad app chiusa
    const carServiceDeclaration = `
        <!-- FCM Default Notification Channel & Icon for Closed App Push Alerts -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_channel_id"
            android:value="viacamper_weather_emergency_v2" />
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_icon"
            android:resource="@mipmap/ic_launcher" />

        <!-- Native Background Weather Alert Receiver (Funziona ad app chiusa e schermo spento in tasca) -->
        <receiver
            android:name="com.ViaCamper.myapp.auto.WeatherAlertReceiver"
            android:enabled="true"
            android:exported="true">
            <intent-filter>
                <action android:name="com.ViaCamper.myapp.ACTION_WEATHER_ALERT_CHECK" />
                <action android:name="com.ViaCamper.myapp.ACTION_DELAYED_WEATHER_PUSH" />
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.LOCKED_BOOT_COMPLETED" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
                <action android:name="android.intent.action.QUICKBOOT_POWERON" />
            </intent-filter>
        </receiver>

        <!-- Native Background Weather JobService (Persistente anche dopo chiusura app o riavvio telefono) -->
        <service
            android:name="com.ViaCamper.myapp.auto.WeatherAlertJobService"
            android:permission="android.permission.BIND_JOB_SERVICE"
            android:enabled="true"
            android:exported="true" />

        <!-- Native Sticky Weather Guard Service (Riattiva l'allarme se l'app viene chiusa dalle app recenti) -->
        <service
            android:name="com.ViaCamper.myapp.auto.WeatherGuardService"
            android:enabled="true"
            android:exported="false" />

        <!-- Android Auto ViaCamper Service -->
        <service
            android:name="com.ViaCamper.myapp.auto.ViaCamperCarAppService"
            android:exported="true"
            android:foregroundServiceType="location"
            android:label="@string/app_name"
            android:icon="@mipmap/ic_launcher">
            <intent-filter>
                <action android:name="androidx.car.app.CarAppService" />
                <category android:name="androidx.car.app.category.POI" />
                <category android:name="androidx.car.app.category.NAVIGATION" />
            </intent-filter>
        </service>

        <meta-data
            android:name="androidx.car.app.minCarApiLevel"
            android:value="1" />
        <meta-data
            android:name="com.google.android.gms.car.application"
            android:resource="@xml/automotive_app_desc" />
    </application>`;

    if (!manifest.includes('WeatherAlertReceiver')) {
      manifest = manifest.replace('</application>', carServiceDeclaration);
    }
    fs.writeFileSync(manifestPath, manifest, 'utf-8');
    console.log('[Android Auto] AndroidManifest.xml aggiornato con ViaCamperCarAppService, WeatherAlertReceiver, WeatherAlertJobService e permessi background.');
  }

  // 4. Modifica build.gradle per includere le dipendenze Car App Library e aggiornare versionCode/versionName
  if (fs.existsSync(buildGradlePath)) {
    let gradle = fs.readFileSync(buildGradlePath, 'utf-8');
    
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
      const newVersionName = pkg.version || '2.5.4';
      const parts = newVersionName.split('.').map(n => parseInt(n, 10));
      const newVersionCode = (parts[0] || 2) * 10000 + (parts[1] || 5) * 100 + (parts[2] || 4);

      if (/versionCode\s+\d+/.test(gradle)) {
        gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${newVersionCode}`);
      }
      if (/versionName\s+["'][^"']*["']/.test(gradle)) {
        gradle = gradle.replace(/versionName\s+["'][^"']*["']/, `versionName "${newVersionName}"`);
      }
      console.log(`[Android Auto] Aggiornato build.gradle -> versionCode: ${newVersionCode}, versionName: "${newVersionName}"`);
    } catch (verErr) {
      console.warn('[Android Auto] Errore aggiornamento versione in build.gradle:', verErr);
    }

    const carDep = "    implementation 'androidx.car.app:app:1.4.0'\n    implementation 'androidx.car.app:app-projected:1.4.0'";
    if (!gradle.includes('androidx.car.app:app:')) {
      if (gradle.includes('dependencies {')) {
        gradle = gradle.replace('dependencies {', `dependencies {\n${carDep}`);
      }
    }
    fs.writeFileSync(buildGradlePath, gradle, 'utf-8');
    console.log('[Android Auto] build.gradle sincronizzato con successo.');
  }

  // 5. Genera i file Java sorgenti per Android Auto e MainActivity
  writeJavaSources(javaDir);
}

function writeJavaSources(javaDir) {
  // A. AutoDataBridge.java (GPS live multi-provider, geocodifica Nominatim/Geocoder, routing OSRM e sincronizzazione)
  const autoDataBridgeJava = `package com.ViaCamper.myapp.auto;

import android.content.Context;
import android.content.SharedPreferences;
import android.location.Location;
import android.location.LocationManager;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class AutoDataBridge {

    public static class MovementItem {
        public String id;
        public String location;
        public double lat;
        public double lng;
        public double odometer;
        public String date;
        public String notes;
        public double distanceKm;
    }

    public static class CamperPlaceItem {
        public String id;
        public String name;
        public String type;
        public double lat;
        public double lng;
        public double distanceKm;
    }

    public static class RouteStepItem {
        public String instruction;
        public String roadName;
        public double distanceMeters;
        public double lat;
        public double lng;
        public String maneuverType = "";
        public String maneuverModifier = "";
        public int roundaboutExit = 0;
        public float bearingAfter = 0.0f;
    }

    public static class RouteData {
        public List<RouteStepItem> steps = new ArrayList<>();
        public List<double[]> polyline = new ArrayList<>();
        public double totalDistanceMeters = 0.0;
        public double totalDurationSeconds = 0.0;
    }

    private static final String PREFS_NAME = "CapacitorStorage";
    private static volatile Location latestLiveLocation = null;

    public static void updateLiveLocation(Location loc) {
        if (loc != null && (loc.getLatitude() != 0.0 || loc.getLongitude() != 0.0)) {
            latestLiveLocation = loc;
        }
    }

    /**
     * Restituisce sempre la posizione GPS più fresca combinando fused, gps, passive e network.
     */
    public static Location getBestLiveLocation(Context context) {
        Location best = latestLiveLocation;
        try {
            LocationManager lm = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
            if (lm != null) {
                String[] providers = new String[] { "fused", LocationManager.GPS_PROVIDER, LocationManager.PASSIVE_PROVIDER, LocationManager.NETWORK_PROVIDER };
                for (String p : providers) {
                    try {
                        Location cand = lm.getLastKnownLocation(p);
                        if (cand != null && (cand.getLatitude() != 0.0 || cand.getLongitude() != 0.0)) {
                            if (best == null || cand.getTime() > best.getTime()) {
                                best = cand;
                            }
                        }
                    } catch (Exception ignored) {}
                }
            }
        } catch (SecurityException ignored) {}
        if (best != null) {
            latestLiveLocation = best;
        }
        return best;
    }

    /**
     * Se una località selezionata non ha ancora coordinate (lat/lng == 0), le risolve al volo.
     */
    public static void ensureCoordinates(Context context, MovementItem item) {
        if (item == null) return;
        if (item.lat != 0.0 && item.lng != 0.0) return;
        String query = item.location != null ? item.location.trim() : "";
        if (query.isEmpty() || "Nessuno spostamento attivo".equalsIgnoreCase(query)) {
            Location cur = getBestLiveLocation(context);
            if (cur != null) {
                item.lat = cur.getLatitude();
                item.lng = cur.getLongitude();
            }
            return;
        }

        try {
            android.os.StrictMode.ThreadPolicy policy = new android.os.StrictMode.ThreadPolicy.Builder().permitAll().build();
            android.os.StrictMode.setThreadPolicy(policy);
        } catch (Exception ignored) {}

        // 1. Prova Geocoder nativo
        try {
            android.location.Geocoder geocoder = new android.location.Geocoder(context, Locale.ITALY);
            List<android.location.Address> addrs = geocoder.getFromLocationName(query, 1);
            if (addrs != null && !addrs.isEmpty()) {
                item.lat = addrs.get(0).getLatitude();
                item.lng = addrs.get(0).getLongitude();
                return;
            }
        } catch (Exception ignored) {}

        // 2. Fallback Nominatim OpenStreetMap
        try {
            String urlStr = "https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=it&q=" + URLEncoder.encode(query, "UTF-8");
            HttpURLConnection conn = (HttpURLConnection) new URL(urlStr).openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("User-Agent", "ViaCamperAuto/2.5 (Android Auto Navigation)");
            conn.setConnectTimeout(4000);
            conn.setReadTimeout(4000);
            if (conn.getResponseCode() == 200) {
                BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = br.readLine()) != null) sb.append(line);
                br.close();
                JSONArray arr = new JSONArray(sb.toString());
                if (arr.length() > 0) {
                    JSONObject first = arr.getJSONObject(0);
                    item.lat = Double.parseDouble(first.optString("lat", "0"));
                    item.lng = Double.parseDouble(first.optString("lon", "0"));
                }
            }
        } catch (Exception ignored) {}
    }

    /**
     * Calcola il percorso completo (polilinea stradale ad alta densità + manovre turn-by-turn in italiano)
     * interrogando più server OSRM con fallback automatico per il Navigatore 3D su Android Auto.
     */
    public static RouteData fetchOsrmRouteData(double startLat, double startLng, double endLat, double endLng, String destName) {
        RouteData data = new RouteData();
        String[] osrmEndpoints = new String[]{
            String.format(Locale.US,
                "https://routing.openstreetmap.de/routed-car/route/v1/driving/%.6f,%.6f;%.6f,%.6f?overview=full&geometries=geojson&steps=true",
                startLng, startLat, endLng, endLat),
            String.format(Locale.US,
                "https://router.project-osrm.org/route/v1/driving/%.6f,%.6f;%.6f,%.6f?overview=full&geometries=geojson&steps=true",
                startLng, startLat, endLng, endLat)
        };

        for (String urlStr : osrmEndpoints) {
            HttpURLConnection conn = null;
            try {
                conn = (HttpURLConnection) new URL(urlStr).openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("User-Agent", "ViaCamperAuto/2.5 (Android Auto 3D Navigator)");
                conn.setConnectTimeout(4500);
                conn.setReadTimeout(4500);
                if (conn.getResponseCode() == 200) {
                    BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) sb.append(line);
                    br.close();

                    JSONObject root = new JSONObject(sb.toString());
                    JSONArray routes = root.optJSONArray("routes");
                    if (routes != null && routes.length() > 0) {
                        JSONObject route = routes.getJSONObject(0);
                        data.totalDistanceMeters = route.optDouble("distance", 0.0);
                        data.totalDurationSeconds = route.optDouble("duration", 0.0);

                        List<double[]> overviewPts = new ArrayList<>();
                        JSONObject geom = route.optJSONObject("geometry");
                        if (geom != null) {
                            JSONArray coords = geom.optJSONArray("coordinates");
                            if (coords != null) {
                                for (int c = 0; c < coords.length(); c++) {
                                    JSONArray pt = coords.optJSONArray(c);
                                    if (pt != null && pt.length() >= 2) {
                                        double lng = pt.optDouble(0, 0.0);
                                        double lat = pt.optDouble(1, 0.0);
                                        if (lat != 0.0 || lng != 0.0) {
                                            overviewPts.add(new double[]{lat, lng});
                                        }
                                    }
                                }
                            }
                        }

                        List<double[]> stepGeomPts = new ArrayList<>();
                        JSONArray legs = route.optJSONArray("legs");
                        if (legs != null && legs.length() > 0) {
                            JSONArray rawSteps = legs.getJSONObject(0).optJSONArray("steps");
                            if (rawSteps != null && rawSteps.length() > 0) {
                                for (int i = 0; i < rawSteps.length(); i++) {
                                    JSONObject st = rawSteps.getJSONObject(i);

                                    // Estrai anche la geometria dettagliata di ogni singolo step stradale
                                    JSONObject stGeom = st.optJSONObject("geometry");
                                    if (stGeom != null) {
                                        JSONArray stCoords = stGeom.optJSONArray("coordinates");
                                        if (stCoords != null) {
                                            for (int sc = 0; sc < stCoords.length(); sc++) {
                                                JSONArray pt = stCoords.optJSONArray(sc);
                                                if (pt != null && pt.length() >= 2) {
                                                    double lng = pt.optDouble(0, 0.0);
                                                    double lat = pt.optDouble(1, 0.0);
                                                    if (lat != 0.0 || lng != 0.0) {
                                                        if (stepGeomPts.isEmpty()) {
                                                            stepGeomPts.add(new double[]{lat, lng});
                                                        } else {
                                                            double[] last = stepGeomPts.get(stepGeomPts.size() - 1);
                                                            if (Math.abs(last[0] - lat) > 1e-6 || Math.abs(last[1] - lng) > 1e-6) {
                                                                stepGeomPts.add(new double[]{lat, lng});
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    double segDist = st.optDouble("distance", 0.0);
                                    String currRoad = formatRoadLabel(st.optString("name", ""), st.optString("ref", ""));
                                    JSONObject currMan = st.optJSONObject("maneuver");
                                    float currBearingAfter = currMan != null ? (float) currMan.optDouble("bearing_after", 0.0) : 0.0f;

                                    // In OSRM lo step[i] è il tratto di strada che porta alla manovra dello step[i+1]!
                                    if (i + 1 < rawSteps.length()) {
                                        JSONObject nextSt = rawSteps.getJSONObject(i + 1);
                                        String nextRoad = formatRoadLabel(nextSt.optString("name", ""), nextSt.optString("ref", ""));
                                        JSONObject nextMan = nextSt.optJSONObject("maneuver");
                                        String nextType = nextMan != null ? nextMan.optString("type", "") : "";
                                        String nextMod = nextMan != null ? nextMan.optString("modifier", "") : "";
                                        int nextExit = nextMan != null ? nextMan.optInt("exit", 0) : 0;

                                        double turnLat = endLat;
                                        double turnLng = endLng;
                                        if (nextMan != null && nextMan.has("location")) {
                                            JSONArray locArr = nextMan.optJSONArray("location");
                                            if (locArr != null && locArr.length() >= 2) {
                                                turnLng = locArr.optDouble(0, endLng);
                                                turnLat = locArr.optDouble(1, endLat);
                                            }
                                        }

                                        String roadForTurn = !nextRoad.isEmpty() ? nextRoad : currRoad;
                                        String instr = translateManeuverToItalian(nextType, nextMod, roadForTurn, nextExit, destName);
                                        if (segDist < 5.0 && !"arrive".equals(nextType) && i > 0) continue;

                                        RouteStepItem item = new RouteStepItem();
                                        item.instruction = instr;
                                        item.roadName = !currRoad.isEmpty() ? currRoad : roadForTurn;
                                        item.distanceMeters = segDist;
                                        item.lat = turnLat;
                                        item.lng = turnLng;
                                        item.maneuverType = nextType;
                                        item.maneuverModifier = nextMod;
                                        item.roundaboutExit = nextExit;
                                        item.bearingAfter = currBearingAfter;
                                        data.steps.add(item);
                                    } else {
                                        // Ultimo step: arrivo a destinazione
                                        String currType = currMan != null ? currMan.optString("type", "arrive") : "arrive";
                                        if ("arrive".equals(currType) && data.steps.isEmpty()) {
                                            RouteStepItem item = new RouteStepItem();
                                            item.instruction = translateManeuverToItalian("arrive", "", currRoad, 0, destName);
                                            item.roadName = !currRoad.isEmpty() ? currRoad : (destName != null ? destName : "");
                                            item.distanceMeters = segDist;
                                            item.lat = endLat;
                                            item.lng = endLng;
                                            item.maneuverType = "arrive";
                                            item.maneuverModifier = "";
                                            item.bearingAfter = currBearingAfter;
                                            data.steps.add(item);
                                        }
                                    }
                                }
                            }
                        }

                        List<double[]> rawPoly = (stepGeomPts.size() >= overviewPts.size()) ? stepGeomPts : overviewPts;
                        data.polyline = densifyPolyline(rawPoly);
                        if (!data.polyline.isEmpty() && !data.steps.isEmpty()) {
                            break;
                        }
                    }
                }
            } catch (Exception ignored) {
            } finally {
                if (conn != null) conn.disconnect();
            }
        }

        if (data.steps.isEmpty()) {
            float[] res = new float[2];
            Location.distanceBetween(startLat, startLng, endLat, endLng, res);
            RouteStepItem fallback = new RouteStepItem();
            fallback.instruction = "Procedi verso " + (destName != null ? destName : "la destinazione");
            fallback.roadName = destName != null ? destName : "";
            fallback.distanceMeters = res[0];
            fallback.lat = endLat;
            fallback.lng = endLng;
            fallback.maneuverType = "depart";
            fallback.maneuverModifier = "straight";
            fallback.bearingAfter = (res[1] + 360.0f) % 360.0f;
            data.steps.add(fallback);
            data.totalDistanceMeters = res[0];
            data.totalDurationSeconds = Math.max(60.0, (res[0] / 1000.0) / 65.0 * 3600.0);
        }

        if (data.polyline.isEmpty()) {
            List<double[]> fallbackPts = new ArrayList<>();
            fallbackPts.add(new double[]{startLat, startLng});
            for (RouteStepItem st : data.steps) {
                if (st.lat != 0.0 || st.lng != 0.0) {
                    fallbackPts.add(new double[]{st.lat, st.lng});
                }
            }
            fallbackPts.add(new double[]{endLat, endLng});
            data.polyline = densifyPolyline(fallbackPts);
        }
        return data;
    }

    private static String formatRoadLabel(String name, String ref) {
        String rName = name != null ? name.trim() : "";
        String rRef = ref != null ? ref.trim() : "";
        if (rName.isEmpty() && !rRef.isEmpty()) return rRef;
        if (!rName.isEmpty() && !rRef.isEmpty() && !rName.contains(rRef)) return rName + " (" + rRef + ")";
        return rName;
    }

    /**
     * Infittisce i segmenti della polilinea stradale (max 18 metri tra due vertici consecutivi)
     * per garantire uno scorrimento 3D fluido e un aggancio preciso alla carreggiata (Road-Snapping).
     */
    private static List<double[]> densifyPolyline(List<double[]> pts) {
        List<double[]> result = new ArrayList<>();
        if (pts == null || pts.isEmpty()) return result;
        result.add(pts.get(0));
        float[] distRes = new float[1];
        for (int i = 1; i < pts.size(); i++) {
            double[] prev = pts.get(i - 1);
            double[] curr = pts.get(i);
            Location.distanceBetween(prev[0], prev[1], curr[0], curr[1], distRes);
            float segMeters = distRes[0];
            if (segMeters > 18.0f) {
                int subdivisions = Math.min(40, (int) Math.ceil(segMeters / 15.0f));
                for (int s = 1; s < subdivisions; s++) {
                    double t = (double) s / (double) subdivisions;
                    double iLat = prev[0] + (curr[0] - prev[0]) * t;
                    double iLng = prev[1] + (curr[1] - prev[1]) * t;
                    result.add(new double[]{iLat, iLng});
                }
            }
            result.add(curr);
        }
        return result;
    }

    public static List<RouteStepItem> fetchOsrmRouteSteps(double startLat, double startLng, double endLat, double endLng, String destName) {
        return fetchOsrmRouteData(startLat, startLng, endLat, endLng, destName).steps;
    }

    private static String translateManeuverToItalian(String type, String modifier, String road, int exit, String destName) {
        String roadSuffix = (road != null && !road.trim().isEmpty()) ? " su " + road.trim() : "";
        String dir = "dritto";
        if ("left".equals(modifier) || "sharp left".equals(modifier)) dir = "a sinistra";
        else if ("slight left".equals(modifier)) dir = "leggermente a sinistra";
        else if ("right".equals(modifier) || "sharp right".equals(modifier)) dir = "a destra";
        else if ("slight right".equals(modifier)) dir = "leggermente a destra";
        else if ("uturn".equals(modifier)) dir = "inversione a U";

        if ("depart".equals(type)) {
            return "Procedi" + (roadSuffix.isEmpty() ? " sul percorso" : roadSuffix);
        } else if ("arrive".equals(type)) {
            return "Arrivo a " + (destName != null && !destName.isEmpty() ? destName : "destinazione");
        } else if ("roundabout".equals(type) || "rotary".equals(type) || "exit roundabout".equals(type)) {
            String ord = exit == 1 ? "prima" : exit == 2 ? "seconda" : exit == 3 ? "terza" : exit == 4 ? "quarta" : (exit > 0 ? exit + "a" : "");
            if (!ord.isEmpty()) {
                return "Alla rotonda prendi la " + ord + " uscita" + roadSuffix;
            }
            return "Alla rotonda prosegui" + roadSuffix;
        } else if ("on ramp".equals(type) || "off ramp".equals(type)) {
            return "Prendi lo svincolo " + dir + roadSuffix;
        } else if ("fork".equals(type)) {
            return "Al bivio mantieni la " + (dir.contains("sinistra") ? "sinistra" : "destra") + roadSuffix;
        } else if ("merge".equals(type)) {
            return "Immettiti" + roadSuffix;
        } else if ("inversione a U".equals(dir)) {
            return "Effettua inversione a U" + roadSuffix;
        } else if ("dritto".equals(dir)) {
            return "Continua dritto" + roadSuffix;
        }
        return "Svolta " + dir + roadSuffix;
    }

    public static List<MovementItem> getActiveMovements(Context context, Location currentLoc) {
        Location activeLoc = (currentLoc != null) ? currentLoc : getBestLiveLocation(context);
        List<MovementItem> list = new ArrayList<>();
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String tripsJson = prefs.getString("camper_trips_sambucci.simone@gmail.com", null);
            if (tripsJson == null) {
                for (String key : prefs.getAll().keySet()) {
                    if (key.startsWith("camper_trips_")) {
                        tripsJson = prefs.getString(key, null);
                        break;
                    }
                }
            }

            if (tripsJson != null) {
                JSONArray tripsArr = new JSONArray(tripsJson);
                JSONObject activeTrip = null;
                for (int i = 0; i < tripsArr.length(); i++) {
                    JSONObject t = tripsArr.getJSONObject(i);
                    String status = t.optString("status", "");
                    if ("Attivo".equalsIgnoreCase(status) || "ATTIVO".equalsIgnoreCase(status)) {
                        activeTrip = t;
                        break;
                    }
                }
                if (activeTrip == null && tripsArr.length() > 0) {
                    activeTrip = tripsArr.getJSONObject(0);
                }

                if (activeTrip != null && activeTrip.has("movements")) {
                    JSONArray movs = activeTrip.getJSONArray("movements");
                    for (int j = 0; j < movs.length(); j++) {
                        JSONObject m = movs.getJSONObject(j);
                        MovementItem item = new MovementItem();
                        item.id = m.optString("id", "mov_" + j);
                        item.location = m.optString("location", "Tappa " + (j + 1));
                        item.odometer = m.optDouble("odometer", 0.0);
                        item.date = m.optString("date", "");
                        item.notes = m.optString("notes", "");
                        item.lat = m.optDouble("lat", 0.0);
                        item.lng = m.optDouble("lng", 0.0);

                        if (activeLoc != null && item.lat != 0.0 && item.lng != 0.0) {
                            float[] res = new float[1];
                            Location.distanceBetween(activeLoc.getLatitude(), activeLoc.getLongitude(), item.lat, item.lng, res);
                            item.distanceKm = res[0] / 1000.0;
                        } else {
                            item.distanceKm = 0.0;
                        }
                        list.add(item);
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return list;
    }

    public static List<CamperPlaceItem> getNearbyCamperPlaces(Context context, Location currentLoc) {
        Location activeLoc = (currentLoc != null) ? currentLoc : getBestLiveLocation(context);
        List<CamperPlaceItem> list = new ArrayList<>();
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String placesJson = prefs.getString("camper_cached_places", null);
            if (placesJson != null) {
                JSONArray arr = new JSONArray(placesJson);
                for (int i = 0; i < arr.length() && i < 10; i++) {
                    JSONObject obj = arr.getJSONObject(i);
                    CamperPlaceItem p = new CamperPlaceItem();
                    p.id = obj.optString("id", "place_" + i);
                    p.name = obj.optString("title", obj.optString("name", "Area Camper " + (i + 1)));
                    p.type = obj.optString("type", "Area Sosta");
                    p.lat = obj.optDouble("lat", 0.0);
                    p.lng = obj.optDouble("lng", 0.0);

                    if (activeLoc != null && p.lat != 0.0 && p.lng != 0.0) {
                        float[] res = new float[1];
                        Location.distanceBetween(activeLoc.getLatitude(), activeLoc.getLongitude(), p.lat, p.lng, res);
                        p.distanceKm = res[0] / 1000.0;
                    } else {
                        p.distanceKm = (i + 1) * 2.5;
                    }
                    list.add(p);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        if (list.isEmpty()) {
            double baseLat = (activeLoc != null) ? activeLoc.getLatitude() : 41.9028;
            double baseLng = (activeLoc != null) ? activeLoc.getLongitude() : 12.4964;

            CamperPlaceItem p1 = new CamperPlaceItem();
            p1.id = "demo_cs_1";
            p1.name = "Camper Service & Area Sosta attrezzata";
            p1.type = "Camper Service";
            p1.lat = baseLat + 0.015;
            p1.lng = baseLng + 0.012;
            p1.distanceKm = 1.8;
            list.add(p1);

            CamperPlaceItem p2 = new CamperPlaceItem();
            p2.id = "demo_cs_2";
            p2.name = "Punto Sosta Camper con carico/scarico";
            p2.type = "Area Sosta";
            p2.lat = baseLat - 0.022;
            p2.lng = baseLng + 0.018;
            p2.distanceKm = 3.4;
            list.add(p2);

            CamperPlaceItem p3 = new CamperPlaceItem();
            p3.id = "demo_cs_3";
            p3.name = "Distributore Carburante con GPL Camper";
            p3.type = "Rifornimento & GPL";
            p3.lat = baseLat + 0.035;
            p3.lng = baseLng - 0.010;
            p3.distanceKm = 4.1;
            list.add(p3);
        }

        return list;
    }

    public static void saveTargetDestination(Context context, String name, double lat, double lng) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            JSONObject obj = new JSONObject();
            obj.put("id", "auto_dest_" + System.currentTimeMillis());
            obj.put("name", name);
            obj.put("lat", lat);
            obj.put("lng", lng);
            obj.put("timestamp", System.currentTimeMillis());

            prefs.edit()
                .putString("camper_auto_target_destination", obj.toString())
                .apply();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static List<MovementItem> searchLocations(Context context, String query, Location currentLoc) {
        Location activeLoc = (currentLoc != null) ? currentLoc : getBestLiveLocation(context);
        List<MovementItem> results = new ArrayList<>();
        if (query == null) query = "";
        String qLower = query.toLowerCase().trim();

        try {
            android.os.StrictMode.ThreadPolicy policy = new android.os.StrictMode.ThreadPolicy.Builder().permitAll().build();
            android.os.StrictMode.setThreadPolicy(policy);
        } catch (Exception ignored) {}

        // 1. Geocodifica Nativa Android
        if (!qLower.isEmpty()) {
            try {
                android.location.Geocoder geocoder = new android.location.Geocoder(context, Locale.ITALY);
                List<android.location.Address> addresses = geocoder.getFromLocationName(query.trim(), 5);
                if (addresses != null && !addresses.isEmpty()) {
                    for (int i = 0; i < addresses.size(); i++) {
                        android.location.Address addr = addresses.get(i);
                        double lat = addr.getLatitude();
                        double lng = addr.getLongitude();

                        StringBuilder sb = new StringBuilder();
                        if (addr.getFeatureName() != null) sb.append(addr.getFeatureName());
                        if (addr.getLocality() != null && !addr.getLocality().equalsIgnoreCase(addr.getFeatureName())) {
                            if (sb.length() > 0) sb.append(", ");
                            sb.append(addr.getLocality());
                        }
                        if (addr.getAdminArea() != null) {
                            if (sb.length() > 0) sb.append(" (").append(addr.getAdminArea()).append(")");
                        }
                        String title = sb.length() > 0 ? sb.toString() : query.trim();

                        MovementItem m = new MovementItem();
                        m.id = "geo_" + i + "_" + System.currentTimeMillis();
                        m.location = title;
                        m.notes = "Destinazione verificata";
                        m.lat = lat;
                        m.lng = lng;

                        if (activeLoc != null) {
                            float[] res = new float[1];
                            Location.distanceBetween(activeLoc.getLatitude(), activeLoc.getLongitude(), lat, lng, res);
                            m.distanceKm = res[0] / 1000.0;
                        }
                        results.add(m);
                    }
                }
            } catch (Exception ignored) {}

            // 1B. Geocodifica live Nominatim OpenStreetMap se il Geocoder locale non ha trovato abbastanza risultati
            if (results.size() < 3) {
                try {
                    String urlStr = "https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=it&q=" + URLEncoder.encode(query.trim(), "UTF-8");
                    HttpURLConnection conn = (HttpURLConnection) new URL(urlStr).openConnection();
                    conn.setRequestMethod("GET");
                    conn.setRequestProperty("User-Agent", "ViaCamperAuto/2.5 (Android Auto Navigation)");
                    conn.setConnectTimeout(4000);
                    conn.setReadTimeout(4000);
                    if (conn.getResponseCode() == 200) {
                        BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
                        StringBuilder sb = new StringBuilder();
                        String line;
                        while ((line = br.readLine()) != null) sb.append(line);
                        br.close();
                        JSONArray arr = new JSONArray(sb.toString());
                        for (int i = 0; i < arr.length(); i++) {
                            JSONObject obj = arr.getJSONObject(i);
                            double lat = Double.parseDouble(obj.optString("lat", "0"));
                            double lng = Double.parseDouble(obj.optString("lon", "0"));
                            String disp = obj.optString("display_name", query.trim());
                            String[] parts = disp.split(",");
                            String shortTitle = parts.length > 1 ? (parts[0].trim() + ", " + parts[1].trim()) : disp;

                            MovementItem m = new MovementItem();
                            m.id = "nom_" + i + "_" + System.currentTimeMillis();
                            m.location = shortTitle;
                            m.notes = disp;
                            m.lat = lat;
                            m.lng = lng;
                            if (activeLoc != null && lat != 0.0 && lng != 0.0) {
                                float[] res = new float[1];
                                Location.distanceBetween(activeLoc.getLatitude(), activeLoc.getLongitude(), lat, lng, res);
                                m.distanceKm = res[0] / 1000.0;
                            }
                            results.add(m);
                        }
                    }
                } catch (Exception ignored) {}
            }
        }

        // 2. Ricerca tra le aree di sosta e punti sosta memorizzati
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String placesJson = prefs.getString("camper_cached_places", null);
            if (placesJson != null) {
                JSONArray arr = new JSONArray(placesJson);
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject obj = arr.getJSONObject(i);
                    String title = obj.optString("title", obj.optString("name", ""));
                    String desc = obj.optString("description", obj.optString("type", ""));
                    String region = obj.optString("region", obj.optString("province", ""));
                    
                    if (qLower.isEmpty() || title.toLowerCase().contains(qLower) || desc.toLowerCase().contains(qLower) || region.toLowerCase().contains(qLower)) {
                        MovementItem m = new MovementItem();
                        m.id = obj.optString("id", "place_" + i);
                        m.location = title;
                        m.notes = desc;
                        m.lat = obj.optDouble("lat", 0.0);
                        m.lng = obj.optDouble("lng", 0.0);
                        if (activeLoc != null && m.lat != 0.0 && m.lng != 0.0) {
                            float[] res = new float[1];
                            Location.distanceBetween(activeLoc.getLatitude(), activeLoc.getLongitude(), m.lat, m.lng, res);
                            m.distanceKm = res[0] / 1000.0;
                        }

                        boolean dup = false;
                        for (MovementItem existing : results) {
                            if (existing.location.equalsIgnoreCase(m.location)) { dup = true; break; }
                        }
                        if (!dup) results.add(m);
                        if (results.size() >= 6) break;
                    }
                }
            }
        } catch (Exception ignored) {}

        // 3. Ricerca tra le tappe del viaggio attivo
        List<MovementItem> movs = getActiveMovements(context, activeLoc);
        for (MovementItem m : movs) {
            if (qLower.isEmpty() || (m.location != null && m.location.toLowerCase().contains(qLower))) {
                boolean already = false;
                for (MovementItem r : results) {
                    if (r.location.equalsIgnoreCase(m.location)) { already = true; break; }
                }
                if (!already && results.size() < 6) results.add(m);
            }
        }

        // 4. Se la lista è ancora vuota, mostra le aree sosta vicine
        if (results.isEmpty()) {
            List<CamperPlaceItem> nearby = getNearbyCamperPlaces(context, activeLoc);
            for (CamperPlaceItem cp : nearby) {
                MovementItem m = new MovementItem();
                m.id = cp.id;
                m.location = cp.name;
                m.notes = cp.type;
                m.lat = cp.lat;
                m.lng = cp.lng;
                m.distanceKm = cp.distanceKm;
                results.add(m);
            }
        }

        return results;
    }

    public static boolean saveFuelLog(Context context, double odometer, double totalCost, double liters, String company) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String dateStr = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());
            double pricePerLiter = (liters > 0) ? (totalCost / liters) : 0.0;

            JSONObject newLog = new JSONObject();
            newLog.put("id", "fuel_auto_" + System.currentTimeMillis());
            newLog.put("date", dateStr);
            newLog.put("odometer", odometer);
            newLog.put("totalCost", totalCost);
            newLog.put("liters", liters);
            newLog.put("pricePerLiter", Math.round(pricePerLiter * 1000.0) / 1000.0);
            newLog.put("fuelCompany", company);
            newLog.put("isFullTank", true);
            newLog.put("createdAt", new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(new Date()));

            String existingLogs = prefs.getString("camper_last_fuel_logs", "[]");
            JSONArray arr = new JSONArray(existingLogs);
            arr.put(newLog);

            prefs.edit()
                .putString("camper_last_fuel_logs", arr.toString())
                .apply();

            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public static boolean saveMovement(Context context, String locationName, double odometer, Location loc) {
        try {
            Location activeLoc = (loc != null) ? loc : getBestLiveLocation(context);
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String dateStr = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm", Locale.getDefault()).format(new Date());

            JSONObject newMov = new JSONObject();
            newMov.put("id", "mov_auto_" + System.currentTimeMillis());
            newMov.put("location", locationName);
            newMov.put("odometer", odometer);
            newMov.put("date", dateStr);
            newMov.put("notes", "Registrato da display Android Auto");
            if (activeLoc != null) {
                newMov.put("lat", activeLoc.getLatitude());
                newMov.put("lng", activeLoc.getLongitude());
            }

            String pendingKey = "pending_auto_movements";
            String existing = prefs.getString(pendingKey, "[]");
            JSONArray arr = new JSONArray(existing);
            arr.put(newMov);

            prefs.edit().putString(pendingKey, arr.toString()).apply();
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
}
`;
  fs.writeFileSync(path.join(javaDir, 'AutoDataBridge.java'), autoDataBridgeJava, 'utf-8');

  // B. ViaCamperCarAppService.java
  const serviceJava = `package com.ViaCamper.myapp.auto;

import androidx.annotation.NonNull;
import androidx.car.app.CarAppService;
import androidx.car.app.Session;
import androidx.car.app.validation.HostValidator;

public class ViaCamperCarAppService extends CarAppService {

    @NonNull
    @Override
    public HostValidator createHostValidator() {
        return HostValidator.ALLOW_ALL_HOSTS_VALIDATOR;
    }

    @NonNull
    @Override
    public Session onCreateSession() {
        return new ViaCamperCarSession();
    }
}
`;
  fs.writeFileSync(path.join(javaDir, 'ViaCamperCarAppService.java'), serviceJava, 'utf-8');

  // C. ViaCamperCarSession.java
  const sessionJava = `package com.ViaCamper.myapp.auto;

import android.content.Intent;
import androidx.annotation.NonNull;
import androidx.car.app.AppManager;
import androidx.car.app.Screen;
import androidx.car.app.Session;

public class ViaCamperCarSession extends Session {

    @NonNull
    @Override
    public Screen onCreateScreen(@NonNull Intent intent) {
        try {
            getCarContext().getCarService(AppManager.class)
                .setSurfaceCallback(CarSurfaceRenderer.getInstance(getCarContext()));
        } catch (Exception ignored) {}
        return new MainMapScreen(getCarContext());
    }
}
`;
  fs.writeFileSync(path.join(javaDir, 'ViaCamperCarSession.java'), sessionJava, 'utf-8');

  // C1. CarSurfaceRenderer.java (Motore grafico 3D Prospettico Cockpit per Navigatore Interno Android Auto)
  const carSurfaceRendererJava = `package com.ViaCamper.myapp.auto;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Camera;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.location.Location;
import android.os.Handler;
import android.os.Looper;
import android.util.LruCache;
import android.view.Surface;
import androidx.annotation.NonNull;
import androidx.car.app.AppManager;
import androidx.car.app.CarContext;
import androidx.car.app.SurfaceCallback;
import androidx.car.app.SurfaceContainer;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Motore di rendering 3D Prospettico (Vista Navigatore Cockpit) su Surface nativa Android Auto:
 * - Disegna la mappa stradale con inclinazione 3D (52°) e rotazione automatica nella direzione di marcia (Heading-Up).
 * - Disegna il tracciato blu/ciano reale del percorso OSRM con frecce direzionali bianche sulla carreggiata.
 * - Posiziona il cursore 3D del camper nella parte inferiore dello schermo per dare massima visibilità alla strada davanti.
 * - Mostra tachimetro digitale km/h, bussola, nome della via corrente e badge Sagoma Camper OK.
 */
public class CarSurfaceRenderer implements SurfaceCallback {

    private static CarSurfaceRenderer instance;

    public static synchronized CarSurfaceRenderer getInstance(CarContext context) {
        if (instance == null) {
            instance = new CarSurfaceRenderer(context);
        } else if (context != null) {
            instance.carContext = context;
        }
        return instance;
    }

    private CarContext carContext;
    private SurfaceContainer surfaceContainer;
    private Rect visibleArea;
    private boolean navigationActive = false;
    private boolean is3DPerspective = true;
    private int zoomLevel = 17;

    private double currentLat = 41.9028;
    private double currentLng = 12.4964;
    private double displayLat = 41.9028;
    private double displayLng = 12.4964;
    private boolean hasInitialFix = false;

    private float targetBearing = 0.0f;
    private float displayBearing = 0.0f;
    private float currentSpeedKmh = 0.0f;

    private double destLat = 0.0;
    private double destLng = 0.0;
    private String destName = "";
    private String currentRoadName = "";
    private String nextInstruction = "";

    private List<double[]> routePolyline = new ArrayList<>();
    private List<AutoDataBridge.RouteStepItem> routeSteps = new ArrayList<>();
    private int currentStepIndex = 0;

    private float panOffsetX = 0.0f;
    private float panOffsetY = 0.0f;

    private final LruCache<String, Bitmap> tileCache;
    private final Set<String> downloadingTiles = Collections.synchronizedSet(new HashSet<>());
    private final ExecutorService tileExecutor = Executors.newFixedThreadPool(8);
    private final Handler renderHandler = new Handler(Looper.getMainLooper());
    private File diskTileCacheDir;

    // Ordine a spirale dal centro (sotto e davanti al camper) verso l'esterno per caricare istantaneamente le mappe!
    private static final int[][] SPIRAL_TILE_OFFSETS = buildSpiralOffsets(3);

    private static int[][] buildSpiralOffsets(int radius) {
        List<int[]> list = new ArrayList<>();
        for (int dy = -radius; dy <= radius; dy++) {
            for (int dx = -radius; dx <= radius; dx++) {
                list.add(new int[]{dx, dy});
            }
        }
        Collections.sort(list, (a, b) -> {
            double da = a[0] * a[0] + (a[1] + 0.35) * (a[1] + 0.35);
            double db = b[0] * b[0] + (b[1] + 0.35) * (b[1] + 0.35);
            return Double.compare(da, db);
        });
        return list.toArray(new int[0][]);
    }

    private static class RouteSnapResult {
        int segmentIndex = 0;
        double snappedLat;
        double snappedLng;
        float distanceMeters = Float.MAX_VALUE;
        float segmentBearing = Float.NaN;
    }

    private final Paint tilePaint = new Paint(Paint.FILTER_BITMAP_FLAG | Paint.ANTI_ALIAS_FLAG);
    private final Paint bgPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint gridPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint routeBorderPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint routeInnerPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint routeTraveledPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint chevronPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint hudBgPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint hudBorderPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);

    private final Runnable animationRunnable = new Runnable() {
        @Override
        public void run() {
            if (!navigationActive) return;
            boolean needsMoreFrames = stepInterpolation();
            renderFrame();
            renderHandler.postDelayed(this, needsMoreFrames ? 40L : 220L);
        }
    };

    private CarSurfaceRenderer(CarContext context) {
        this.carContext = context;
        initDiskCache(context);
        this.tileCache = new LruCache<String, Bitmap>(220) {
            @Override
            protected int sizeOf(String key, Bitmap value) {
                return 1;
            }
        };

        bgPaint.setColor(Color.parseColor("#E6ECF2"));
        gridPaint.setColor(Color.parseColor("#D0DAE5"));
        gridPaint.setStrokeWidth(2.0f);
        gridPaint.setStyle(Paint.Style.STROKE);

        routeBorderPaint.setColor(Color.parseColor("#1E3A8A"));
        routeBorderPaint.setStyle(Paint.Style.STROKE);
        routeBorderPaint.setStrokeWidth(22.0f);
        routeBorderPaint.setStrokeCap(Paint.Cap.ROUND);
        routeBorderPaint.setStrokeJoin(Paint.Join.ROUND);

        routeInnerPaint.setColor(Color.parseColor("#00B0FF"));
        routeInnerPaint.setStyle(Paint.Style.STROKE);
        routeInnerPaint.setStrokeWidth(14.0f);
        routeInnerPaint.setStrokeCap(Paint.Cap.ROUND);
        routeInnerPaint.setStrokeJoin(Paint.Join.ROUND);

        routeTraveledPaint.setColor(Color.parseColor("#94A3B8"));
        routeTraveledPaint.setStyle(Paint.Style.STROKE);
        routeTraveledPaint.setStrokeWidth(10.0f);
        routeTraveledPaint.setStrokeCap(Paint.Cap.ROUND);
        routeTraveledPaint.setStrokeJoin(Paint.Join.ROUND);

        chevronPaint.setColor(Color.WHITE);
        chevronPaint.setStyle(Paint.Style.FILL);

        hudBgPaint.setColor(Color.parseColor("#E60F172A"));
        hudBgPaint.setStyle(Paint.Style.FILL);

        hudBorderPaint.setColor(Color.parseColor("#38BDF8"));
        hudBorderPaint.setStyle(Paint.Style.STROKE);
        hudBorderPaint.setStrokeWidth(2.5f);

        textPaint.setColor(Color.WHITE);
        textPaint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
    }

    private void initDiskCache(CarContext ctx) {
        try {
            if (ctx != null && ctx.getCacheDir() != null) {
                diskTileCacheDir = new File(ctx.getCacheDir(), "viacamper_auto_tiles_v2");
                if (!diskTileCacheDir.exists()) {
                    diskTileCacheDir.mkdirs();
                }
            }
        } catch (Exception ignored) {}
    }

    public void attachToCarContext(CarContext ctx) {
        this.carContext = ctx;
        if (diskTileCacheDir == null) {
            initDiskCache(ctx);
        }
        try {
            ctx.getCarService(AppManager.class).setSurfaceCallback(this);
        } catch (Exception ignored) {}
    }

    /**
     * Pre-carica in anticipo le tile stradali attorno alla posizione GPS del camper (zoom 15, 16 e 17)
     * così all'apertura del Navigatore 3D la mappa è già pronta all'istante (0 ms di attesa).
     */
    public void prefetchTilesAround(double lat, double lng) {
        if (lat == 0.0 && lng == 0.0) return;
        int zMain = this.zoomLevel;
        int zParent = Math.max(14, zMain - 2);
        int pTx = (int) Math.floor(lonToTileX(lng, zParent));
        int pTy = (int) Math.floor(latToTileY(lat, zParent));
        for (int dy = -1; dy <= 1; dy++) {
            for (int dx = -1; dx <= 1; dx++) {
                getOrFetchTile(zParent, pTx + dx, pTy + dy);
            }
        }
        int baseX = (int) Math.floor(lonToTileX(lng, zMain));
        int baseY = (int) Math.floor(latToTileY(lat, zMain));
        int limit = Math.min(16, SPIRAL_TILE_OFFSETS.length);
        for (int i = 0; i < limit; i++) {
            int[] off = SPIRAL_TILE_OFFSETS[i];
            getOrFetchTile(zMain, baseX + off[0], baseY + off[1]);
        }
    }

    public void startNavigationSession(Location startLoc, double dLat, double dLng, String dName) {
        this.navigationActive = true;
        this.destLat = dLat;
        this.destLng = dLng;
        this.destName = dName != null ? dName : "";
        this.panOffsetX = 0.0f;
        this.panOffsetY = 0.0f;
        if (startLoc != null && (startLoc.getLatitude() != 0.0 || startLoc.getLongitude() != 0.0)) {
            this.currentLat = startLoc.getLatitude();
            this.currentLng = startLoc.getLongitude();
            this.displayLat = this.currentLat;
            this.displayLng = this.currentLng;
            this.hasInitialFix = true;
            prefetchTilesAround(this.currentLat, this.currentLng);
            if (startLoc.hasBearing() && startLoc.getBearing() != 0.0f) {
                this.targetBearing = (startLoc.getBearing() + 360.0f) % 360.0f;
                this.displayBearing = this.targetBearing;
            } else if (dLat != 0.0 || dLng != 0.0) {
                this.targetBearing = computeBearing(this.currentLat, this.currentLng, dLat, dLng);
                this.displayBearing = this.targetBearing;
            }
        }
        renderHandler.removeCallbacks(animationRunnable);
        renderHandler.post(animationRunnable);
    }

    public void stopNavigationSession() {
        this.navigationActive = false;
        renderHandler.removeCallbacks(animationRunnable);
    }

    public void setRouteData(List<double[]> polyline, List<AutoDataBridge.RouteStepItem> steps, int stepIdx) {
        this.routePolyline = (polyline != null) ? new ArrayList<>(polyline) : new ArrayList<>();
        this.routeSteps = (steps != null) ? new ArrayList<>(steps) : new ArrayList<>();
        this.currentStepIndex = stepIdx;

        // Aggancia subito posizione e orientamento della telecamera 3D al primo segmento stradale!
        RouteSnapResult snap = snapToRoute(currentLat, currentLng);
        if (snap.distanceMeters <= 55.0f) {
            this.displayLat = snap.snappedLat;
            this.displayLng = snap.snappedLng;
        }
        if (!Float.isNaN(snap.segmentBearing)) {
            this.targetBearing = snap.segmentBearing;
            this.displayBearing = snap.segmentBearing;
        } else {
            float forwardBearing = computeForwardBearingAlongRoute(currentLat, currentLng);
            if (!Float.isNaN(forwardBearing)) {
                this.targetBearing = forwardBearing;
                this.displayBearing = forwardBearing;
            }
        }
        prefetchTilesAround(this.displayLat, this.displayLng);
        updateCurrentStepTexts();
        requestRender();
    }

    /**
     * Restituisce la distanza in metri del camper dalla polilinea stradale corrente (utile per il ricalcolo automatico).
     */
    public float getDistanceFromRouteMeters(double lat, double lng) {
        if (routePolyline == null || routePolyline.size() < 2) return 0.0f;
        RouteSnapResult snap = snapToRoute(lat, lng);
        return snap.distanceMeters;
    }

    public void updateNavigationState(Location loc, int stepIdx) {
        this.currentStepIndex = stepIdx;
        updateCurrentStepTexts();

        if (loc != null && (loc.getLatitude() != 0.0 || loc.getLongitude() != 0.0)) {
            double rawLat = loc.getLatitude();
            double rawLng = loc.getLongitude();

            RouteSnapResult snap = snapToRoute(rawLat, rawLng);
            double effectiveLat = (snap.distanceMeters <= 50.0f) ? snap.snappedLat : rawLat;
            double effectiveLng = (snap.distanceMeters <= 50.0f) ? snap.snappedLng : rawLng;

            float[] distRes = new float[2];
            Location.distanceBetween(this.currentLat, this.currentLng, effectiveLat, effectiveLng, distRes);
            float movedMeters = distRes[0];
            float gpsCourse = (distRes[1] + 360.0f) % 360.0f;

            this.currentLat = effectiveLat;
            this.currentLng = effectiveLng;
            if (!hasInitialFix || movedMeters > 800.0f) {
                this.displayLat = effectiveLat;
                this.displayLng = effectiveLng;
                this.hasInitialFix = true;
                prefetchTilesAround(effectiveLat, effectiveLng);
            }

            if (loc.hasSpeed()) {
                this.currentSpeedKmh = Math.max(0.0f, loc.getSpeed() * 3.6f);
            }

            // Se siamo agganciati alla strada (< 45m), segui l'orientamento esatto della corsia stradale
            // per evitare che oscillazioni della bussola GPS ruotino la mappa al contrario!
            if (snap.distanceMeters <= 45.0f && !Float.isNaN(snap.segmentBearing)) {
                this.targetBearing = snap.segmentBearing;
            } else if (loc.hasBearing() && loc.getBearing() != 0.0f && loc.hasSpeed() && loc.getSpeed() >= 2.5f) {
                this.targetBearing = (loc.getBearing() + 360.0f) % 360.0f;
            } else if (movedMeters >= 3.5f) {
                this.targetBearing = gpsCourse;
            } else {
                float routeBearing = computeForwardBearingAlongRoute(effectiveLat, effectiveLng);
                if (!Float.isNaN(routeBearing)) {
                    this.targetBearing = routeBearing;
                }
            }
        }
        requestRender();
    }

    private void updateCurrentStepTexts() {
        if (routeSteps != null && !routeSteps.isEmpty() && currentStepIndex >= 0 && currentStepIndex < routeSteps.size()) {
            AutoDataBridge.RouteStepItem st = routeSteps.get(currentStepIndex);
            this.currentRoadName = (st.roadName != null && !st.roadName.isEmpty()) ? st.roadName : destName;
            this.nextInstruction = st.instruction != null ? st.instruction : "";
        } else {
            this.currentRoadName = destName;
        }
    }

    public boolean toggle3DPerspective() {
        this.is3DPerspective = !this.is3DPerspective;
        if (this.is3DPerspective && this.zoomLevel < 16) {
            this.zoomLevel = 17;
        }
        this.panOffsetX = 0.0f;
        this.panOffsetY = 0.0f;
        requestRender();
        return this.is3DPerspective;
    }

    public boolean is3DPerspective() {
        return this.is3DPerspective;
    }

    public void zoomIn() {
        if (this.zoomLevel < 18) {
            this.zoomLevel++;
            prefetchTilesAround(displayLat, displayLng);
            requestRender();
        }
    }

    public void zoomOut() {
        if (this.zoomLevel > 13) {
            this.zoomLevel--;
            prefetchTilesAround(displayLat, displayLng);
            requestRender();
        }
    }

    public void recenter() {
        this.panOffsetX = 0.0f;
        this.panOffsetY = 0.0f;
        this.displayLat = this.currentLat;
        this.displayLng = this.currentLng;
        requestRender();
    }

    public void requestRender() {
        renderHandler.removeCallbacks(animationRunnable);
        renderHandler.post(animationRunnable);
    }

    private boolean stepInterpolation() {
        boolean animating = false;
        double dLat = currentLat - displayLat;
        double dLng = currentLng - displayLng;
        if (Math.abs(dLat) > 0.0000015 || Math.abs(dLng) > 0.0000015) {
            displayLat += dLat * 0.38;
            displayLng += dLng * 0.38;
            animating = true;
        } else {
            displayLat = currentLat;
            displayLng = currentLng;
        }

        float diffAngle = ((targetBearing - displayBearing + 540.0f) % 360.0f) - 180.0f;
        if (Math.abs(diffAngle) > 0.4f) {
            displayBearing = (displayBearing + diffAngle * 0.28f + 360.0f) % 360.0f;
            animating = true;
        } else {
            displayBearing = targetBearing;
        }
        return animating;
    }

    /**
     * Proietta ortogonalmente le coordinate (lat, lng) sul segmento stradale più vicino di routePolyline.
     * Garantisce che il cursore e il nastro blu seguano esattamente le curve della strada senza tagliare per i campi.
     */
    private RouteSnapResult snapToRoute(double lat, double lng) {
        RouteSnapResult best = new RouteSnapResult();
        best.snappedLat = lat;
        best.snappedLng = lng;
        if (routePolyline == null || routePolyline.size() < 2) {
            return best;
        }

        double cosLat = Math.cos(Math.toRadians(lat));
        float[] distCheck = new float[2];

        for (int i = 0; i < routePolyline.size() - 1; i++) {
            double[] a = routePolyline.get(i);
            double[] b = routePolyline.get(i + 1);

            double ax = (a[1] - lng) * cosLat;
            double ay = a[0] - lat;
            double bx = (b[1] - lng) * cosLat;
            double by = b[0] - lat;

            double dx = bx - ax;
            double dy = by - ay;
            double segLenSq = dx * dx + dy * dy;

            double t = 0.0;
            if (segLenSq > 1e-12) {
                t = -(ax * dx + ay * dy) / segLenSq;
                if (t < 0.0) t = 0.0;
                else if (t > 1.0) t = 1.0;
            }

            double projLat = a[0] + (b[0] - a[0]) * t;
            double projLng = a[1] + (b[1] - a[1]) * t;

            Location.distanceBetween(lat, lng, projLat, projLng, distCheck);
            if (distCheck[0] < best.distanceMeters) {
                best.distanceMeters = distCheck[0];
                best.segmentIndex = i;
                best.snappedLat = projLat;
                best.snappedLng = projLng;
            }
        }

        // Calcola l'angolo di direzione stradale guardando 20-35m avanti lungo la polilinea a partire dal punto proiettato
        for (int j = best.segmentIndex + 1; j < routePolyline.size(); j++) {
            double[] ahead = routePolyline.get(j);
            Location.distanceBetween(best.snappedLat, best.snappedLng, ahead[0], ahead[1], distCheck);
            if (distCheck[0] >= 12.0f || j == routePolyline.size() - 1) {
                if (distCheck[0] > 0.5f) {
                    best.segmentBearing = (distCheck[1] + 360.0f) % 360.0f;
                    break;
                }
            }
        }
        return best;
    }

    private float computeForwardBearingAlongRoute(double lat, double lng) {
        RouteSnapResult snap = snapToRoute(lat, lng);
        if (!Float.isNaN(snap.segmentBearing)) {
            return snap.segmentBearing;
        }
        if (routeSteps != null && currentStepIndex < routeSteps.size()) {
            AutoDataBridge.RouteStepItem st = routeSteps.get(currentStepIndex);
            if (st.bearingAfter != 0.0f) return st.bearingAfter;
            if (st.lat != 0.0 || st.lng != 0.0) {
                return computeBearing(lat, lng, st.lat, st.lng);
            }
        }
        if (destLat != 0.0 || destLng != 0.0) {
            return computeBearing(lat, lng, destLat, destLng);
        }
        return Float.NaN;
    }

    private static float computeBearing(double lat1, double lng1, double lat2, double lng2) {
        float[] res = new float[2];
        Location.distanceBetween(lat1, lng1, lat2, lng2, res);
        return (res[1] + 360.0f) % 360.0f;
    }

    private static double lonToTileX(double lon, int zoom) {
        return ((lon + 180.0) / 360.0) * (1 << zoom);
    }

    private static double latToTileY(double lat, int zoom) {
        double latRad = Math.toRadians(Math.max(-85.0511, Math.min(85.0511, lat)));
        return (1.0 - Math.log(Math.tan(latRad) + 1.0 / Math.cos(latRad)) / Math.PI) / 2.0 * (1 << zoom);
    }

    private Bitmap getOrFetchTile(final int z, final int x, final int y) {
        int maxTile = 1 << z;
        int wrappedX = ((x % maxTile) + maxTile) % maxTile;
        if (y < 0 || y >= maxTile) return null;

        final String key = z + "/" + wrappedX + "/" + y;
        Bitmap cached = tileCache.get(key);
        if (cached != null && !cached.isRecycled()) {
            return cached;
        }
        if (downloadingTiles.contains(key)) {
            return null;
        }
        downloadingTiles.add(key);
        final int finalX = wrappedX;
        tileExecutor.execute(() -> {
            Bitmap bmp = loadOrDownloadTileBitmap(z, finalX, y);
            downloadingTiles.remove(key);
            if (bmp != null) {
                tileCache.put(key, bmp);
                if (navigationActive) {
                    renderHandler.post(this::renderFrame);
                }
            }
        });
        return null;
    }

    private Bitmap loadOrDownloadTileBitmap(int z, int x, int y) {
        // 1. Controlla prima la cache persistente su disco (0-2ms!)
        File diskFile = null;
        if (diskTileCacheDir != null) {
            diskFile = new File(diskTileCacheDir, z + "_" + x + "_" + y + ".png");
            if (diskFile.exists() && diskFile.length() > 100) {
                try (FileInputStream fis = new FileInputStream(diskFile)) {
                    Bitmap diskBmp = BitmapFactory.decodeStream(fis);
                    if (diskBmp != null) return diskBmp;
                } catch (Exception ignored) {}
            }
        }

        // 2. Scarica in parallelo dai server Google Maps multi-host (mt0..mt3) con fallback OSM
        int serverIdx = Math.abs(x + y) & 3;
        String[] urls = new String[]{
            String.format(Locale.US, "https://mt%d.google.com/vt/lyrs=m&x=%d&y=%d&z=%d&hl=it", serverIdx, x, y, z),
            String.format(Locale.US, "https://mt%d.google.com/vt/lyrs=m&x=%d&y=%d&z=%d&hl=it", (serverIdx + 1) & 3, x, y, z),
            String.format(Locale.US, "https://tile.openstreetmap.org/%d/%d/%d.png", z, x, y)
        };
        for (String urlStr : urls) {
            HttpURLConnection conn = null;
            try {
                conn = (HttpURLConnection) new URL(urlStr).openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("User-Agent", "ViaCamperAuto/2.5 (Android Auto 3D Navigator)");
                conn.setConnectTimeout(2500);
                conn.setReadTimeout(2500);
                if (conn.getResponseCode() == 200) {
                    try (InputStream is = conn.getInputStream()) {
                        Bitmap bmp = BitmapFactory.decodeStream(is);
                        if (bmp != null) {
                            if (diskFile != null) {
                                try (FileOutputStream fos = new FileOutputStream(diskFile)) {
                                    bmp.compress(Bitmap.CompressFormat.PNG, 90, fos);
                                } catch (Exception ignored) {}
                            }
                            return bmp;
                        }
                    }
                }
            } catch (Exception ignored) {
            } finally {
                if (conn != null) conn.disconnect();
            }
        }
        return null;
    }

    /**
     * Se una tile ad alto zoom (es. z=17) è ancora in download, disegna istantaneamente il quadrante
     * corrispondente della tile genitore (z=16 o z=15) già in cache così la mappa appare subito!
     */
    private boolean drawParentTileFallback(Canvas canvas, int z, int x, int y, RectF dstRect) {
        for (int deltaZ = 1; deltaZ <= 2; deltaZ++) {
            int pZ = z - deltaZ;
            if (pZ < 12) break;
            int scale = 1 << deltaZ;
            int pX = x >> deltaZ;
            int pY = y >> deltaZ;
            int maxTile = 1 << pZ;
            int wrappedPX = ((pX % maxTile) + maxTile) % maxTile;
            String pKey = pZ + "/" + wrappedPX + "/" + pY;
            Bitmap parentBmp = tileCache.get(pKey);
            if (parentBmp != null && !parentBmp.isRecycled()) {
                int subX = x - (pX << deltaZ);
                int subY = y - (pY << deltaZ);
                int tileW = parentBmp.getWidth();
                int tileH = parentBmp.getHeight();
                int cellW = tileW / scale;
                int cellH = tileH / scale;
                Rect srcRect = new Rect(
                        subX * cellW,
                        subY * cellH,
                        (subX + 1) * cellW,
                        (subY + 1) * cellH
                );
                canvas.drawBitmap(parentBmp, srcRect, dstRect, tilePaint);
                return true;
            } else if (deltaZ == 2) {
                getOrFetchTile(pZ, wrappedPX, pY);
            }
        }
        return false;
    }

    public synchronized void renderFrame() {
        if (surfaceContainer == null) return;
        Surface surface = surfaceContainer.getSurface();
        if (surface == null || !surface.isValid()) return;

        int width = surfaceContainer.getWidth();
        int height = surfaceContainer.getHeight();
        if (width <= 0 || height <= 0) return;

        Canvas canvas = null;
        try {
            canvas = surface.lockCanvas(null);
            if (canvas == null) return;

            // 1. Sfondo base stradale
            canvas.drawColor(Color.parseColor("#DCE4EC"));

            // Calcolo punto focale del camper sullo schermo dell'autoradio
            float pivotX = width * 0.58f;
            float pivotY = is3DPerspective ? (height * 0.77f) : (height * 0.54f);
            if (visibleArea != null && visibleArea.width() > 60 && visibleArea.height() > 60) {
                pivotX = visibleArea.left + visibleArea.width() * 0.54f;
                pivotY = is3DPerspective
                        ? (visibleArea.top + visibleArea.height() * 0.78f)
                        : (visibleArea.top + visibleArea.height() * 0.54f);
            }
            pivotX += panOffsetX;
            pivotY += panOffsetY;

            // 2. Matrice Telecamera 3D Prospettica (52° tilt + rotazione Heading-Up nella direzione di marcia)
            canvas.save();
            Matrix navMatrix = new Matrix();
            float mapScale = is3DPerspective ? 1.72f : 1.35f;
            if (is3DPerspective) {
                Camera camera3D = new Camera();
                camera3D.save();
                camera3D.setLocation(0.0f, 0.0f, -20.0f);
                camera3D.rotateX(52.0f);
                camera3D.getMatrix(navMatrix);
                camera3D.restore();
                navMatrix.preTranslate(-pivotX, -pivotY);
                navMatrix.postTranslate(pivotX, pivotY);
                navMatrix.preRotate(-displayBearing, pivotX, pivotY);
                navMatrix.preScale(mapScale, mapScale, pivotX, pivotY);
            } else {
                navMatrix.preScale(mapScale, mapScale, pivotX, pivotY);
            }
            canvas.concat(navMatrix);

            double centerTileX = lonToTileX(displayLng, zoomLevel);
            double centerTileY = latToTileY(displayLat, zoomLevel);
            int baseTileX = (int) Math.floor(centerTileX);
            int baseTileY = (int) Math.floor(centerTileY);

            // 3. Disegna griglia di Tile Mappa Stradale ordinata a SPIRALE dal centro (camper) verso i bordi!
            for (int[] off : SPIRAL_TILE_OFFSETS) {
                int tx = baseTileX + off[0];
                int ty = baseTileY + off[1];
                float left = (float) ((tx - centerTileX) * 256.0) + pivotX;
                float top = (float) ((ty - centerTileY) * 256.0) + pivotY;
                RectF dstRect = new RectF(left, top, left + 256.5f, top + 256.5f);

                Bitmap tileBmp = getOrFetchTile(zoomLevel, tx, ty);
                if (tileBmp != null && !tileBmp.isRecycled()) {
                    canvas.drawBitmap(tileBmp, null, dstRect, tilePaint);
                } else if (!drawParentTileFallback(canvas, zoomLevel, tx, ty, dstRect)) {
                    canvas.drawRect(dstRect, bgPaint);
                    canvas.drawRect(dstRect, gridPaint);
                }
            }

            // 4. Disegna il Tracciato Blu/Ciano del Percorso OSRM agganciato esattamente alla carreggiata (Road-Snapping)
            if (routePolyline != null && routePolyline.size() >= 2) {
                RouteSnapResult snap = snapToRoute(displayLat, displayLng);

                // Coordinate schermo del punto proiettato sulla strada
                float startPx = (float) ((lonToTileX(snap.snappedLng, zoomLevel) - centerTileX) * 256.0) + pivotX;
                float startPy = (float) ((latToTileY(snap.snappedLat, zoomLevel) - centerTileY) * 256.0) + pivotY;

                // Tratto già percorso (grigio chiaro dietro al camper)
                if (snap.segmentIndex > 0) {
                    Path traveledPath = new Path();
                    int startHistory = Math.max(0, snap.segmentIndex - 25);
                    for (int i = startHistory; i <= snap.segmentIndex; i++) {
                        double[] pt = routePolyline.get(i);
                        float px = (float) ((lonToTileX(pt[1], zoomLevel) - centerTileX) * 256.0) + pivotX;
                        float py = (float) ((latToTileY(pt[0], zoomLevel) - centerTileY) * 256.0) + pivotY;
                        if (i == startHistory) traveledPath.moveTo(px, py);
                        else traveledPath.lineTo(px, py);
                    }
                    traveledPath.lineTo(startPx, startPy);
                    canvas.drawPath(traveledPath, routeTraveledPaint);
                }

                // Tratto attivo davanti al camper che segue fedelmente ogni curva della polilinea stradale
                Path activePath = new Path();
                activePath.moveTo(startPx, startPy);
                float prevPx = startPx;
                float prevPy = startPy;

                List<float[]> chevronVectors = new ArrayList<>();
                float accumDist = 18.0f;

                for (int i = snap.segmentIndex + 1; i < routePolyline.size(); i++) {
                    double[] pt = routePolyline.get(i);
                    float px = (float) ((lonToTileX(pt[1], zoomLevel) - centerTileX) * 256.0) + pivotX;
                    float py = (float) ((latToTileY(pt[0], zoomLevel) - centerTileY) * 256.0) + pivotY;
                    activePath.lineTo(px, py);

                    float segDx = px - prevPx;
                    float segDy = py - prevPy;
                    float segLen = (float) Math.hypot(segDx, segDy);
                    if (segLen > 1.0f) {
                        accumDist += segLen;
                        if (accumDist >= 44.0f && chevronVectors.size() < 32) {
                            accumDist = 0.0f;
                            float midX = (prevPx + px) * 0.5f;
                            float midY = (prevPy + py) * 0.5f;
                            float angleDeg = (float) Math.toDegrees(Math.atan2(segDy, segDx)) + 90.0f;
                            chevronVectors.add(new float[]{midX, midY, angleDeg});
                        }
                    }
                    prevPx = px;
                    prevPy = py;
                }

                canvas.drawPath(activePath, routeBorderPaint);
                canvas.drawPath(activePath, routeInnerPaint);

                // Disegna i chevron direzionali bianchi lungo la corsia blu
                for (float[] cv : chevronVectors) {
                    canvas.save();
                    canvas.translate(cv[0], cv[1]);
                    canvas.rotate(cv[2]);
                    Path ch = new Path();
                    ch.moveTo(0.0f, -6.5f);
                    ch.lineTo(5.5f, 5.0f);
                    ch.lineTo(0.0f, 2.0f);
                    ch.lineTo(-5.5f, 5.0f);
                    ch.close();
                    canvas.drawPath(ch, chevronPaint);
                    canvas.restore();
                }
            }

            // 5. Evidenziatore sulla prossima svolta (cerchio ambra/bianco sull'incrocio)
            if (routeSteps != null && currentStepIndex >= 0 && currentStepIndex < routeSteps.size()) {
                AutoDataBridge.RouteStepItem step = routeSteps.get(currentStepIndex);
                if (step.lat != 0.0 || step.lng != 0.0) {
                    float sx = (float) ((lonToTileX(step.lng, zoomLevel) - centerTileX) * 256.0) + pivotX;
                    float sy = (float) ((latToTileY(step.lat, zoomLevel) - centerTileY) * 256.0) + pivotY;
                    Paint turnSpotPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
                    turnSpotPaint.setColor(Color.parseColor("#F59E0B"));
                    turnSpotPaint.setStyle(Paint.Style.FILL);
                    canvas.drawCircle(sx, sy, 14.0f, turnSpotPaint);
                    turnSpotPaint.setColor(Color.WHITE);
                    turnSpotPaint.setStyle(Paint.Style.STROKE);
                    turnSpotPaint.setStrokeWidth(4.0f);
                    canvas.drawCircle(sx, sy, 14.0f, turnSpotPaint);
                }
            }

            // 6. Puntina Bandiera Destinazione
            if (destLat != 0.0 || destLng != 0.0) {
                float dx = (float) ((lonToTileX(destLng, zoomLevel) - centerTileX) * 256.0) + pivotX;
                float dy = (float) ((latToTileY(destLat, zoomLevel) - centerTileY) * 256.0) + pivotY;
                Paint destPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
                destPaint.setColor(Color.parseColor("#10B981"));
                destPaint.setStyle(Paint.Style.FILL);
                canvas.drawCircle(dx, dy, 18.0f, destPaint);
                destPaint.setColor(Color.WHITE);
                destPaint.setStyle(Paint.Style.STROKE);
                destPaint.setStrokeWidth(5.0f);
                canvas.drawCircle(dx, dy, 18.0f, destPaint);
            }

            canvas.restore();

            // 7. Orizzonte Cielo 3D Atmosferico nella fascia superiore (quando la vista 3D è attiva)
            if (is3DPerspective) {
                float horizonHeight = height * 0.17f;
                Paint skyPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
                skyPaint.setShader(new LinearGradient(
                        0.0f, 0.0f, 0.0f, horizonHeight,
                        new int[]{
                            Color.parseColor("#E60F172A"),
                            Color.parseColor("#991E293B"),
                            Color.TRANSPARENT
                        },
                        new float[]{0.0f, 0.55f, 1.0f},
                        Shader.TileMode.CLAMP
                ));
                canvas.drawRect(0.0f, 0.0f, width, horizonHeight, skyPaint);
            }

            // 8. Cursore Navigatore 3D del Camper (sempre puntato dritto in avanti nella direzione di marcia!)
            draw3DCamperCursor(canvas, pivotX, pivotY, is3DPerspective ? 0.0f : displayBearing);

            // 9. Cruscotto Cockpit HUD (Tachimetro km/h, Bussola, Nome Strada e Sagoma Camper OK)
            drawCockpitHud(canvas, width, height);

        } catch (Exception ignored) {
        } finally {
            if (canvas != null) {
                try {
                    surface.unlockCanvasAndPost(canvas);
                } catch (Exception ignored) {}
            }
        }
    }

    private void draw3DCamperCursor(Canvas canvas, float cx, float cy, float arrowRotationDeg) {
        canvas.save();
        canvas.translate(cx, cy);
        canvas.rotate(arrowRotationDeg);

        // Alone GPS azzurro esterno
        Paint haloPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        haloPaint.setColor(Color.parseColor("#3800B0FF"));
        haloPaint.setStyle(Paint.Style.FILL);
        canvas.drawCircle(0.0f, 0.0f, 44.0f, haloPaint);

        // Ombra disco 3D
        Paint shadowPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        shadowPaint.setColor(Color.parseColor("#55000000"));
        shadowPaint.setStyle(Paint.Style.FILL);
        canvas.drawCircle(0.0f, 5.0f, 27.0f, shadowPaint);

        // Disco bianco 3D del navigatore
        Paint puckPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        puckPaint.setColor(Color.WHITE);
        puckPaint.setStyle(Paint.Style.FILL);
        canvas.drawCircle(0.0f, 0.0f, 26.0f, puckPaint);

        // Bordo blu brillante
        Paint rimPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        rimPaint.setColor(Color.parseColor("#0284C7"));
        rimPaint.setStyle(Paint.Style.STROKE);
        rimPaint.setStrokeWidth(4.5f);
        canvas.drawCircle(0.0f, 0.0f, 26.0f, rimPaint);

        // Freccia direzionale 3D bicolore (stile navigatore automotive)
        Path leftWing = new Path();
        leftWing.moveTo(0.0f, -17.0f);
        leftWing.lineTo(-13.5f, 12.0f);
        leftWing.lineTo(0.0f, 5.0f);
        leftWing.close();
        Paint leftWingPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        leftWingPaint.setColor(Color.parseColor("#0284C7"));
        leftWingPaint.setStyle(Paint.Style.FILL);
        canvas.drawPath(leftWing, leftWingPaint);

        Path rightWing = new Path();
        rightWing.moveTo(0.0f, -17.0f);
        rightWing.lineTo(13.5f, 12.0f);
        rightWing.lineTo(0.0f, 5.0f);
        rightWing.close();
        Paint rightWingPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        rightWingPaint.setColor(Color.parseColor("#0369A1"));
        rightWingPaint.setStyle(Paint.Style.FILL);
        canvas.drawPath(rightWing, rightWingPaint);

        canvas.restore();
    }

    private void drawCockpitHud(Canvas canvas, int width, int height) {
        // A. Pillola Strada Corrente + Bussola in basso a destra
        String cardinal = getCardinalDirection(displayBearing);
        String roadLabel = (currentRoadName != null && !currentRoadName.trim().isEmpty())
                ? currentRoadName.trim()
                : (destName != null && !destName.isEmpty() ? ("Verso " + destName) : "Navigazione Camper 3D");
        if (roadLabel.length() > 28) {
            roadLabel = roadLabel.substring(0, 26) + "...";
        }
        String modeTag = is3DPerspective ? "3D PROSPETTIVA" : "2D NORD";
        String badgeText = "🧭 " + cardinal + " • " + roadLabel + " • 🛡️ " + modeTag;

        textPaint.setTextSize(19.0f);
        float textW = textPaint.measureText(badgeText);
        float pillW = textW + 34.0f;
        float pillH = 38.0f;
        float pillRight = width - 20.0f;
        float pillBottom = height - 18.0f;
        RectF pillRect = new RectF(pillRight - pillW, pillBottom - pillH, pillRight, pillBottom);

        canvas.drawRoundRect(pillRect, 19.0f, 19.0f, hudBgPaint);
        canvas.drawRoundRect(pillRect, 19.0f, 19.0f, hudBorderPaint);
        textPaint.setColor(Color.WHITE);
        canvas.drawText(badgeText, pillRect.left + 17.0f, pillRect.bottom - 12.0f, textPaint);

        // B. Tachimetro Circolare Velocità GPS (km/h) sopra la pillola stradale a destra
        float speedCx = width - 58.0f;
        float speedCy = pillRect.top - 48.0f;
        float speedRadius = 36.0f;

        canvas.drawCircle(speedCx, speedCy, speedRadius, hudBgPaint);
        canvas.drawCircle(speedCx, speedCy, speedRadius, hudBorderPaint);

        String speedVal = String.valueOf(Math.round(currentSpeedKmh));
        textPaint.setTextSize(24.0f);
        float sw = textPaint.measureText(speedVal);
        canvas.drawText(speedVal, speedCx - sw * 0.5f, speedCy + 2.0f, textPaint);

        textPaint.setTextSize(11.0f);
        textPaint.setColor(Color.parseColor("#94A3B8"));
        String unit = "km/h";
        float uw = textPaint.measureText(unit);
        canvas.drawText(unit, speedCx - uw * 0.5f, speedCy + 18.0f, textPaint);
        textPaint.setColor(Color.WHITE);
    }

    private static String getCardinalDirection(float bearing) {
        String[] dirs = new String[]{"N", "NE", "E", "SE", "S", "SO", "O", "NO"};
        int idx = Math.round(((bearing % 360.0f + 360.0f) % 360.0f) / 45.0f) % 8;
        return dirs[idx];
    }

    @Override
    public void onSurfaceAvailable(@NonNull SurfaceContainer surfaceContainer) {
        this.surfaceContainer = surfaceContainer;
        if (navigationActive) {
            renderHandler.post(this::renderFrame);
        }
    }

    @Override
    public void onVisibleAreaChanged(@NonNull Rect visibleArea) {
        this.visibleArea = visibleArea;
        if (navigationActive) {
            renderHandler.post(this::renderFrame);
        }
    }

    @Override
    public void onStableAreaChanged(@NonNull Rect stableArea) {
        if (navigationActive) {
            renderHandler.post(this::renderFrame);
        }
    }

    @Override
    public void onSurfaceDestroyed(@NonNull SurfaceContainer surfaceContainer) {
        if (this.surfaceContainer == surfaceContainer) {
            this.surfaceContainer = null;
        }
    }

    @Override
    public void onScroll(float distanceX, float distanceY) {
        this.panOffsetX -= distanceX;
        this.panOffsetY -= distanceY;
        if (navigationActive) {
            renderFrame();
        }
    }

    @Override
    public void onScale(float focusX, float focusY, float scaleFactor) {
        if (scaleFactor > 1.15f) {
            zoomIn();
        } else if (scaleFactor < 0.85f) {
            zoomOut();
        }
    }
}
`;
  fs.writeFileSync(path.join(javaDir, 'CarSurfaceRenderer.java'), carSurfaceRendererJava, 'utf-8');

  // D. MainMapScreen.java (Mappa live con tutti e 4 i pulsanti dentro il pannello a sinistra, ZERO pulsanti in alto)
  const mainMapScreenJava = `package com.ViaCamper.myapp.auto;

import android.content.Context;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.SpannableString;
import android.text.Spanned;
import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.CarToast;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.CarLocation;
import androidx.car.app.model.Distance;
import androidx.car.app.model.DistanceSpan;
import androidx.car.app.model.ItemList;
import androidx.car.app.model.Metadata;
import androidx.car.app.model.Place;
import androidx.car.app.model.PlaceListMapTemplate;
import androidx.car.app.model.Row;
import androidx.car.app.model.Template;
import java.util.Locale;

/**
 * Schermata Principale Android Auto:
 * - Nessun ActionStrip in alto (eliminati i 4 pulsanti in alto che coprivano il pannello).
 * - Tutte e 4 le funzioni (Cerca, Soste, Spesa, GPS/Tappe) sono inserite ordinatamente dentro il pannello a sinistra.
 * - Inseguimento GPS multi-provider (fused + gps + passive + network) con ricentraggio continuo della mappa in movimento.
 */
public class MainMapScreen extends Screen implements LocationListener {

    private Location lastLocation = null;
    private LocationManager locationManager = null;
    private boolean isListening = false;
    private final Handler liveTrackerHandler = new Handler(Looper.getMainLooper());
    private final Runnable liveTrackerRunnable = new Runnable() {
        @Override
        public void run() {
            try {
                Location fresh = AutoDataBridge.getBestLiveLocation(getCarContext());
                if (fresh != null) {
                    if (lastLocation == null) {
                        lastLocation = fresh;
                        invalidate();
                    } else {
                        float[] dist = new float[1];
                        Location.distanceBetween(
                            lastLocation.getLatitude(), lastLocation.getLongitude(),
                            fresh.getLatitude(), fresh.getLongitude(), dist
                        );
                        if (dist[0] >= 1.5f) {
                            lastLocation = fresh;
                            invalidate();
                        }
                    }
                }
            } catch (Exception ignored) {}
            liveTrackerHandler.postDelayed(this, 1500L);
        }
    };

    public MainMapScreen(@NonNull CarContext carContext) {
        super(carContext);
        startGPSUpdates();
        liveTrackerHandler.postDelayed(liveTrackerRunnable, 1500L);
    }

    private synchronized void startGPSUpdates() {
        if (isListening) return;
        try {
            locationManager = (LocationManager) getCarContext().getSystemService(Context.LOCATION_SERVICE);
            if (locationManager != null) {
                lastLocation = AutoDataBridge.getBestLiveLocation(getCarContext());
                if (lastLocation != null) {
                    CarSurfaceRenderer.getInstance(getCarContext()).prefetchTilesAround(lastLocation.getLatitude(), lastLocation.getLongitude());
                }
                Looper mainLooper = Looper.getMainLooper();
                String[] providers = new String[] { "fused", LocationManager.GPS_PROVIDER, LocationManager.PASSIVE_PROVIDER, LocationManager.NETWORK_PROVIDER };
                for (String provider : providers) {
                    try {
                        locationManager.requestLocationUpdates(provider, 800L, 1.0f, this, mainLooper);
                    } catch (Exception ignored) {}
                }
                isListening = true;
            }
        } catch (SecurityException ignored) {}
    }

    @Override
    public void onLocationChanged(@NonNull Location location) {
        if (location != null && (location.getLatitude() != 0.0 || location.getLongitude() != 0.0)) {
            AutoDataBridge.updateLiveLocation(location);
            boolean moved = (lastLocation == null);
            if (!moved) {
                float[] res = new float[1];
                Location.distanceBetween(lastLocation.getLatitude(), lastLocation.getLongitude(), location.getLatitude(), location.getLongitude(), res);
                moved = res[0] >= 1.0f;
            }
            lastLocation = location;
            if (moved) {
                CarSurfaceRenderer.getInstance(getCarContext()).prefetchTilesAround(location.getLatitude(), location.getLongitude());
                invalidate();
            }
        }
    }

    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {}

    @Override
    public void onProviderEnabled(@NonNull String provider) {}

    @Override
    public void onProviderDisabled(@NonNull String provider) {}

    private SpannableString createDistanceSubtitle(double km, String description) {
        Distance d = Distance.create(Math.max(0.0, km), Distance.UNIT_KILOMETERS);
        String prefix = String.format(Locale.getDefault(), "%.1f km", Math.max(0.0, km));
        String full = (description != null && !description.isEmpty()) ? (prefix + " • " + description) : prefix;
        SpannableString span = new SpannableString(full);
        span.setSpan(DistanceSpan.create(d), 0, prefix.length(), Spanned.SPAN_INCLUSIVE_EXCLUSIVE);
        return span;
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        startGPSUpdates();
        Location activeLoc = (lastLocation != null) ? lastLocation : AutoDataBridge.getBestLiveLocation(getCarContext());

        ItemList.Builder listBuilder = new ItemList.Builder();

        // 1. Cerca Località o Indirizzo (dentro il pannello sinistro)
        Row.Builder searchRow = new Row.Builder()
                .setTitle("🔍 Cerca Destinazione")
                .addText(createDistanceSubtitle(0.0, "Città, indirizzo o sosta"))
                .setBrowsable(true)
                .setOnClickListener(() -> getScreenManager().push(new SearchLocationScreen(getCarContext(), activeLoc)));
        listBuilder.addItem(searchRow.build());

        // 2. Aree Sosta & Camper Service (dentro il pannello sinistro)
        Row.Builder sosteRow = new Row.Builder()
                .setTitle("🚐 Aree Sosta & Service")
                .addText(createDistanceSubtitle(0.0, "Soste camper vicine"))
                .setBrowsable(true)
                .setOnClickListener(() -> getScreenManager().push(new CamperPlacesScreen(getCarContext(), activeLoc)));
        listBuilder.addItem(sosteRow.build());

        // 3. Registra Spesa Carburante (dentro il pannello sinistro)
        Row.Builder spesaRow = new Row.Builder()
                .setTitle("⛽ Spesa Carburante")
                .addText(createDistanceSubtitle(0.0, "Registra rifornimento"))
                .setBrowsable(true)
                .setOnClickListener(() -> getScreenManager().push(new AddFuelLogScreen(getCarContext())));
        listBuilder.addItem(spesaRow.build());

        // 4. Posizione Attuale GPS & Tappe (dentro il pannello sinistro, collegato alla posizione live del camper)
        Row.Builder gpsRow = new Row.Builder()
                .setTitle("📍 Posizione GPS & Tappe")
                .addText(createDistanceSubtitle(0.0, "Tappe viaggio e ricentra"))
                .setBrowsable(true)
                .setOnClickListener(() -> {
                    Location fresh = AutoDataBridge.getBestLiveLocation(getCarContext());
                    if (fresh != null) lastLocation = fresh;
                    invalidate();
                    getScreenManager().push(new MovementsListScreen(getCarContext(), lastLocation));
                });

        if (activeLoc != null) {
            gpsRow.setMetadata(
                new Metadata.Builder()
                    .setPlace(new Place.Builder(CarLocation.create(activeLoc.getLatitude(), activeLoc.getLongitude())).build())
                    .build()
            );
        }
        listBuilder.addItem(gpsRow.build());

        // Costruzione template SENZA ActionStrip superiore (nessun pulsante sovrapposto in alto!)
        PlaceListMapTemplate.Builder templateBuilder = new PlaceListMapTemplate.Builder()
                .setTitle("ViaCamper")
                .setHeaderAction(Action.APP_ICON)
                .setItemList(listBuilder.build())
                .setCurrentLocationEnabled(true);

        if (activeLoc != null) {
            Place anchorPlace = new Place.Builder(CarLocation.create(activeLoc.getLatitude(), activeLoc.getLongitude())).build();
            templateBuilder.setAnchor(anchorPlace);
        }

        return templateBuilder.build();
    }
}
`;
  fs.writeFileSync(path.join(javaDir, 'MainMapScreen.java'), mainMapScreenJava, 'utf-8');

  // D0. SearchLocationScreen.java
  const searchLocationScreenJava = `package com.ViaCamper.myapp.auto;

import android.location.Location;
import android.text.SpannableString;
import android.text.Spanned;
import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.CarColor;
import androidx.car.app.model.CarLocation;
import androidx.car.app.model.Distance;
import androidx.car.app.model.DistanceSpan;
import androidx.car.app.model.ItemList;
import androidx.car.app.model.Metadata;
import androidx.car.app.model.Place;
import androidx.car.app.model.PlaceMarker;
import androidx.car.app.model.Row;
import androidx.car.app.model.SearchTemplate;
import androidx.car.app.model.Template;
import java.util.List;
import java.util.Locale;

public class SearchLocationScreen extends Screen {

    private final Location currentLocation;
    private String currentQuery = "";

    public SearchLocationScreen(@NonNull CarContext carContext, Location loc) {
        super(carContext);
        this.currentLocation = loc;
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        SearchTemplate.SearchCallback searchCallback = new SearchTemplate.SearchCallback() {
            @Override
            public void onSearchTextChanged(@NonNull String searchText) {
                currentQuery = searchText;
                invalidate();
            }

            @Override
            public void onSearchSubmitted(@NonNull String searchText) {
                currentQuery = searchText;
                invalidate();
            }
        };

        Location activeLoc = AutoDataBridge.getBestLiveLocation(getCarContext());
        if (activeLoc == null) activeLoc = currentLocation;

        List<AutoDataBridge.MovementItem> searchResults = AutoDataBridge.searchLocations(getCarContext(), currentQuery, activeLoc);

        ItemList.Builder listBuilder = new ItemList.Builder();

        if (searchResults.isEmpty()) {
            listBuilder.setNoItemsMessage("Digita il nome di una città, via o area di sosta");
        } else {
            for (int i = 0; i < searchResults.size() && i < 6; i++) {
                AutoDataBridge.MovementItem item = searchResults.get(i);
                Row.Builder row = new Row.Builder();
                row.setTitle("📍 " + item.location);
                row.setBrowsable(true);

                if (item.distanceKm > 0) {
                    Distance distance = Distance.create(item.distanceKm, Distance.UNIT_KILOMETERS);
                    String distLabel = String.format(Locale.getDefault(), "%.1f km", item.distanceKm);
                    SpannableString distSpan = new SpannableString(distLabel);
                    distSpan.setSpan(DistanceSpan.create(distance), 0, distSpan.length(), Spanned.SPAN_INCLUSIVE_EXCLUSIVE);
                    row.addText(distSpan);
                }

                if (item.notes != null && !item.notes.isEmpty()) {
                    row.addText(item.notes);
                }

                if (item.lat != 0.0 && item.lng != 0.0) {
                    row.setMetadata(
                        new Metadata.Builder()
                            .setPlace(
                                new Place.Builder(CarLocation.create(item.lat, item.lng))
                                    .setMarker(new PlaceMarker.Builder().setColor(CarColor.BLUE).build())
                                    .build()
                            )
                            .build()
                    );
                }

                row.setOnClickListener(() -> {
                    AutoDataBridge.ensureCoordinates(getCarContext(), item);
                    getScreenManager().push(new NavigatorChooserScreen(getCarContext(), item));
                });

                listBuilder.addItem(row.build());
            }
        }

        return new SearchTemplate.Builder(searchCallback)
                .setHeaderAction(Action.BACK)
                .setSearchHint("Cerca località, città o area sosta...")
                .setInitialSearchText(currentQuery)
                .setItemList(listBuilder.build())
                .setShowKeyboardByDefault(true)
                .build();
    }
}
`;
  fs.writeFileSync(path.join(javaDir, 'SearchLocationScreen.java'), searchLocationScreenJava, 'utf-8');

  // D1. MovementsListScreen.java
  const movementsListScreenJava = `package com.ViaCamper.myapp.auto;

import android.location.Location;
import android.text.SpannableString;
import android.text.Spanned;
import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.Distance;
import androidx.car.app.model.DistanceSpan;
import androidx.car.app.model.ItemList;
import androidx.car.app.model.ListTemplate;
import androidx.car.app.model.Row;
import androidx.car.app.model.Template;
import java.util.List;
import java.util.Locale;

public class MovementsListScreen extends Screen {

    private final Location currentLocation;

    public MovementsListScreen(@NonNull CarContext carContext, Location loc) {
        super(carContext);
        this.currentLocation = loc;
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        Location activeLoc = AutoDataBridge.getBestLiveLocation(getCarContext());
        if (activeLoc == null) activeLoc = currentLocation;
        final Location finalLoc = activeLoc;

        ItemList.Builder listBuilder = new ItemList.Builder();
        List<AutoDataBridge.MovementItem> movements = AutoDataBridge.getActiveMovements(getCarContext(), activeLoc);

        // 1. Voce fissa per registrare istantaneamente la posizione GPS attuale
        listBuilder.addItem(new Row.Builder()
                .setTitle("📍 Registra Posizione GPS Attuale")
                .setBrowsable(true)
                .addText("Salva la posizione e i km correnti nel diario di bordo")
                .setOnClickListener(() -> {
                    getScreenManager().push(new AddMovementScreen(getCarContext(), finalLoc));
                })
                .build());

        if (!movements.isEmpty()) {
            for (int i = 0; i < movements.size() && i < 5; i++) {
                AutoDataBridge.MovementItem m = movements.get(i);
                Row.Builder row = new Row.Builder();
                row.setTitle("📍 " + m.location);
                row.setBrowsable(true);

                double dKm = m.distanceKm > 0 ? m.distanceKm : 0.0;
                Distance distance = Distance.create(dKm, Distance.UNIT_KILOMETERS);
                String distLabel = String.format(Locale.getDefault(), "%.1f km", dKm);
                SpannableString distSpan = new SpannableString(distLabel);
                distSpan.setSpan(DistanceSpan.create(distance), 0, distSpan.length(), Spanned.SPAN_INCLUSIVE_EXCLUSIVE);
                row.addText(distSpan);

                StringBuilder sub = new StringBuilder();
                if (m.odometer > 0) {
                    sub.append(String.format(Locale.getDefault(), "Odo: %.0f km", m.odometer));
                }
                if (m.distanceKm > 0) {
                    int etaMin = (int) Math.round((m.distanceKm / 75.0) * 60.0);
                    if (sub.length() > 0) sub.append(" • ");
                    sub.append(String.format(Locale.getDefault(), "~%d min", etaMin));
                } else if (m.notes != null && !m.notes.isEmpty()) {
                    if (sub.length() > 0) sub.append(" • ");
                    sub.append(m.notes);
                }
                if (sub.length() > 0) {
                    row.addText(sub.toString());
                }

                row.setOnClickListener(() -> {
                    AutoDataBridge.ensureCoordinates(getCarContext(), m);
                    getScreenManager().push(new NavigatorChooserScreen(getCarContext(), m));
                });

                listBuilder.addItem(row.build());
            }
        }

        return new ListTemplate.Builder()
                .setTitle("Tappe del Viaggio Attivo")
                .setHeaderAction(Action.BACK)
                .setSingleList(listBuilder.build())
                .build();
    }
}
`;
  fs.writeFileSync(path.join(javaDir, 'MovementsListScreen.java'), movementsListScreenJava, 'utf-8');

  // D2. CamperPlacesScreen.java (Senza ActionStrip superiore per non coprire il pannello sinistro)
  const camperPlacesScreenJava = `package com.ViaCamper.myapp.auto;

import android.location.Location;
import android.text.SpannableString;
import android.text.Spanned;
import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.CarColor;
import androidx.car.app.model.CarLocation;
import androidx.car.app.model.Distance;
import androidx.car.app.model.DistanceSpan;
import androidx.car.app.model.ItemList;
import androidx.car.app.model.Metadata;
import androidx.car.app.model.Place;
import androidx.car.app.model.PlaceListMapTemplate;
import androidx.car.app.model.PlaceMarker;
import androidx.car.app.model.Row;
import androidx.car.app.model.Template;
import java.util.List;
import java.util.Locale;

public class CamperPlacesScreen extends Screen {

    private final Location currentLocation;

    public CamperPlacesScreen(@NonNull CarContext carContext, Location loc) {
        super(carContext);
        this.currentLocation = loc;
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        Location activeLoc = AutoDataBridge.getBestLiveLocation(getCarContext());
        if (activeLoc == null) activeLoc = currentLocation;

        List<AutoDataBridge.CamperPlaceItem> places = AutoDataBridge.getNearbyCamperPlaces(getCarContext(), activeLoc);

        ItemList.Builder listBuilder = new ItemList.Builder();

        if (places.isEmpty()) {
            listBuilder.setNoItemsMessage("Nessuna area di sosta trovata nelle vicinanze");
        } else {
            int maxPlaces = Math.min(places.size(), 6);
            for (int i = 0; i < maxPlaces; i++) {
                AutoDataBridge.CamperPlaceItem p = places.get(i);
                Row.Builder row = new Row.Builder();
                row.setTitle("🚐 " + p.name);
                row.setBrowsable(true);

                double dKm = p.distanceKm > 0 ? p.distanceKm : 1.0;
                Distance distance = Distance.create(dKm, Distance.UNIT_KILOMETERS);
                String distLabel = String.format(Locale.getDefault(), "%.1f km", dKm);
                SpannableString distSpan = new SpannableString(distLabel);
                distSpan.setSpan(DistanceSpan.create(distance), 0, distSpan.length(), Spanned.SPAN_INCLUSIVE_EXCLUSIVE);
                row.addText(distSpan);

                if (p.type != null && !p.type.isEmpty()) {
                    row.addText(p.type);
                }

                if (p.lat != 0.0 && p.lng != 0.0) {
                    row.setMetadata(
                        new Metadata.Builder()
                            .setPlace(
                                new Place.Builder(CarLocation.create(p.lat, p.lng))
                                    .setMarker(new PlaceMarker.Builder().setColor(CarColor.YELLOW).build())
                                    .build()
                            )
                            .build()
                    );
                }

                AutoDataBridge.MovementItem m = new AutoDataBridge.MovementItem();
                m.id = p.id;
                m.location = p.name;
                m.lat = p.lat;
                m.lng = p.lng;
                m.distanceKm = p.distanceKm;

                row.setOnClickListener(() -> {
                    AutoDataBridge.ensureCoordinates(getCarContext(), m);
                    getScreenManager().push(new NavigatorChooserScreen(getCarContext(), m));
                });

                listBuilder.addItem(row.build());
            }
        }

        PlaceListMapTemplate.Builder builder = new PlaceListMapTemplate.Builder()
                .setTitle("Aree Sosta & Camper Service")
                .setHeaderAction(Action.BACK)
                .setItemList(listBuilder.build())
                .setCurrentLocationEnabled(true);

        if (activeLoc != null) {
            builder.setAnchor(new Place.Builder(CarLocation.create(activeLoc.getLatitude(), activeLoc.getLongitude())).build());
        }

        return builder.build();
    }
}
`;
  fs.writeFileSync(path.join(javaDir, 'CamperPlacesScreen.java'), camperPlacesScreenJava, 'utf-8');

  // E. NavigatorChooserScreen.java (Avvia ActiveCarNavigationScreen sull'autoradio + sincronizza con il telefono)
  const chooserJava = `package com.ViaCamper.myapp.auto;

import android.content.Intent;
import android.location.Location;
import android.net.Uri;
import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.CarToast;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.ItemList;
import androidx.car.app.model.ListTemplate;
import androidx.car.app.model.Row;
import androidx.car.app.model.Template;

public class NavigatorChooserScreen extends Screen {

    private final AutoDataBridge.MovementItem targetMovement;

    public NavigatorChooserScreen(@NonNull CarContext carContext, AutoDataBridge.MovementItem movement) {
        super(carContext);
        this.targetMovement = movement;
        Location liveLoc = AutoDataBridge.getBestLiveLocation(carContext);
        if (liveLoc != null) {
            CarSurfaceRenderer.getInstance(carContext).prefetchTilesAround(liveLoc.getLatitude(), liveLoc.getLongitude());
        }
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        ItemList.Builder listBuilder = new ItemList.Builder();

        // 1. Navigatore Camper Interno (Parte immediatamente sullo schermo dell'autoradio E sul telefono!)
        listBuilder.addItem(new Row.Builder()
                .setTitle("🛡️ Navigatore Camper Interno")
                .setBrowsable(true)
                .addText("Avvia guida turn-by-turn camper su autoradio e telefono")
                .setOnClickListener(() -> {
                    AutoDataBridge.ensureCoordinates(getCarContext(), targetMovement);
                    AutoDataBridge.saveTargetDestination(getCarContext(), targetMovement.location, targetMovement.lat, targetMovement.lng);

                    // Avvia anche sul telefono se l'app è aperta
                    try {
                        Intent launchIntent = getCarContext().getPackageManager().getLaunchIntentForPackage(getCarContext().getPackageName());
                        if (launchIntent != null) {
                            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                            launchIntent.putExtra("NAVIGATE_INTERNAL", true);
                            launchIntent.putExtra("DEST_NAME", targetMovement.location);
                            launchIntent.putExtra("DEST_LAT", targetMovement.lat);
                            launchIntent.putExtra("DEST_LNG", targetMovement.lng);
                            getCarContext().startActivity(launchIntent);
                        }
                    } catch (Exception ignored) {}

                    // Avvia subito la schermata di Navigazione Camper Interna direttamente sul display dell'autoradio!
                    Location startLoc = AutoDataBridge.getBestLiveLocation(getCarContext());
                    getScreenManager().push(new ActiveCarNavigationScreen(getCarContext(), targetMovement, startLoc));
                })
                .build());

        // 2. Google Maps
        listBuilder.addItem(new Row.Builder()
                .setTitle("🗺️ Google Maps")
                .setBrowsable(true)
                .addText("Traffico in tempo reale e percorsi alternativi")
                .setOnClickListener(() -> {
                    AutoDataBridge.ensureCoordinates(getCarContext(), targetMovement);
                    startNavigationIntent(getGoogleMapsUri());
                })
                .build());

        // 3. Waze
        listBuilder.addItem(new Row.Builder()
                .setTitle("🚙 Waze")
                .setBrowsable(true)
                .addText("Segnalazione autovelox, pericoli e community")
                .setOnClickListener(() -> {
                    AutoDataBridge.ensureCoordinates(getCarContext(), targetMovement);
                    startNavigationIntent(getWazeUri());
                })
                .build());

        // 4. Altra App (scelta di sistema)
        listBuilder.addItem(new Row.Builder()
                .setTitle("🧭 Altro Navigatore (Sygic, TomTom...)")
                .setBrowsable(true)
                .addText("Seleziona tra le altre app di navigazione installate")
                .setOnClickListener(() -> {
                    AutoDataBridge.ensureCoordinates(getCarContext(), targetMovement);
                    startNavigationIntent(getGenericGeoUri());
                })
                .build());

        return new ListTemplate.Builder()
                .setTitle("Naviga verso • " + targetMovement.location)
                .setHeaderAction(Action.BACK)
                .setSingleList(listBuilder.build())
                .build();
    }

    private String getGoogleMapsUri() {
        if (targetMovement.lat != 0.0 && targetMovement.lng != 0.0) {
            return "google.navigation:q=" + targetMovement.lat + "," + targetMovement.lng + "&mode=d";
        }
        return "google.navigation:q=" + Uri.encode(targetMovement.location) + "&mode=d";
    }

    private String getWazeUri() {
        if (targetMovement.lat != 0.0 && targetMovement.lng != 0.0) {
            return "waze://?ll=" + targetMovement.lat + "," + targetMovement.lng + "&navigate=yes";
        }
        return "waze://?q=" + Uri.encode(targetMovement.location) + "&navigate=yes";
    }

    private String getGenericGeoUri() {
        if (targetMovement.lat != 0.0 && targetMovement.lng != 0.0) {
            return "geo:" + targetMovement.lat + "," + targetMovement.lng + "?q=" + targetMovement.lat + "," + targetMovement.lng + "(" + Uri.encode(targetMovement.location) + ")";
        }
        return "geo:0,0?q=" + Uri.encode(targetMovement.location);
    }

    private void startNavigationIntent(String uriString) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(uriString));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                getCarContext().startCarApp(intent);
            } catch (Exception ex) {
                getCarContext().startActivity(intent);
            }
            CarToast.makeText(getCarContext(), "Avvio navigazione verso " + targetMovement.location, CarToast.LENGTH_SHORT).show();
            getScreenManager().popToRoot();
        } catch (Exception e) {
            try {
                Intent fallback = new Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q=" + Uri.encode(targetMovement.location)));
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getCarContext().startCarApp(fallback);
                getScreenManager().popToRoot();
            } catch (Exception ex) {
                CarToast.makeText(getCarContext(), "Nessuna app di navigazione esterna trovata", CarToast.LENGTH_LONG).show();
            }
        }
    }
}
`;
  fs.writeFileSync(path.join(javaDir, 'NavigatorChooserScreen.java'), chooserJava, 'utf-8');

  // E2. ActiveCarNavigationScreen.java (Vero Navigatore 3D Cockpit con NavigationTemplate + CarSurfaceRenderer + NavigationManager!)
  const activeNavJava = `package com.ViaCamper.myapp.auto;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.CarToast;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.ActionStrip;
import androidx.car.app.model.CarColor;
import androidx.car.app.model.CarIcon;
import androidx.car.app.model.DateTimeWithZone;
import androidx.car.app.model.Distance;
import androidx.car.app.model.Template;
import androidx.car.app.navigation.NavigationManager;
import androidx.car.app.navigation.NavigationManagerCallback;
import androidx.car.app.navigation.model.Destination;
import androidx.car.app.navigation.model.Maneuver;
import androidx.car.app.navigation.model.NavigationTemplate;
import androidx.car.app.navigation.model.RoutingInfo;
import androidx.car.app.navigation.model.Step;
import androidx.car.app.navigation.model.TravelEstimate;
import androidx.car.app.navigation.model.Trip;
import androidx.core.graphics.drawable.IconCompat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

/**
 * Navigatore Camper Interno 3D attivo direttamente sullo schermo di Android Auto:
 * - Utilizza NavigationTemplate ufficiale Android Auto con scheda di svolta compatta in alto a sinistra e barra ETA in basso.
 * - Disegna la mappa stradale in vera prospettiva 3D (52° inclinazione) e rotazione Heading-Up tramite CarSurfaceRenderer.
 * - Mostra il tracciato blu/ciano reale del percorso OSRM con frecce direzionali e tachimetro km/h.
 * - Legge ad alta voce le indicazioni stradali sull'impianto audio dell'auto.
 */
public class ActiveCarNavigationScreen extends Screen implements LocationListener {

    private final AutoDataBridge.MovementItem destination;
    private Location currentLocation;
    private LocationManager locationManager;
    private NavigationManager navigationManager;
    private final CarSurfaceRenderer surfaceRenderer;
    private boolean isListening = false;
    private boolean isStopped = false;

    private List<AutoDataBridge.RouteStepItem> routeSteps = new ArrayList<>();
    private List<double[]> routePolyline = new ArrayList<>();
    private int currentStepIndex = 0;
    private boolean isRouteLoading = true;
    private boolean announced300m = false;
    private boolean announced50m = false;
    private boolean announcedArrival = false;
    private long lastRouteCalcMillis = 0L;

    private TextToSpeech carTts;
    private boolean ttsReady = false;
    private String pendingInitialSpeech = null;
    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;

    private final Handler navHandler = new Handler(Looper.getMainLooper());
    private final Runnable gpsPollRunnable = new Runnable() {
        @Override
        public void run() {
            if (isStopped) return;
            try {
                Location fresh = AutoDataBridge.getBestLiveLocation(getCarContext());
                if (fresh != null) {
                    onLocationChanged(fresh);
                } else {
                    surfaceRenderer.requestRender();
                }
            } catch (Exception ignored) {}
            navHandler.postDelayed(this, 1000L);
        }
    };

    public ActiveCarNavigationScreen(@NonNull CarContext carContext, AutoDataBridge.MovementItem dest, Location startLoc) {
        super(carContext);
        this.destination = dest;
        this.currentLocation = (startLoc != null) ? startLoc : AutoDataBridge.getBestLiveLocation(carContext);
        this.surfaceRenderer = CarSurfaceRenderer.getInstance(carContext);
        this.surfaceRenderer.attachToCarContext(carContext);
        this.surfaceRenderer.startNavigationSession(
                this.currentLocation,
                dest.lat,
                dest.lng,
                dest.location
        );

        initNavigationManager();
        initCarVoice();
        startGPSUpdates();
        loadRouteAsync();
        navHandler.postDelayed(gpsPollRunnable, 1000L);
    }

    private void initNavigationManager() {
        try {
            navigationManager = getCarContext().getCarService(NavigationManager.class);
            if (navigationManager != null) {
                navigationManager.setNavigationManagerCallback(new NavigationManagerCallback() {
                    @Override
                    public void onStopNavigation() {
                        stopNavigationAndExit();
                    }

                    @Override
                    public void onAutoDriveEnabled() {}
                });
                navigationManager.navigationStarted();
            }
        } catch (Exception ignored) {}
    }

    private void initCarVoice() {
        try {
            audioManager = (AudioManager) getCarContext().getSystemService(Context.AUDIO_SERVICE);
            carTts = new TextToSpeech(getCarContext().getApplicationContext(), status -> {
                if (status == TextToSpeech.SUCCESS && carTts != null) {
                    int res = carTts.setLanguage(Locale.ITALIAN);
                    if (res == TextToSpeech.LANG_MISSING_DATA || res == TextToSpeech.LANG_NOT_SUPPORTED) {
                        carTts.setLanguage(Locale.getDefault());
                    }
                    AudioAttributes attrs = new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                            .build();
                    carTts.setAudioAttributes(attrs);
                    carTts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                        @Override
                        public void onStart(String utteranceId) {}

                        @Override
                        public void onDone(String utteranceId) {
                            abandonAudioFocus();
                        }

                        @Override
                        public void onError(String utteranceId) {
                            abandonAudioFocus();
                        }
                    });
                    ttsReady = true;
                    if (pendingInitialSpeech != null) {
                        String toSpeak = pendingInitialSpeech;
                        pendingInitialSpeech = null;
                        speakGuidance(toSpeak);
                    }
                }
            });
        } catch (Exception ignored) {}
    }

    private void speakGuidance(String text) {
        if (isStopped || text == null || text.trim().isEmpty()) return;
        if (!ttsReady || carTts == null) {
            pendingInitialSpeech = text;
            return;
        }
        try {
            if (audioManager != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    if (focusRequest == null) {
                        AudioAttributes attrs = new AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                                .build();
                        focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                                .setAudioAttributes(attrs)
                                .build();
                    }
                    audioManager.requestAudioFocus(focusRequest);
                } else {
                    audioManager.requestAudioFocus(null, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK);
                }
            }
            carTts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "auto_nav_" + System.currentTimeMillis());
        } catch (Exception ignored) {}
    }

    private void abandonAudioFocus() {
        try {
            if (audioManager == null) return;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && focusRequest != null) {
                audioManager.abandonAudioFocusRequest(focusRequest);
            } else {
                audioManager.abandonAudioFocus(null);
            }
        } catch (Exception ignored) {}
    }

    private void loadRouteAsync() {
        loadRouteAsync(true);
    }

    private void loadRouteAsync(final boolean announceStart) {
        isRouteLoading = true;
        lastRouteCalcMillis = System.currentTimeMillis();
        new Thread(() -> {
            AutoDataBridge.ensureCoordinates(getCarContext(), destination);
            double sLat = (currentLocation != null) ? currentLocation.getLatitude() : 41.9028;
            double sLng = (currentLocation != null) ? currentLocation.getLongitude() : 12.4964;
            double eLat = destination.lat != 0.0 ? destination.lat : sLat + 0.01;
            double eLng = destination.lng != 0.0 ? destination.lng : sLng + 0.01;

            AutoDataBridge.RouteData fetched = AutoDataBridge.fetchOsrmRouteData(sLat, sLng, eLat, eLng, destination.location);
            navHandler.post(() -> {
                if (isStopped) return;
                routeSteps = fetched.steps;
                routePolyline = fetched.polyline;
                currentStepIndex = 0;
                isRouteLoading = false;
                announced300m = false;
                announced50m = false;
                surfaceRenderer.setRouteData(routePolyline, routeSteps, currentStepIndex);
                String firstInstruction = !routeSteps.isEmpty() ? routeSteps.get(0).instruction : "";
                if (announceStart) {
                    speakGuidance("Avvio navigazione camper 3D verso " + destination.location + ". " + firstInstruction);
                } else if (!firstInstruction.isEmpty()) {
                    speakGuidance("Percorso aggiornato. " + firstInstruction);
                }
                invalidate();
            });
        }).start();
    }

    private synchronized void startGPSUpdates() {
        if (isListening) return;
        try {
            locationManager = (LocationManager) getCarContext().getSystemService(Context.LOCATION_SERVICE);
            if (locationManager != null) {
                Looper mainLooper = Looper.getMainLooper();
                String[] providers = new String[] { "fused", LocationManager.GPS_PROVIDER, LocationManager.PASSIVE_PROVIDER, LocationManager.NETWORK_PROVIDER };
                for (String provider : providers) {
                    try {
                        locationManager.requestLocationUpdates(provider, 700L, 0.5f, this, mainLooper);
                    } catch (Exception ignored) {}
                }
                isListening = true;
            }
        } catch (SecurityException ignored) {}
    }

    private void stopNavigationAndExit() {
        if (isStopped) return;
        isStopped = true;
        surfaceRenderer.stopNavigationSession();
        navHandler.removeCallbacksAndMessages(null);
        if (locationManager != null && isListening) {
            try { locationManager.removeUpdates(this); } catch (Exception ignored) {}
            isListening = false;
        }
        try {
            if (navigationManager != null) {
                navigationManager.navigationEnded();
            }
        } catch (Exception ignored) {}
        try {
            if (carTts != null) {
                carTts.stop();
                carTts.shutdown();
            }
            abandonAudioFocus();
        } catch (Exception ignored) {}
        getScreenManager().popToRoot();
    }

    @Override
    public void onLocationChanged(@NonNull Location location) {
        if (isStopped || location == null || (location.getLatitude() == 0.0 && location.getLongitude() == 0.0)) return;
        AutoDataBridge.updateLiveLocation(location);
        currentLocation = location;

        // Se il camper devia di oltre 65 metri dal tracciato calcolato, ricalcola automaticamente il percorso stradale!
        if (!isRouteLoading && routePolyline != null && routePolyline.size() >= 2) {
            float offRouteMeters = surfaceRenderer.getDistanceFromRouteMeters(location.getLatitude(), location.getLongitude());
            long now = System.currentTimeMillis();
            if (offRouteMeters > 65.0f && (now - lastRouteCalcMillis) > 12000L) {
                loadRouteAsync(false);
            }
        }

        if (!routeSteps.isEmpty() && currentStepIndex < routeSteps.size()) {
            AutoDataBridge.RouteStepItem step = routeSteps.get(currentStepIndex);
            float[] distToStep = new float[1];
            Location.distanceBetween(location.getLatitude(), location.getLongitude(), step.lat, step.lng, distToStep);
            double metersToStep = distToStep[0];
            step.distanceMeters = metersToStep;

            if (metersToStep <= 320.0 && metersToStep > 70.0 && !announced300m) {
                announced300m = true;
                speakGuidance("Tra " + (Math.round(metersToStep / 10.0) * 10) + " metri, " + step.instruction);
            } else if (metersToStep <= 55.0 && !announced50m) {
                announced50m = true;
                speakGuidance("Ora, " + step.instruction);
            }

            if (metersToStep <= 28.0 && currentStepIndex < routeSteps.size() - 1) {
                currentStepIndex++;
                announced300m = false;
                announced50m = false;
                AutoDataBridge.RouteStepItem nextStep = routeSteps.get(currentStepIndex);
                speakGuidance(nextStep.instruction);
            }
        }

        if (destination.lat != 0.0 && destination.lng != 0.0 && !announcedArrival) {
            float[] distToDest = new float[1];
            Location.distanceBetween(location.getLatitude(), location.getLongitude(), destination.lat, destination.lng, distToDest);
            if (distToDest[0] <= 45.0f) {
                announcedArrival = true;
                speakGuidance("Sei arrivato a destinazione: " + destination.location);
                CarToast.makeText(getCarContext(), "Arrivato a " + destination.location + "!", CarToast.LENGTH_LONG).show();
            }
        }

        surfaceRenderer.updateNavigationState(location, currentStepIndex);
        invalidate();
    }

    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {}

    @Override
    public void onProviderEnabled(@NonNull String provider) {}

    @Override
    public void onProviderDisabled(@NonNull String provider) {}

    private Maneuver buildCarManeuver(AutoDataBridge.RouteStepItem step) {
        String type = step != null && step.maneuverType != null ? step.maneuverType : "";
        String mod = step != null && step.maneuverModifier != null ? step.maneuverModifier : "";
        int exit = step != null ? step.roundaboutExit : 0;

        int mType = Maneuver.TYPE_STRAIGHT;
        if ("depart".equals(type)) {
            mType = Maneuver.TYPE_DEPART;
        } else if ("arrive".equals(type)) {
            mType = Maneuver.TYPE_DESTINATION;
        } else if ("roundabout".equals(type) || "rotary".equals(type) || "exit roundabout".equals(type)) {
            mType = Maneuver.TYPE_ROUNDABOUT_ENTER_AND_EXIT_CCW;
        } else if ("on ramp".equals(type)) {
            mType = mod.contains("left") ? Maneuver.TYPE_ON_RAMP_NORMAL_LEFT : Maneuver.TYPE_ON_RAMP_NORMAL_RIGHT;
        } else if ("off ramp".equals(type)) {
            mType = mod.contains("left") ? Maneuver.TYPE_OFF_RAMP_NORMAL_LEFT : Maneuver.TYPE_OFF_RAMP_NORMAL_RIGHT;
        } else if ("fork".equals(type)) {
            mType = mod.contains("left") ? Maneuver.TYPE_FORK_LEFT : Maneuver.TYPE_FORK_RIGHT;
        } else if ("merge".equals(type)) {
            mType = Maneuver.TYPE_MERGE_SIDE_UNSPECIFIED;
        } else if ("uturn".equals(mod)) {
            mType = Maneuver.TYPE_U_TURN_LEFT;
        } else if ("slight left".equals(mod)) {
            mType = Maneuver.TYPE_TURN_SLIGHT_LEFT;
        } else if ("sharp left".equals(mod)) {
            mType = Maneuver.TYPE_TURN_SHARP_LEFT;
        } else if ("left".equals(mod)) {
            mType = Maneuver.TYPE_TURN_NORMAL_LEFT;
        } else if ("slight right".equals(mod)) {
            mType = Maneuver.TYPE_TURN_SLIGHT_RIGHT;
        } else if ("sharp right".equals(mod)) {
            mType = Maneuver.TYPE_TURN_SHARP_RIGHT;
        } else if ("right".equals(mod)) {
            mType = Maneuver.TYPE_TURN_NORMAL_RIGHT;
        }

        Maneuver.Builder builder = new Maneuver.Builder(mType);
        if (mType == Maneuver.TYPE_ROUNDABOUT_ENTER_AND_EXIT_CCW) {
            builder.setRoundaboutExitNumber(Math.max(1, exit));
        }
        builder.setIcon(createManeuverIcon(type, mod));
        return builder.build();
    }

    private CarIcon createManeuverIcon(String type, String mod) {
        Bitmap bmp = Bitmap.createBitmap(96, 96, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(Color.WHITE);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(10.0f);
        p.setStrokeCap(Paint.Cap.ROUND);
        p.setStrokeJoin(Paint.Join.ROUND);

        Paint fillPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        fillPaint.setColor(Color.WHITE);
        fillPaint.setStyle(Paint.Style.FILL);

        if ("roundabout".equals(type) || "rotary".equals(type) || "exit roundabout".equals(type)) {
            c.drawCircle(48f, 52f, 22f, p);
            Path head = new Path();
            head.moveTo(48f, 8f);
            head.lineTo(34f, 26f);
            head.lineTo(62f, 26f);
            head.close();
            c.drawPath(head, fillPaint);
        } else if (mod != null && mod.contains("left")) {
            Path line = new Path();
            line.moveTo(58f, 82f);
            line.lineTo(58f, 44f);
            line.lineTo(26f, 44f);
            c.drawPath(line, p);
            Path head = new Path();
            head.moveTo(14f, 44f);
            head.lineTo(34f, 28f);
            head.lineTo(34f, 60f);
            head.close();
            c.drawPath(head, fillPaint);
        } else if (mod != null && mod.contains("right")) {
            Path line = new Path();
            line.moveTo(38f, 82f);
            line.lineTo(38f, 44f);
            line.lineTo(70f, 44f);
            c.drawPath(line, p);
            Path head = new Path();
            head.moveTo(82f, 44f);
            head.lineTo(62f, 28f);
            head.lineTo(62f, 60f);
            head.close();
            c.drawPath(head, fillPaint);
        } else {
            c.drawLine(48f, 82f, 48f, 28f, p);
            Path head = new Path();
            head.moveTo(48f, 12f);
            head.lineTo(30f, 34f);
            head.lineTo(66f, 34f);
            head.close();
            c.drawPath(head, fillPaint);
        }
        return new CarIcon.Builder(IconCompat.createWithBitmap(bmp)).build();
    }

    private CarIcon createActionBadgeIcon(String symbol, String bgHex) {
        Bitmap bmp = Bitmap.createBitmap(72, 72, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        Paint bg = new Paint(Paint.ANTI_ALIAS_FLAG);
        bg.setColor(Color.parseColor(bgHex));
        bg.setStyle(Paint.Style.FILL);
        c.drawCircle(36f, 36f, 32f, bg);

        Paint tp = new Paint(Paint.ANTI_ALIAS_FLAG);
        tp.setColor(Color.WHITE);
        tp.setTextSize(30f);
        tp.setFakeBoldText(true);
        float tw = tp.measureText(symbol);
        c.drawText(symbol, 36f - tw * 0.5f, 47f, tp);
        return new CarIcon.Builder(IconCompat.createWithBitmap(bmp)).build();
    }

    private Distance createAutoDistance(double meters) {
        double safeMeters = Math.max(0.0, meters);
        if (safeMeters < 1000.0) {
            int roundedMeters = (int) (Math.round(safeMeters / 10.0) * 10);
            return Distance.create(Math.max(10, roundedMeters), Distance.UNIT_METERS);
        }
        double km = safeMeters / 1000.0;
        return Distance.create(Math.round(km * 10.0) / 10.0, Distance.UNIT_KILOMETERS);
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        surfaceRenderer.attachToCarContext(getCarContext());
        Location activeLoc = (currentLocation != null) ? currentLocation : AutoDataBridge.getBestLiveLocation(getCarContext());

        double computedDistMeters = destination.distanceKm * 1000.0;
        if (activeLoc != null && destination.lat != 0.0 && destination.lng != 0.0) {
            float[] res = new float[1];
            Location.distanceBetween(activeLoc.getLatitude(), activeLoc.getLongitude(), destination.lat, destination.lng, res);
            computedDistMeters = res[0];
        }
        final double totalDistMeters = Math.max(50.0, computedDistMeters);
        final long remainingSeconds = Math.max(60L, Math.round((totalDistMeters / 1000.0) / 68.0 * 3600.0));

        AutoDataBridge.RouteStepItem activeStep = (!routeSteps.isEmpty() && currentStepIndex < routeSteps.size())
                ? routeSteps.get(currentStepIndex)
                : null;
        AutoDataBridge.RouteStepItem followingStep = (!routeSteps.isEmpty() && (currentStepIndex + 1) < routeSteps.size())
                ? routeSteps.get(currentStepIndex + 1)
                : null;

        String cueText = isRouteLoading
                ? ("Calcolo percorso 3D verso " + destination.location)
                : (activeStep != null && activeStep.instruction != null && !activeStep.instruction.isEmpty()
                        ? activeStep.instruction
                        : ("Procedi verso " + destination.location));
        String roadName = (activeStep != null && activeStep.roadName != null && !activeStep.roadName.isEmpty())
                ? activeStep.roadName
                : destination.location;
        double stepMeters = (activeStep != null && activeStep.distanceMeters > 0)
                ? activeStep.distanceMeters
                : totalDistMeters;

        Step.Builder currentStepBuilder = new Step.Builder(cueText)
                .setRoad(roadName)
                .setManeuver(buildCarManeuver(activeStep));

        RoutingInfo.Builder routingInfoBuilder = new RoutingInfo.Builder()
                .setCurrentStep(currentStepBuilder.build(), createAutoDistance(stepMeters));

        if (followingStep != null && followingStep.instruction != null && !followingStep.instruction.isEmpty()) {
            Step.Builder nextStepBuilder = new Step.Builder(followingStep.instruction)
                    .setManeuver(buildCarManeuver(followingStep));
            if (followingStep.roadName != null && !followingStep.roadName.isEmpty()) {
                nextStepBuilder.setRoad(followingStep.roadName);
            }
            routingInfoBuilder.setNextStep(nextStepBuilder.build());
        }

        DateTimeWithZone arrivalTime = DateTimeWithZone.create(
                System.currentTimeMillis() + (remainingSeconds * 1000L),
                TimeZone.getDefault()
        );
        TravelEstimate destEstimate = new TravelEstimate.Builder(
                createAutoDistance(totalDistMeters),
                arrivalTime
        )
                .setRemainingTimeSeconds(remainingSeconds)
                .setRemainingTimeColor(CarColor.GREEN)
                .setRemainingDistanceColor(CarColor.PRIMARY)
                .build();

        // Sincronizza anche il NavigationManager del cruscotto auto
        try {
            if (navigationManager != null && !isStopped) {
                Destination carDest = new Destination.Builder()
                        .setName(destination.location != null ? destination.location : "Destinazione Camper")
                        .build();
                TravelEstimate stepEstimate = new TravelEstimate.Builder(
                        createAutoDistance(stepMeters),
                        arrivalTime
                ).setRemainingTimeSeconds(Math.min(remainingSeconds, Math.max(10L, (long) (stepMeters / 15.0)))).build();
                Trip carTrip = new Trip.Builder()
                        .addDestination(carDest, destEstimate)
                        .addStep(currentStepBuilder.build(), stepEstimate)
                        .setLoading(false)
                        .build();
                navigationManager.updateTrip(carTrip);
            }
        } catch (Exception ignored) {}

        // ActionStrip principale: Voce, Toggle 3D/2D, Ricalcola, Termina
        ActionStrip.Builder actionStripBuilder = new ActionStrip.Builder();
        actionStripBuilder.addAction(
                new Action.Builder()
                        .setIcon(createActionBadgeIcon(surfaceRenderer.is3DPerspective() ? "3D" : "2D", "#0284C7"))
                        .setOnClickListener(() -> {
                            boolean now3D = surfaceRenderer.toggle3DPerspective();
                            CarToast.makeText(
                                    getCarContext(),
                                    now3D ? "Vista Navigatore 3D Prospettica attiva" : "Vista Mappa 2D dall'alto attiva",
                                    CarToast.LENGTH_SHORT
                            ).show();
                            invalidate();
                        })
                        .build()
        );
        actionStripBuilder.addAction(
                new Action.Builder()
                        .setIcon(createActionBadgeIcon("🔊", "#0F766E"))
                        .setOnClickListener(() -> speakGuidance(cueText))
                        .build()
        );
        actionStripBuilder.addAction(
                new Action.Builder()
                        .setIcon(createActionBadgeIcon("🔄", "#4F46E5"))
                        .setOnClickListener(this::loadRouteAsync)
                        .build()
        );
        actionStripBuilder.addAction(
                new Action.Builder()
                        .setTitle("Fine")
                        .setOnClickListener(this::stopNavigationAndExit)
                        .build()
        );

        // MapActionStrip laterale per Zoom +/-, Pan e Ricentra
        ActionStrip.Builder mapActionStripBuilder = new ActionStrip.Builder()
                .addAction(Action.PAN)
                .addAction(
                        new Action.Builder()
                                .setIcon(createActionBadgeIcon("+", "#1E293B"))
                                .setOnClickListener(surfaceRenderer::zoomIn)
                                .build()
                )
                .addAction(
                        new Action.Builder()
                                .setIcon(createActionBadgeIcon("-", "#1E293B"))
                                .setOnClickListener(surfaceRenderer::zoomOut)
                                .build()
                )
                .addAction(
                        new Action.Builder()
                                .setIcon(createActionBadgeIcon("🎯", "#0284C7"))
                                .setOnClickListener(surfaceRenderer::recenter)
                                .build()
                );

        surfaceRenderer.requestRender();

        try {
            return new NavigationTemplate.Builder()
                    .setNavigationInfo(routingInfoBuilder.build())
                    .setDestinationTravelEstimate(destEstimate)
                    .setActionStrip(actionStripBuilder.build())
                    .setMapActionStrip(mapActionStripBuilder.build())
                    .setBackgroundColor(CarColor.SECONDARY)
                    .build();
        } catch (Exception fallbackEx) {
            return new NavigationTemplate.Builder()
                    .setNavigationInfo(routingInfoBuilder.build())
                    .setDestinationTravelEstimate(destEstimate)
                    .setActionStrip(actionStripBuilder.build())
                    .build();
        }
    }
}
`;
  fs.writeFileSync(path.join(javaDir, 'ActiveCarNavigationScreen.java'), activeNavJava, 'utf-8');

  // F. AddFuelLogScreen.java
  const fuelScreenJava = `package com.ViaCamper.myapp.auto;

import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.CarToast;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.ItemList;
import androidx.car.app.model.ListTemplate;
import androidx.car.app.model.Row;
import androidx.car.app.model.Template;
import java.util.Locale;

public class AddFuelLogScreen extends Screen {

    private double currentOdometer = 0.0;
    private double selectedCost = 50.0;
    private double estimatedLiters = 28.0;
    private String selectedCompany = "Eni";

    public AddFuelLogScreen(@NonNull CarContext carContext) {
        super(carContext);
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        ItemList.Builder listBuilder = new ItemList.Builder();

        listBuilder.addItem(new Row.Builder()
                .setTitle("✅ CONFERMA E SALVA RIFORNIMENTO")
                .addText(String.format(Locale.getDefault(), "Importo: %.0f € • Litri: ~%.1f L • Distributore: %s", selectedCost, estimatedLiters, selectedCompany))
                .setOnClickListener(() -> {
                    boolean ok = AutoDataBridge.saveFuelLog(getCarContext(), currentOdometer, selectedCost, estimatedLiters, selectedCompany);
                    if (ok) {
                        CarToast.makeText(getCarContext(), "Rifornimento salvato nella Carta Carburante! ⛽", CarToast.LENGTH_LONG).show();
                        getScreenManager().pop();
                    } else {
                        CarToast.makeText(getCarContext(), "Errore nel salvataggio del rifornimento", CarToast.LENGTH_SHORT).show();
                    }
                })
                .build());

        listBuilder.addItem(new Row.Builder()
                .setTitle("💶 Importo Speso: " + String.format(Locale.getDefault(), "%.0f €", selectedCost))
                .addText("Tocca per ciclare tra 30€, 50€, 70€, 90€, 110€, 130€")
                .setOnClickListener(() -> {
                    if (selectedCost == 30.0) selectedCost = 50.0;
                    else if (selectedCost == 50.0) selectedCost = 70.0;
                    else if (selectedCost == 70.0) selectedCost = 90.0;
                    else if (selectedCost == 90.0) selectedCost = 110.0;
                    else if (selectedCost == 110.0) selectedCost = 130.0;
                    else selectedCost = 30.0;

                    estimatedLiters = Math.round((selectedCost / 1.78) * 10.0) / 10.0;
                    invalidate();
                })
                .build());

        listBuilder.addItem(new Row.Builder()
                .setTitle("⛽ Distributore: " + selectedCompany)
                .addText("Tocca per cambiare (Eni, Q8, IP, Tamoil, Esso, No-Logo)")
                .setOnClickListener(() -> {
                    if ("Eni".equals(selectedCompany)) selectedCompany = "Q8";
                    else if ("Q8".equals(selectedCompany)) selectedCompany = "IP";
                    else if ("IP".equals(selectedCompany)) selectedCompany = "Tamoil";
                    else if ("Tamoil".equals(selectedCompany)) selectedCompany = "Esso";
                    else if ("Esso".equals(selectedCompany)) selectedCompany = "Pompa Bianca";
                    else selectedCompany = "Eni";
                    invalidate();
                })
                .build());

        return new ListTemplate.Builder()
                .setTitle("Registra Rifornimento")
                .setHeaderAction(Action.BACK)
                .setSingleList(listBuilder.build())
                .build();
    }
}
`;
  fs.writeFileSync(path.join(javaDir, 'AddFuelLogScreen.java'), fuelScreenJava, 'utf-8');

  // G. AddMovementScreen.java
  const addMovementJava = `package com.ViaCamper.myapp.auto;

import android.location.Location;
import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.CarToast;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.ItemList;
import androidx.car.app.model.ListTemplate;
import androidx.car.app.model.Row;
import androidx.car.app.model.Template;
import java.util.Locale;

public class AddMovementScreen extends Screen {

    private final Location currentLocation;
    private double currentOdo = 0.0;

    public AddMovementScreen(@NonNull CarContext carContext, Location loc) {
        super(carContext);
        this.currentLocation = loc;
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        Location activeLoc = AutoDataBridge.getBestLiveLocation(getCarContext());
        if (activeLoc == null) activeLoc = currentLocation;
        final Location finalLoc = activeLoc;

        ItemList.Builder listBuilder = new ItemList.Builder();

        String locTitle = (finalLoc != null)
                ? String.format(Locale.getDefault(), "Tappa GPS (%.3f, %.3f)", finalLoc.getLatitude(), finalLoc.getLongitude())
                : "Tappa Corrente";

        listBuilder.addItem(new Row.Builder()
                .setTitle("✅ CONFERMA E REGISTRA SPOSTAMENTO")
                .addText("Salva la posizione attuale nel diario di viaggio attivo")
                .setOnClickListener(() -> {
                    boolean ok = AutoDataBridge.saveMovement(getCarContext(), locTitle, currentOdo, finalLoc);
                    if (ok) {
                        CarToast.makeText(getCarContext(), "Spostamento salvato con successo! 📍", CarToast.LENGTH_LONG).show();
                        getScreenManager().pop();
                    } else {
                        CarToast.makeText(getCarContext(), "Errore nel salvataggio dello spostamento", CarToast.LENGTH_SHORT).show();
                    }
                })
                .build());

        return new ListTemplate.Builder()
                .setTitle("Registra Spostamento")
                .setHeaderAction(Action.BACK)
                .setSingleList(listBuilder.build())
                .build();
    }
}
`;
  fs.writeFileSync(path.join(javaDir, 'AddMovementScreen.java'), addMovementJava, 'utf-8');

  // G1. WeatherAlertMonitor.java (Motore nativo Android per controllo allerte meteo e invio notifiche push ad app chiusa / in tasca)
  const weatherAlertMonitorJava = `package com.ViaCamper.myapp.auto;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.job.JobInfo;
import android.app.job.JobScheduler;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.location.Location;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import com.ViaCamper.myapp.MainActivity;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public class WeatherAlertMonitor {

    public static final String CHANNEL_ID = "viacamper_weather_emergency_v2";
    public static final String ACTION_CHECK = "com.ViaCamper.myapp.ACTION_WEATHER_ALERT_CHECK";
    public static final String ACTION_DELAYED_PUSH = "com.ViaCamper.myapp.ACTION_DELAYED_WEATHER_PUSH";
    private static final String PREFS_NAME = "CapacitorStorage";
    private static final String NOTIFIED_IDS_KEY = "camper_notified_weather_alert_ids";
    private static final String DISMISSED_IDS_KEY = "camper_dismissed_weather_alerts";
    private static final String FIRESTORE_RUN_QUERY_URL =
        "https://firestore.googleapis.com/v1/projects/calm-light-fg02f/databases/ai-studio-camperlifeapp-fbcd1f6d-679b-4649-8f91-6a9b5a40d0b9/documents:runQuery?key=AIzaSyBrLUDywyD1lgs6WyS1fd6dvegBjExJxTM";

    private static final int JOB_ID_PERIODIC = 7701;
    private static final int JOB_ID_FAST = 7702;

    public static void ensureNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm == null) return;

                Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                AudioAttributes audioAttrs = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build();

                NotificationChannel emergencyChannel = new NotificationChannel(
                        CHANNEL_ID,
                        "Allerte Meteo & Emergenze Camper 🚨",
                        NotificationManager.IMPORTANCE_HIGH
                );
                emergencyChannel.setDescription("Avvisi immediati per grandine, vento forte e temporali anche ad app chiusa");
                emergencyChannel.enableVibration(true);
                emergencyChannel.setVibrationPattern(new long[]{0, 600, 250, 600, 250, 800});
                emergencyChannel.enableLights(true);
                emergencyChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                emergencyChannel.setBypassDnd(true);
                if (soundUri != null) {
                    emergencyChannel.setSound(soundUri, audioAttrs);
                }
                nm.createNotificationChannel(emergencyChannel);

                // Crea anche il canale weather_alert_channel per piena compatibilità
                NotificationChannel legacyChannel = new NotificationChannel(
                        "weather_alert_channel",
                        "Allerte Meteo ViaCamper ⚡",
                        NotificationManager.IMPORTANCE_HIGH
                );
                legacyChannel.enableVibration(true);
                legacyChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                if (soundUri != null) {
                    legacyChannel.setSound(soundUri, audioAttrs);
                }
                nm.createNotificationChannel(legacyChannel);

                // Crea anche il canale fcm_default_channel per tutte le notifiche generali (community, eventi, approvazioni, promo)
                NotificationChannel fcmChannel = new NotificationChannel(
                        "fcm_default_channel",
                        "Notifiche Generali ViaCamper",
                        NotificationManager.IMPORTANCE_HIGH
                );
                fcmChannel.setDescription("Notifiche istantanee per approvazioni, eventi, bacheca e consigli di bordo ad app chiusa");
                fcmChannel.enableVibration(true);
                fcmChannel.enableLights(true);
                fcmChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                if (soundUri != null) {
                    fcmChannel.setSound(soundUri, audioAttrs);
                }
                nm.createNotificationChannel(fcmChannel);
            } catch (Exception ignored) {}
        }
    }

    public static void saveLastKnownLocation(Context context, double lat, double lng) {
        if (lat == 0.0 && lng == 0.0) return;
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit()
                    .putString("camper_last_lat", String.valueOf(lat))
                    .putString("camper_last_lng", String.valueOf(lng))
                    .putLong("camper_last_loc_time", System.currentTimeMillis())
                    .apply();
        } catch (Exception ignored) {}
    }

    public static double[] getCamperLocation(Context context) {
        try {
            Location live = AutoDataBridge.getBestLiveLocation(context);
            if (live != null && (live.getLatitude() != 0.0 || live.getLongitude() != 0.0)) {
                saveLastKnownLocation(context, live.getLatitude(), live.getLongitude());
                return new double[]{live.getLatitude(), live.getLongitude()};
            }
        } catch (Exception ignored) {}

        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String latStr = prefs.getString("camper_last_lat", null);
            String lngStr = prefs.getString("camper_last_lng", null);
            if (latStr != null && lngStr != null) {
                double lat = Double.parseDouble(latStr);
                double lng = Double.parseDouble(lngStr);
                if (lat != 0.0 || lng != 0.0) {
                    return new double[]{lat, lng};
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    public static synchronized boolean isAlertNotified(Context context, String alertId) {
        if (alertId == null || alertId.isEmpty()) return false;
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String raw = prefs.getString(NOTIFIED_IDS_KEY, "[]");
            JSONArray arr = new JSONArray(raw);
            for (int i = 0; i < arr.length(); i++) {
                if (alertId.equals(arr.optString(i))) return true;
            }
        } catch (Exception ignored) {}
        return false;
    }

    public static synchronized void markAlertNotified(Context context, String alertId) {
        if (alertId == null || alertId.isEmpty()) return;
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String raw = prefs.getString(NOTIFIED_IDS_KEY, "[]");
            JSONArray arr;
            try {
                arr = new JSONArray(raw);
            } catch (Exception e) {
                arr = new JSONArray();
            }
            for (int i = 0; i < arr.length(); i++) {
                if (alertId.equals(arr.optString(i))) return;
            }
            JSONArray next = new JSONArray();
            int start = Math.max(0, arr.length() - 80);
            for (int i = start; i < arr.length(); i++) {
                next.put(arr.optString(i));
            }
            next.put(alertId);
            prefs.edit().putString(NOTIFIED_IDS_KEY, next.toString()).apply();
        } catch (Exception ignored) {}
    }

    public static synchronized boolean isAlertDismissed(Context context, String alertId) {
        if (alertId == null || alertId.isEmpty()) return false;
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String raw = prefs.getString(DISMISSED_IDS_KEY, "[]");
            JSONArray arr = new JSONArray(raw);
            for (int i = 0; i < arr.length(); i++) {
                if (alertId.equals(arr.optString(i))) return true;
            }
        } catch (Exception ignored) {}
        return false;
    }

    public static synchronized void markAlertDismissed(Context context, String alertId) {
        if (alertId == null || alertId.isEmpty()) return;
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String raw = prefs.getString(DISMISSED_IDS_KEY, "[]");
            JSONArray arr;
            try {
                arr = new JSONArray(raw);
            } catch (Exception e) {
                arr = new JSONArray();
            }
            for (int i = 0; i < arr.length(); i++) {
                if (alertId.equals(arr.optString(i))) return;
            }
            arr.put(alertId);
            prefs.edit().putString(DISMISSED_IDS_KEY, arr.toString()).apply();
        } catch (Exception ignored) {}
    }

    public static void showWeatherPushNotification(Context context, String title, String body, String alertId) {
        try {
            ensureNotificationChannel(context);
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            // Risveglia brevemente il dispositivo per garantire suono e vibrazione anche in tasca
            try {
                PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    PowerManager.WakeLock wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ViaCamper:WeatherNotifWake");
                    wl.acquire(5000L);
                }
            } catch (Exception ignored) {}

            Intent openIntent = new Intent(context, MainActivity.class);
            openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            openIntent.putExtra("OPEN_WEATHER_RADAR", true);
            openIntent.putExtra("WEATHER_ALERT_ID", alertId != null ? alertId : "");

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            int notifId = (alertId != null && !alertId.isEmpty())
                    ? (Math.abs(alertId.hashCode()) % 90000 + 10000)
                    : (int) (System.currentTimeMillis() % 90000 + 10000);

            PendingIntent pendingIntent = PendingIntent.getActivity(context, notifId, openIntent, flags);

            int iconRes = context.getApplicationInfo().icon;
            if (iconRes == 0) {
                iconRes = android.R.drawable.ic_dialog_alert;
            }

            Notification.Builder builder;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                builder = new Notification.Builder(context, CHANNEL_ID);
            } else {
                builder = new Notification.Builder(context);
                builder.setPriority(Notification.PRIORITY_MAX);
                builder.setDefaults(Notification.DEFAULT_ALL);
            }

            builder.setSmallIcon(iconRes)
                    .setContentTitle(title != null ? title : "⚠️ Allerta Meteo Camper")
                    .setContentText(body != null ? body : "Attenzione: condizioni meteo avverse rilevate nella tua area.")
                    .setStyle(new Notification.BigTextStyle()
                            .bigText(body != null ? body : "")
                            .setBigContentTitle(title != null ? title : "⚠️ Allerta Meteo Camper"))
                    .setAutoCancel(true)
                    .setContentIntent(pendingIntent);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                builder.setVisibility(Notification.VISIBILITY_PUBLIC);
                builder.setCategory(Notification.CATEGORY_ALARM);
            }

            nm.notify(notifId, builder.build());
        } catch (Exception ignored) {}
    }

    public static void scheduleBackgroundChecks(Context context, long delayMs) {
        long safeDelay = Math.max(5000L, delayMs);

        // 1. AlarmManager (setExactAndAllowWhileIdle per funzionare anche in Doze Mode a schermo spento in tasca)
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am != null) {
                Intent intent = new Intent(context, WeatherAlertReceiver.class);
                intent.setAction(ACTION_CHECK);
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    flags |= PendingIntent.FLAG_IMMUTABLE;
                }
                PendingIntent pi = PendingIntent.getBroadcast(context, 7700, intent, flags);
                long triggerAt = System.currentTimeMillis() + safeDelay;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    try {
                        am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                    } catch (SecurityException se) {
                        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                    }
                } else {
                    am.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                }
            }
        } catch (Exception ignored) {}

        // 2. JobScheduler (JobService nativo persistente con overrideDeadline garantita dall'OS)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            try {
                JobScheduler js = (JobScheduler) context.getSystemService(Context.JOB_SCHEDULER_SERVICE);
                if (js != null) {
                    ComponentName serviceComponent = new ComponentName(context, WeatherAlertJobService.class);

                    JobInfo.Builder fastBuilder = new JobInfo.Builder(JOB_ID_FAST, serviceComponent)
                            .setMinimumLatency(safeDelay)
                            .setOverrideDeadline(safeDelay + 25000L)
                            .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                            .setPersisted(true);
                    js.schedule(fastBuilder.build());

                    boolean hasPeriodic = false;
                    for (JobInfo ji : js.getAllPendingJobs()) {
                        if (ji.getId() == JOB_ID_PERIODIC) {
                            hasPeriodic = true;
                            break;
                        }
                    }
                    if (!hasPeriodic) {
                        JobInfo.Builder periodicBuilder = new JobInfo.Builder(JOB_ID_PERIODIC, serviceComponent)
                                .setPeriodic(15 * 60 * 1000L)
                                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                                .setPersisted(true);
                        js.schedule(periodicBuilder.build());
                    }
                }
            } catch (Exception ignored) {}
        }
    }

    public static void scheduleDelayedPushNotification(Context context, String title, String body, String alertId, long delayMs) {
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;

            Intent intent = new Intent(context, WeatherAlertReceiver.class);
            intent.setAction(ACTION_DELAYED_PUSH);
            intent.putExtra("EXTRA_TITLE", title);
            intent.putExtra("EXTRA_BODY", body);
            intent.putExtra("EXTRA_ALERT_ID", alertId);

            int reqCode = (alertId != null) ? (Math.abs(alertId.hashCode()) % 50000 + 20000) : 20001;
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pi = PendingIntent.getBroadcast(context, reqCode, intent, flags);
            long triggerAt = System.currentTimeMillis() + Math.max(1000L, delayMs);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                try {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                } catch (SecurityException se) {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                }
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
            }
        } catch (Exception ignored) {}
    }

    private static double extractFirestoreDouble(JSONObject fieldObj) {
        if (fieldObj == null) return 0.0;
        if (fieldObj.has("doubleValue")) return fieldObj.optDouble("doubleValue", 0.0);
        if (fieldObj.has("integerValue")) {
            try {
                return Double.parseDouble(fieldObj.optString("integerValue", "0"));
            } catch (Exception ignored) {}
        }
        if (fieldObj.has("stringValue")) {
            try {
                return Double.parseDouble(fieldObj.optString("stringValue", "0"));
            } catch (Exception ignored) {}
        }
        return 0.0;
    }

    private static boolean isIsoTimestampFuture(String isoStr) {
        if (isoStr == null || isoStr.isEmpty()) return true;
        try {
            String clean = isoStr.replace("Z", "");
            if (clean.contains(".")) {
                clean = clean.substring(0, clean.indexOf('.'));
            }
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US);
            sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
            Date parsed = sdf.parse(clean);
            if (parsed != null) {
                return parsed.getTime() > System.currentTimeMillis();
            }
        } catch (Exception ignored) {}
        return true;
    }

    public static void showAdminPushNotification(Context context, String title, String body, String notifId) {
        try {
            ensureNotificationChannel(context);
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            try {
                PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    PowerManager.WakeLock wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ViaCamper:AdminNotifWake");
                    wl.acquire(5000L);
                }
            } catch (Exception ignored) {}

            Intent openIntent = new Intent(context, MainActivity.class);
            openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            openIntent.putExtra("NAVIGATE_TO", "admin_users");

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            int idNum = (notifId != null && !notifId.isEmpty())
                    ? (Math.abs(notifId.hashCode()) % 90000 + 10000)
                    : (int) (System.currentTimeMillis() % 90000 + 10000);

            PendingIntent pendingIntent = PendingIntent.getActivity(context, idNum, openIntent, flags);

            int iconRes = context.getApplicationInfo().icon;
            if (iconRes == 0) {
                iconRes = android.R.drawable.ic_dialog_info;
            }

            Notification.Builder builder;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                builder = new Notification.Builder(context, "fcm_default_channel");
            } else {
                builder = new Notification.Builder(context);
                builder.setPriority(Notification.PRIORITY_MAX);
                builder.setDefaults(Notification.DEFAULT_ALL);
            }

            builder.setSmallIcon(iconRes)
                    .setContentTitle(title != null ? title : "Richiesta Iscrizione Utente")
                    .setContentText(body != null ? body : "Nuovo utente in attesa di approvazione.")
                    .setStyle(new Notification.BigTextStyle()
                            .bigText(body != null ? body : "")
                            .setBigContentTitle(title != null ? title : "Richiesta Iscrizione Utente"))
                    .setAutoCancel(true)
                    .setContentIntent(pendingIntent);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                builder.setVisibility(Notification.VISIBILITY_PUBLIC);
                builder.setCategory(Notification.CATEGORY_STATUS);
            }

            nm.notify(idNum, builder.build());
        } catch (Exception ignored) {}
    }

    private static void checkFirestoreAdminNotifications(Context context) {
        HttpURLConnection conn = null;
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String userEmail = prefs.getString("camper_user_email", "");
            if (userEmail == null || userEmail.isEmpty()) {
                userEmail = prefs.getString("user_email", "");
            }
            if (userEmail == null) userEmail = "";
            userEmail = userEmail.toLowerCase().trim();

            boolean isAdmin = userEmail.isEmpty() ||
                              userEmail.contains("sambucci") ||
                              userEmail.contains("viacamper") ||
                              prefs.getBoolean("camper_is_moderator", false) ||
                              prefs.getBoolean("camper_is_admin", false);

            if (!isAdmin) return;

            URL url = new URL(FIRESTORE_RUN_QUERY_URL);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
            conn.setConnectTimeout(7000);
            conn.setReadTimeout(7000);
            conn.setDoOutput(true);

            String payload = "{~structuredQuery~:{~from~:[{~collectionId~:~adminNotifications~}],~limit~:15}}".replace('~', '"');
            try (OutputStream os = conn.getOutputStream()) {
                os.write(payload.getBytes(StandardCharsets.UTF_8));
            }

            if (conn.getResponseCode() == 200) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) sb.append(line);
                reader.close();

                JSONArray results = new JSONArray(sb.toString());
                for (int i = 0; i < results.length(); i++) {
                    JSONObject row = results.optJSONObject(i);
                    if (row == null || !row.has("document")) continue;
                    JSONObject doc = row.optJSONObject("document");
                    if (doc == null) continue;
                    JSONObject fields = doc.optJSONObject("fields");
                    if (fields == null) continue;

                    String docName = doc.optString("name", "");
                    String fallbackId = docName.contains("/") ? docName.substring(docName.lastIndexOf('/') + 1) : "";
                    String notifId = "admin_notif_" + fallbackId;
                    if (fallbackId.isEmpty() || isAlertNotified(context, notifId)) continue;

                    JSONObject readObj = fields.optJSONObject("read");
                    boolean isRead = readObj != null && readObj.optBoolean("booleanValue", false);
                    if (isRead) continue;

                    JSONObject titleObj = fields.optJSONObject("title");
                    String title = (titleObj != null) ? titleObj.optString("stringValue", "Richiesta Iscrizione Utente") : "Richiesta Iscrizione Utente";
                    JSONObject bodyObj = fields.optJSONObject("body");
                    String body = (bodyObj != null) ? bodyObj.optString("stringValue", "Nuovo camperista in attesa di approvazione.") : "Nuovo camperista in attesa di approvazione.";

                    markAlertNotified(context, notifId);
                    showAdminPushNotification(context, title, body, notifId);
                }
            }
        } catch (Exception ignored) {
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private static void checkFirestoreEmergencySos(Context context) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(FIRESTORE_RUN_QUERY_URL);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
            conn.setConnectTimeout(7000);
            conn.setReadTimeout(7000);
            conn.setDoOutput(true);

            String payload = "{~structuredQuery~:{~from~:[{~collectionId~:~communityMessages~}],~where~:{~fieldFilter~:{~field~:{~fieldPath~:~tag~},~op~:~EQUAL~,~value~:{~stringValue~:~SOS~}}},~limit~:5}}".replace('~', '"');
            try (OutputStream os = conn.getOutputStream()) {
                os.write(payload.getBytes(StandardCharsets.UTF_8));
            }

            if (conn.getResponseCode() == 200) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) sb.append(line);
                reader.close();

                JSONArray results = new JSONArray(sb.toString());
                for (int i = 0; i < results.length(); i++) {
                    JSONObject row = results.optJSONObject(i);
                    if (row == null || !row.has("document")) continue;
                    JSONObject doc = row.optJSONObject("document");
                    if (doc == null) continue;
                    JSONObject fields = doc.optJSONObject("fields");
                    if (fields == null) continue;

                    JSONObject isResolvedObj = fields.optJSONObject("isResolved");
                    boolean isResolved = isResolvedObj != null && isResolvedObj.optBoolean("booleanValue", false);
                    if (isResolved) continue;

                    String docName = doc.optString("name", "");
                    String fallbackId = docName.contains("/") ? docName.substring(docName.lastIndexOf('/') + 1) : "";
                    String sosId = "sos_" + fallbackId;
                    if (fallbackId.isEmpty() || isAlertNotified(context, sosId)) continue;

                    JSONObject userObj = fields.optJSONObject("user");
                    String user = (userObj != null) ? userObj.optString("stringValue", "Camperista") : "Camperista";
                    JSONObject textObj = fields.optJSONObject("text");
                    String text = (textObj != null) ? textObj.optString("stringValue", "Richiesta di aiuto o emergenza in corso.") : "Richiesta di aiuto o emergenza in corso.";

                    markAlertNotified(context, sosId);
                    showWeatherPushNotification(context, "🚨 S.O.S. ViaCamper da " + user, text, sosId);
                }
            }
        } catch (Exception ignored) {
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    public static void checkWeatherAlertsSynchronously(Context context) {
        try {
            // Controlla sempre le Notifiche Amministratore (anche senza GPS e ad app chiusa)
            checkFirestoreAdminNotifications(context);

            // Controlla emergenze S.O.S. per tutti i camperisti
            checkFirestoreEmergencySos(context);

            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            boolean enabled = prefs.getBoolean("camper_weather_alerts_enabled", true);
            if (!enabled) return;

            double[] coords = getCamperLocation(context);
            if (coords == null) return;
            final double userLat = coords[0];
            final double userLng = coords[1];

            // 1. Controlla le Segnalazioni Allerte Meteo dei Camperisti (Firestore REST API diretta)
            checkFirestoreCommunityAlerts(context, userLat, userLng);

            // 2. Controlla il Bollettino Ufficiale Open-Meteo / MeteoAlarm (ogni 5 minuti in background)
            long now = System.currentTimeMillis();
            long lastMeteoCheck = prefs.getLong("camper_last_openmeteo_bg_check", 0L);
            if (now - lastMeteoCheck >= 5 * 60 * 1000L) {
                prefs.edit().putLong("camper_last_openmeteo_bg_check", now).apply();
                checkOpenMeteoSevereWeather(context, userLat, userLng);
            }
        } catch (Exception ignored) {}
    }

    private static void checkFirestoreCommunityAlerts(Context context, double userLat, double userLng) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(FIRESTORE_RUN_QUERY_URL);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
            conn.setConnectTimeout(7000);
            conn.setReadTimeout(7000);
            conn.setDoOutput(true);

            String payload = "{~structuredQuery~:{~from~:[{~collectionId~:~community_weather_alerts~}],~limit~:35}}".replace('~', '"');
            try (OutputStream os = conn.getOutputStream()) {
                os.write(payload.getBytes(StandardCharsets.UTF_8));
            }

            if (conn.getResponseCode() == 200) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) sb.append(line);
                reader.close();

                JSONArray results = new JSONArray(sb.toString());
                for (int i = 0; i < results.length(); i++) {
                    JSONObject row = results.optJSONObject(i);
                    if (row == null || !row.has("document")) continue;
                    JSONObject doc = row.optJSONObject("document");
                    if (doc == null) continue;
                    JSONObject fields = doc.optJSONObject("fields");
                    if (fields == null) continue;

                    String docName = doc.optString("name", "");
                    String fallbackId = docName.contains("/") ? docName.substring(docName.lastIndexOf('/') + 1) : "";
                    JSONObject idObj = fields.optJSONObject("id");
                    String alertId = (idObj != null) ? idObj.optString("stringValue", fallbackId) : fallbackId;
                    if (alertId == null || alertId.isEmpty()) continue;

                    JSONObject expObj = fields.optJSONObject("expiresAt");
                    String expiresAt = (expObj != null) ? expObj.optString("stringValue", "") : "";
                    if (!isIsoTimestampFuture(expiresAt)) continue;

                    double alertLat = extractFirestoreDouble(fields.optJSONObject("lat"));
                    double alertLng = extractFirestoreDouble(fields.optJSONObject("lng"));
                    if (alertLat == 0.0 && alertLng == 0.0) continue;

                    float[] distRes = new float[1];
                    Location.distanceBetween(userLat, userLng, alertLat, alertLng, distRes);
                    float distKm = distRes[0] / 1000.0f;

                    // Avvisa se l'allerta è entro 30 km dalla posizione del camper
                    if (distKm <= 30.0f && !isAlertNotified(context, alertId) && !isAlertDismissed(context, alertId)) {
                        markAlertNotified(context, alertId);

                        JSONObject typeObj = fields.optJSONObject("type");
                        String type = (typeObj != null) ? typeObj.optString("stringValue", "storm") : "storm";
                        JSONObject titleObj = fields.optJSONObject("title");
                        String rawTitle = (titleObj != null) ? titleObj.optString("stringValue", "Allerta Meteo") : "Allerta Meteo";
                        JSONObject descObj = fields.optJSONObject("description");
                        String rawDesc = (descObj != null) ? descObj.optString("stringValue", "Segnalazione di pericolo meteo vicino a te.") : "Segnalazione di pericolo meteo vicino a te.";

                        String emoji = "⚡";
                        String advice = "Presta attenzione a sottopassi, torrenti e alberi lungo il percorso.";
                        if ("hail".equals(type)) {
                            emoji = "🧊";
                            advice = "Chiudi subito tutti gli oblò sul tetto e proteggi il camper.";
                        } else if ("wind".equals(type)) {
                            emoji = "💨";
                            advice = "Riavvolgi subito il tendalino e chiudi le finestre a compasso.";
                        } else if ("flood".equals(type)) {
                            emoji = "🌊";
                            advice = "Allontanati da corsi d'acqua, sottopassi e zone a rischio allagamento.";
                        } else if ("snow".equals(type)) {
                            emoji = "❄️";
                            advice = "Possibile ghiaccio o neve sulla carreggiata. Verifica catene o pneumatici invernali.";
                        }

                        String notifTitle = String.format(Locale.ITALIAN, "%s %s (a %.1f km)", emoji, rawTitle, distKm);
                        String notifBody = rawDesc + "\\n\\uD83D\\uDEE1 Consiglio Camper: " + advice;
                        showWeatherPushNotification(context, notifTitle, notifBody, alertId);
                    }
                }
            }
        } catch (Exception ignored) {
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private static void checkOpenMeteoSevereWeather(Context context, double userLat, double userLng) {
        HttpURLConnection conn = null;
        try {
            String apiUrl = String.format(
                    Locale.US,
                    "https://api.open-meteo.com/v1/forecast?latitude=%.4f&longitude=%.4f&current=weather_code,wind_speed_10m,wind_gusts_10m,precipitation&hourly=weather_code,wind_gusts_10m,precipitation&timezone=auto&forecast_days=1",
                    userLat,
                    userLng
            );
            URL url = new URL(apiUrl);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(7000);
            conn.setReadTimeout(7000);

            if (conn.getResponseCode() == 200) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) sb.append(line);
                reader.close();

                JSONObject root = new JSONObject(sb.toString());
                JSONObject current = root.optJSONObject("current");
                if (current == null) return;

                int currentCode = current.optInt("weather_code", 0);
                double currentGusts = current.optDouble("wind_gusts_10m", current.optDouble("wind_speed_10m", 0.0));
                double currentPrecip = current.optDouble("precipitation", 0.0);

                double maxGustNext12h = currentGusts;
                double maxPrecipNext12h = currentPrecip;
                boolean hasHail = (currentCode == 96 || currentCode == 99);
                boolean hasStorm = (currentCode == 95 || currentCode == 96 || currentCode == 99);

                JSONObject hourly = root.optJSONObject("hourly");
                if (hourly != null) {
                    JSONArray codes = hourly.optJSONArray("weather_code");
                    JSONArray gusts = hourly.optJSONArray("wind_gusts_10m");
                    JSONArray precips = hourly.optJSONArray("precipitation");
                    int nowHour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY);
                    int totalHours = (codes != null) ? codes.length() : 0;
                    int endHour = Math.min(nowHour + 12, totalHours);
                    for (int h = nowHour; h < endHour; h++) {
                        int c = (codes != null) ? codes.optInt(h, 0) : 0;
                        double g = (gusts != null) ? gusts.optDouble(h, 0.0) : 0.0;
                        double p = (precips != null) ? precips.optDouble(h, 0.0) : 0.0;
                        if (g > maxGustNext12h) maxGustNext12h = g;
                        if (p > maxPrecipNext12h) maxPrecipNext12h = p;
                        if (c == 96 || c == 99) hasHail = true;
                        if (c == 95 || c == 96 || c == 99) hasStorm = true;
                    }
                }

                String dateStr = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());

                if (hasHail) {
                    String hailId = "meteoalarm-hail-" + dateStr;
                    if (!isAlertNotified(context, hailId) && !isAlertDismissed(context, hailId)) {
                        markAlertNotified(context, hailId);
                        showWeatherPushNotification(
                                context,
                                "🧊 ALLERTA GRANDINE E TEMPORALE!",
                                "Celle temporalesche con elevato rischio grandine nella tua zona. Chiudi subito tutti gli oblò sul tetto e metti in sicurezza il camper!",
                                hailId
                        );
                    }
                }

                if (maxGustNext12h >= 55.0) {
                    String windId = "meteoalarm-wind-" + dateStr;
                    if (!isAlertNotified(context, windId) && !isAlertDismissed(context, windId)) {
                        markAlertNotified(context, windId);
                        showWeatherPushNotification(
                                context,
                                String.format(Locale.ITALIAN, "💨 ALLERTA VENTO FORTE (%.0f km/h)!", maxGustNext12h),
                                String.format(Locale.ITALIAN, "Previste raffiche di vento fino a %.0f km/h. Riavvolgi subito il tendalino e chiudi le finestre a compasso del camper!", maxGustNext12h),
                                windId
                        );
                    }
                }

                if (hasStorm && !hasHail) {
                    String stormId = "meteoalarm-storm-" + dateStr;
                    if (!isAlertNotified(context, stormId) && !isAlertDismissed(context, stormId)) {
                        markAlertNotified(context, stormId);
                        showWeatherPushNotification(
                                context,
                                "⚡ ALLERTA FORTI TEMPORALI!",
                                "Temporali e rovesci intensi previsti nella tua zona. Evita la sosta vicino ad alberi, torrenti o sottopassi a rischio allagamento.",
                                stormId
                        );
                    }
                }
            }
        } catch (Exception ignored) {
        } finally {
            if (conn != null) conn.disconnect();
        }
    }
}
`;
  fs.writeFileSync(path.join(javaDir, 'WeatherAlertMonitor.java'), weatherAlertMonitorJava, 'utf-8');

  // G2. WeatherAlertReceiver.java (BroadcastReceiver che risveglia il controllo meteo anche ad app chiusa / Doze Mode)
  const weatherAlertReceiverJava = `package com.ViaCamper.myapp.auto;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.PowerManager;

public class WeatherAlertReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(final Context context, final Intent intent) {
        if (context == null) return;
        final String action = (intent != null) ? intent.getAction() : "";

        // Riprogramma subito il controllo successivo per continuità h24 ad app chiusa
        WeatherAlertMonitor.scheduleBackgroundChecks(context.getApplicationContext(), 35000L);

        if (WeatherAlertMonitor.ACTION_DELAYED_PUSH.equals(action) && intent != null) {
            final String title = intent.getStringExtra("EXTRA_TITLE");
            final String body = intent.getStringExtra("EXTRA_BODY");
            final String alertId = intent.getStringExtra("EXTRA_ALERT_ID");
            if (alertId != null && !alertId.isEmpty()) {
                WeatherAlertMonitor.markAlertNotified(context.getApplicationContext(), alertId);
            }
            WeatherAlertMonitor.showWeatherPushNotification(context.getApplicationContext(), title, body, alertId);
            return;
        }

        final PendingResult pendingResult = goAsync();
        final Context appCtx = context.getApplicationContext();

        new Thread(() -> {
            PowerManager.WakeLock wakeLock = null;
            try {
                PowerManager pm = (PowerManager) appCtx.getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ViaCamper:WeatherReceiverWakeLock");
                    wakeLock.acquire(15000L);
                }
                WeatherAlertMonitor.checkWeatherAlertsSynchronously(appCtx);
            } catch (Exception ignored) {
            } finally {
                if (wakeLock != null && wakeLock.isHeld()) {
                    try { wakeLock.release(); } catch (Exception ignored) {}
                }
                try { pendingResult.finish(); } catch (Exception ignored) {}
            }
        }).start();
    }
}
`;
  fs.writeFileSync(path.join(javaDir, 'WeatherAlertReceiver.java'), weatherAlertReceiverJava, 'utf-8');

  // G3. WeatherAlertJobService.java (JobService di sistema persistente che opera anche con app rimossa dai recenti)
  const weatherAlertJobServiceJava = `package com.ViaCamper.myapp.auto;

import android.app.job.JobParameters;
import android.app.job.JobService;
import android.content.Context;

public class WeatherAlertJobService extends JobService {

    @Override
    public boolean onStartJob(final JobParameters params) {
        final Context appCtx = getApplicationContext();
        WeatherAlertMonitor.scheduleBackgroundChecks(appCtx, 35000L);

        new Thread(() -> {
            try {
                WeatherAlertMonitor.checkWeatherAlertsSynchronously(appCtx);
            } catch (Exception ignored) {
            } finally {
                try {
                    jobFinished(params, false);
                } catch (Exception ignored) {}
            }
        }).start();

        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) {
        WeatherAlertMonitor.scheduleBackgroundChecks(getApplicationContext(), 20000L);
        return true;
    }
}
`;
  fs.writeFileSync(path.join(javaDir, 'WeatherAlertJobService.java'), weatherAlertJobServiceJava, 'utf-8');

  // G4. WeatherGuardService.java (Service sticky con intercettazione chiusura app onTaskRemoved)
  const weatherGuardServiceJava = `package com.ViaCamper.myapp.auto;

import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

public class WeatherGuardService extends Service {

    private final Handler guardHandler = new Handler(Looper.getMainLooper());
    private final Runnable checkLoopRunnable = new Runnable() {
        @Override
        public void run() {
            final Context appCtx = getApplicationContext();
            new Thread(() -> {
                try {
                    WeatherAlertMonitor.checkWeatherAlertsSynchronously(appCtx);
                } catch (Exception ignored) {}
            }).start();
            WeatherAlertMonitor.scheduleBackgroundChecks(appCtx, 35000L);
            guardHandler.postDelayed(this, 30000L);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        WeatherAlertMonitor.ensureNotificationChannel(getApplicationContext());
        guardHandler.postDelayed(checkLoopRunnable, 10000L);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        WeatherAlertMonitor.scheduleBackgroundChecks(getApplicationContext(), 30000L);
        return START_STICKY;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // Quando l'utente chiude l'app scorrendola via dalle app recenti, riattiva subito l'allarme in background!
        WeatherAlertMonitor.scheduleBackgroundChecks(getApplicationContext(), 5000L);
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        guardHandler.removeCallbacksAndMessages(null);
        WeatherAlertMonitor.scheduleBackgroundChecks(getApplicationContext(), 10000L);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
`;
  fs.writeFileSync(path.join(javaDir, 'WeatherGuardService.java'), weatherGuardServiceJava, 'utf-8');

  // H. MainActivity.java (Bridge nativo Android TextToSpeech + sincronizzazione Android Auto + avvio WeatherAlertMonitor ad app chiusa)
  const mainActivityDir = path.join(javaDir, '..');
  const mainActivityJava = `package com.ViaCamper.myapp;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.ViaCamper.myapp.auto.WeatherAlertMonitor;
import com.ViaCamper.myapp.auto.WeatherGuardService;
import com.getcapacitor.BridgeActivity;
import org.json.JSONObject;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
    private TextToSpeech nativeTts;
    private boolean ttsReady = false;
    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);

        // 1. Configura subito il canale notifiche ad alta priorità e richiedi il permesso POST_NOTIFICATIONS su Android 13+
        WeatherAlertMonitor.ensureNotificationChannel(getApplicationContext());
        if (Build.VERSION.SDK_INT >= 33) {
            try {
                if (checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, 1001);
                }
            } catch (Exception ignored) {}
        }

        // 2. Avvia il servizio e gli scheduler nativi per il monitoraggio meteo a schermo spento / app chiusa
        try {
            startService(new Intent(this, WeatherGuardService.class));
        } catch (Exception ignored) {}
        WeatherAlertMonitor.scheduleBackgroundChecks(getApplicationContext(), 20000L);

        nativeTts = new TextToSpeech(getApplicationContext(), status -> {
            if (status == TextToSpeech.SUCCESS && nativeTts != null) {
                int res = nativeTts.setLanguage(Locale.ITALIAN);
                if (res == TextToSpeech.LANG_MISSING_DATA || res == TextToSpeech.LANG_NOT_SUPPORTED) {
                    nativeTts.setLanguage(Locale.getDefault());
                }
                AudioAttributes attrs = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build();
                nativeTts.setAudioAttributes(attrs);
                nativeTts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override
                    public void onStart(String utteranceId) {}

                    @Override
                    public void onDone(String utteranceId) {
                        abandonNavAudioFocus();
                        notifyWebTtsDone();
                    }

                    @Override
                    public void onError(String utteranceId) {
                        abandonNavAudioFocus();
                        notifyWebTtsDone();
                    }
                });
                ttsReady = true;
            }
        });

        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            WebSettings settings = webView.getSettings();
            settings.setMediaPlaybackRequiresUserGesture(false);
            webView.addJavascriptInterface(new AndroidNativeTtsBridge(), "AndroidNativeTTS");
        }

        handleIncomingAutoIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIncomingAutoIntent(intent);
    }

    @Override
    public void onPause() {
        WeatherAlertMonitor.scheduleBackgroundChecks(getApplicationContext(), 15000L);
        super.onPause();
    }

    @Override
    public void onStop() {
        WeatherAlertMonitor.scheduleBackgroundChecks(getApplicationContext(), 15000L);
        super.onStop();
    }

    private void handleIncomingAutoIntent(Intent intent) {
        if (intent == null) return;
        try {
            if (intent.getBooleanExtra("NAVIGATE_INTERNAL", false)) {
                String name = intent.getStringExtra("DEST_NAME");
                double lat = intent.getDoubleExtra("DEST_LAT", 0.0);
                double lng = intent.getDoubleExtra("DEST_LNG", 0.0);
                if (name != null) {
                    SharedPreferences prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
                    JSONObject obj = new JSONObject();
                    obj.put("id", "auto_dest_" + System.currentTimeMillis());
                    obj.put("name", name);
                    obj.put("lat", lat);
                    obj.put("lng", lng);
                    obj.put("timestamp", System.currentTimeMillis());
                    prefs.edit().putString("camper_auto_target_destination", obj.toString()).apply();
                }
            }
        } catch (Exception ignored) {}
    }

    private void requestNavAudioFocus() {
        try {
            if (audioManager == null) return;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (focusRequest == null) {
                    AudioAttributes attrs = new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                            .build();
                    focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                            .setAudioAttributes(attrs)
                            .setAcceptsDelayedFocusGain(false)
                            .setOnAudioFocusChangeListener(focusChange -> {})
                            .build();
                }
                audioManager.requestAudioFocus(focusRequest);
            } else {
                audioManager.requestAudioFocus(null, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK);
            }
        } catch (Exception ignored) {}
    }

    private void abandonNavAudioFocus() {
        try {
            if (audioManager == null) return;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && focusRequest != null) {
                audioManager.abandonAudioFocusRequest(focusRequest);
            } else {
                audioManager.abandonAudioFocus(null);
            }
        } catch (Exception ignored) {}
    }

    private void notifyWebTtsDone() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                webView.post(() -> webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('android-native-tts-done'));", null));
            }
        } catch (Exception ignored) {}
    }

    public class AndroidNativeTtsBridge {
        @JavascriptInterface
        public boolean isReady() {
            return ttsReady && nativeTts != null;
        }

        @JavascriptInterface
        public boolean speak(String text, float pitch, float rate, boolean flush) {
            if (!ttsReady || nativeTts == null || text == null || text.trim().isEmpty()) {
                return false;
            }
            try {
                requestNavAudioFocus();
                nativeTts.setPitch(pitch > 0 ? pitch : 1.0f);
                nativeTts.setSpeechRate(rate > 0 ? rate : 1.0f);
                int queueMode = flush ? TextToSpeech.QUEUE_FLUSH : TextToSpeech.QUEUE_ADD;
                String utteranceId = "nav_" + System.currentTimeMillis();
                int result = nativeTts.speak(text, queueMode, null, utteranceId);
                return result == TextToSpeech.SUCCESS;
            } catch (Exception e) {
                abandonNavAudioFocus();
                return false;
            }
        }

        @JavascriptInterface
        public void stop() {
            try {
                if (nativeTts != null) {
                    nativeTts.stop();
                }
                abandonNavAudioFocus();
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public String consumePendingAutoDestination() {
            try {
                SharedPreferences prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
                String raw = prefs.getString("camper_auto_target_destination", null);
                if (raw != null && !raw.isEmpty()) {
                    prefs.edit().remove("camper_auto_target_destination").apply();
                    return raw;
                }
            } catch (Exception ignored) {}
            return "";
        }

        @JavascriptInterface
        public void syncToAutoStorage(String key, String jsonValue) {
            try {
                if (key == null || key.isEmpty()) return;
                SharedPreferences prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
                prefs.edit().putString(key, jsonValue != null ? jsonValue : "").apply();
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void updateCamperLocation(double lat, double lng) {
            WeatherAlertMonitor.saveLastKnownLocation(getApplicationContext(), lat, lng);
            WeatherAlertMonitor.scheduleBackgroundChecks(getApplicationContext(), 25000L);
        }

        @JavascriptInterface
        public boolean isWeatherAlertNotified(String alertId) {
            return WeatherAlertMonitor.isAlertNotified(getApplicationContext(), alertId);
        }

        @JavascriptInterface
        public void markWeatherAlertNotified(String alertId) {
            WeatherAlertMonitor.markAlertNotified(getApplicationContext(), alertId);
        }

        @JavascriptInterface
        public void markWeatherAlertDismissed(String alertId) {
            WeatherAlertMonitor.markAlertDismissed(getApplicationContext(), alertId);
        }

        @JavascriptInterface
        public void triggerImmediateWeatherNotification(String title, String body, String alertId) {
            if (alertId != null && !alertId.isEmpty()) {
                WeatherAlertMonitor.markAlertNotified(getApplicationContext(), alertId);
            }
            WeatherAlertMonitor.showWeatherPushNotification(getApplicationContext(), title, body, alertId);
        }

        @JavascriptInterface
        public void scheduleClosedAppWeatherPush(String title, String body, String alertId, int delaySeconds) {
            WeatherAlertMonitor.scheduleDelayedPushNotification(
                    getApplicationContext(),
                    title,
                    body,
                    alertId,
                    Math.max(1, delaySeconds) * 1000L
            );
        }

        @JavascriptInterface
        public void setWeatherAlertsEnabled(boolean enabled) {
            try {
                SharedPreferences prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
                prefs.edit().putBoolean("camper_weather_alerts_enabled", enabled).apply();
                if (enabled) {
                    WeatherAlertMonitor.scheduleBackgroundChecks(getApplicationContext(), 15000L);
                }
            } catch (Exception ignored) {}
        }
    }

    @Override
    public void onDestroy() {
        WeatherAlertMonitor.scheduleBackgroundChecks(getApplicationContext(), 10000L);
        try {
            if (nativeTts != null) {
                nativeTts.stop();
                nativeTts.shutdown();
            }
        } catch (Exception ignored) {}
        super.onDestroy();
    }
}
`;
  fs.writeFileSync(path.join(mainActivityDir, 'MainActivity.java'), mainActivityJava, 'utf-8');

  console.log('[Android Auto] File sorgenti Java per Android Auto, WeatherAlertMonitor in background e MainActivity TTS generati con successo in:', javaDir);
}

// Esegui se chiamato direttamente
if (process.argv[1] && process.argv[1].endsWith('configure-android-auto.js')) {
  configureAndroidAuto();
}
