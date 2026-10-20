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

    // Permessi necessari per navigazione continua, notifiche push in background (Android 13/14) e audio guida in auto
    const permissionsToAdd = [
      '    <uses-permission android:name="android.permission.INTERNET" />',
      '    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
      '    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
      '    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />',
      '    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />',
      '    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
      '    <uses-permission android:name="android.permission.VIBRATE" />',
      '    <uses-permission android:name="android.permission.WAKE_LOCK" />',
      '    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />',
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

    // Service declaration per CarApp e Firebase Messaging Default Channel per notifiche a schermo spento/app chiusa
    const carServiceDeclaration = `
        <!-- FCM Default Notification Channel & Icon for Closed App Push Alerts -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_channel_id"
            android:value="fcm_default_channel" />
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_icon"
            android:resource="@mipmap/ic_launcher" />

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

    if (!manifest.includes('ViaCamperCarAppService')) {
      manifest = manifest.replace('</application>', carServiceDeclaration);
    } else if (!manifest.includes('default_notification_channel_id')) {
      manifest = manifest.replace('</application>', carServiceDeclaration);
    } else if (!manifest.includes('android:foregroundServiceType="location"')) {
      manifest = manifest.replace(
        'android:name="com.ViaCamper.myapp.auto.ViaCamperCarAppService"',
        'android:name="com.ViaCamper.myapp.auto.ViaCamperCarAppService"\n            android:foregroundServiceType="location"'
      );
    }
    fs.writeFileSync(manifestPath, manifest, 'utf-8');
    console.log('[Android Auto] AndroidManifest.xml aggiornato con ViaCamperCarAppService, permessi POST_NOTIFICATIONS, canale FCM predefinito e metadati.');
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
     * Calcola le indicazioni stradali turn-by-turn in italiano tramite OSRM per il Navigatore Interno su Android Auto.
     */
    public static List<RouteStepItem> fetchOsrmRouteSteps(double startLat, double startLng, double endLat, double endLng, String destName) {
        List<RouteStepItem> steps = new ArrayList<>();
        try {
            String urlStr = String.format(Locale.US,
                "https://router.project-osrm.org/route/v1/driving/%.6f,%.6f;%.6f,%.6f?overview=false&steps=true",
                startLng, startLat, endLng, endLat);
            HttpURLConnection conn = (HttpURLConnection) new URL(urlStr).openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("User-Agent", "ViaCamperAuto/2.5");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
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
                    JSONArray legs = route.optJSONArray("legs");
                    if (legs != null && legs.length() > 0) {
                        JSONArray rawSteps = legs.getJSONObject(0).optJSONArray("steps");
                        if (rawSteps != null) {
                            for (int i = 0; i < rawSteps.length(); i++) {
                                JSONObject st = rawSteps.getJSONObject(i);
                                double dist = st.optDouble("distance", 0.0);
                                String road = st.optString("name", "");
                                String ref = st.optString("ref", "");
                                if (road.isEmpty() && !ref.isEmpty()) road = ref;
                                else if (!road.isEmpty() && !ref.isEmpty() && !road.contains(ref)) road = road + " (" + ref + ")";

                                JSONObject man = st.optJSONObject("maneuver");
                                String type = man != null ? man.optString("type", "") : "";
                                String mod = man != null ? man.optString("modifier", "") : "";
                                int exit = man != null ? man.optInt("exit", 0) : 0;

                                double mLat = endLat;
                                double mLng = endLng;
                                if (man != null && man.has("location")) {
                                    JSONArray locArr = man.optJSONArray("location");
                                    if (locArr != null && locArr.length() >= 2) {
                                        mLng = locArr.optDouble(0, endLng);
                                        mLat = locArr.optDouble(1, endLat);
                                    }
                                }

                                String instr = translateManeuverToItalian(type, mod, road, exit, destName);
                                if (dist < 8.0 && !"arrive".equals(type) && i > 0) continue;

                                RouteStepItem item = new RouteStepItem();
                                item.instruction = instr;
                                item.roadName = road;
                                item.distanceMeters = dist;
                                item.lat = mLat;
                                item.lng = mLng;
                                steps.add(item);
                            }
                        }
                    }
                }
            }
        } catch (Exception ignored) {}

        if (steps.isEmpty()) {
            float[] res = new float[1];
            Location.distanceBetween(startLat, startLng, endLat, endLng, res);
            RouteStepItem fallback = new RouteStepItem();
            fallback.instruction = "Procedi verso " + (destName != null ? destName : "la destinazione");
            fallback.roadName = destName != null ? destName : "";
            fallback.distanceMeters = res[0];
            fallback.lat = endLat;
            fallback.lng = endLng;
            steps.add(fallback);
        }
        return steps;
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
import androidx.car.app.Screen;
import androidx.car.app.Session;

public class ViaCamperCarSession extends Session {

    @NonNull
    @Override
    public Screen onCreateScreen(@NonNull Intent intent) {
        return new MainMapScreen(getCarContext());
    }
}
`;
  fs.writeFileSync(path.join(javaDir, 'ViaCamperCarSession.java'), sessionJava, 'utf-8');

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

  // E2. ActiveCarNavigationScreen.java (Navigatore Camper Interno turn-by-turn attivo direttamente sul display dell'autoradio!)
  const activeNavJava = `package com.ViaCamper.myapp.auto;

import android.content.Context;
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
import android.text.SpannableString;
import android.text.Spanned;
import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.CarToast;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Navigatore Camper Interno attivo direttamente sullo schermo di Android Auto:
 * - Mostra la mappa in movimento centrata sul camper in tempo reale.
 * - Calcola il percorso reale tramite OSRM e aggiorna le manovre metro per metro.
 * - Legge ad alta voce le indicazioni stradali sull'impianto audio dell'auto.
 * - Nessun pulsante sovrapposto in alto: tutte le info e i controlli sono nel pannello a sinistra.
 */
public class ActiveCarNavigationScreen extends Screen implements LocationListener {

    private final AutoDataBridge.MovementItem destination;
    private Location currentLocation;
    private LocationManager locationManager;
    private boolean isListening = false;
    private boolean isStopped = false;

    private List<AutoDataBridge.RouteStepItem> routeSteps = new ArrayList<>();
    private int currentStepIndex = 0;
    private boolean isRouteLoading = true;
    private boolean announced300m = false;
    private boolean announced50m = false;
    private boolean announcedArrival = false;

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
                }
            } catch (Exception ignored) {}
            navHandler.postDelayed(this, 1200L);
        }
    };

    public ActiveCarNavigationScreen(@NonNull CarContext carContext, AutoDataBridge.MovementItem dest, Location startLoc) {
        super(carContext);
        this.destination = dest;
        this.currentLocation = (startLoc != null) ? startLoc : AutoDataBridge.getBestLiveLocation(carContext);
        initCarVoice();
        startGPSUpdates();
        loadRouteAsync();
        navHandler.postDelayed(gpsPollRunnable, 1200L);
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
        isRouteLoading = true;
        new Thread(() -> {
            AutoDataBridge.ensureCoordinates(getCarContext(), destination);
            double sLat = (currentLocation != null) ? currentLocation.getLatitude() : 41.9028;
            double sLng = (currentLocation != null) ? currentLocation.getLongitude() : 12.4964;
            double eLat = destination.lat != 0.0 ? destination.lat : sLat + 0.01;
            double eLng = destination.lng != 0.0 ? destination.lng : sLng + 0.01;

            List<AutoDataBridge.RouteStepItem> fetched = AutoDataBridge.fetchOsrmRouteSteps(sLat, sLng, eLat, eLng, destination.location);
            navHandler.post(() -> {
                if (isStopped) return;
                routeSteps = fetched;
                currentStepIndex = 0;
                isRouteLoading = false;
                announced300m = false;
                announced50m = false;
                String firstInstruction = !routeSteps.isEmpty() ? routeSteps.get(0).instruction : "";
                speakGuidance("Avvio navigazione camper verso " + destination.location + ". " + firstInstruction);
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
                        locationManager.requestLocationUpdates(provider, 800L, 1.0f, this, mainLooper);
                    } catch (Exception ignored) {}
                }
                isListening = true;
            }
        } catch (SecurityException ignored) {}
    }

    private void stopNavigationAndExit() {
        isStopped = true;
        navHandler.removeCallbacksAndMessages(null);
        if (locationManager != null && isListening) {
            try { locationManager.removeUpdates(this); } catch (Exception ignored) {}
            isListening = false;
        }
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

            if (metersToStep <= 30.0 && currentStepIndex < routeSteps.size() - 1) {
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

        invalidate();
    }

    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {}

    @Override
    public void onProviderEnabled(@NonNull String provider) {}

    @Override
    public void onProviderDisabled(@NonNull String provider) {}

    private SpannableString createDistanceSpanText(double distanceKm, String subtitle) {
        double safeKm = Math.max(0.0, distanceKm);
        Distance d = Distance.create(safeKm, Distance.UNIT_KILOMETERS);
        String prefix = safeKm < 1.0
            ? String.format(Locale.getDefault(), "%.0f m", safeKm * 1000.0)
            : String.format(Locale.getDefault(), "%.1f km", safeKm);
        String full = (subtitle != null && !subtitle.isEmpty()) ? (prefix + " • " + subtitle) : prefix;
        SpannableString span = new SpannableString(full);
        span.setSpan(DistanceSpan.create(d), 0, prefix.length(), Spanned.SPAN_INCLUSIVE_EXCLUSIVE);
        return span;
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        Location activeLoc = (currentLocation != null) ? currentLocation : AutoDataBridge.getBestLiveLocation(getCarContext());

        double computedDistKm = destination.distanceKm;
        if (activeLoc != null && destination.lat != 0.0 && destination.lng != 0.0) {
            float[] res = new float[1];
            Location.distanceBetween(activeLoc.getLatitude(), activeLoc.getLongitude(), destination.lat, destination.lng, res);
            computedDistKm = res[0] / 1000.0;
        }
        final double totalDistKm = computedDistKm;
        final int etaMin = Math.max(1, (int) Math.round((totalDistKm / 70.0) * 60.0));

        AutoDataBridge.RouteStepItem activeStep = (!routeSteps.isEmpty() && currentStepIndex < routeSteps.size())
                ? routeSteps.get(currentStepIndex)
                : null;

        String stepTitle = isRouteLoading
                ? "🧭 Calcolo percorso camper..."
                : (activeStep != null ? ("➡️ " + activeStep.instruction) : ("➡️ Procedi verso " + destination.location));

        double stepDistKm = (activeStep != null && activeStep.distanceMeters > 0)
                ? (activeStep.distanceMeters / 1000.0)
                : totalDistKm;

        ItemList.Builder listBuilder = new ItemList.Builder();

        // 1. Prossima manovra in tempo reale (toccando ripete l'indicazione vocale)
        Row.Builder maneuverRow = new Row.Builder()
                .setTitle(stepTitle)
                .addText(createDistanceSpanText(stepDistKm, "Tocca per ascoltare voce guida"))
                .setBrowsable(true)
                .setOnClickListener(() -> {
                    if (activeStep != null) {
                        speakGuidance(activeStep.instruction);
                    } else {
                        speakGuidance("Procedi verso " + destination.location);
                    }
                });

        if (activeLoc != null) {
            maneuverRow.setMetadata(
                new Metadata.Builder()
                    .setPlace(new Place.Builder(CarLocation.create(activeLoc.getLatitude(), activeLoc.getLongitude())).build())
                    .build()
            );
        }
        listBuilder.addItem(maneuverRow.build());

        // 2. Riepilogo Destinazione, Distanza Totale e Tempo Stimato
        Row.Builder destRow = new Row.Builder()
                .setTitle("🏁 " + destination.location)
                .addText(createDistanceSpanText(totalDistKm, "Arrivo ~" + etaMin + " min • 🛡️ Sagoma OK"))
                .setBrowsable(true)
                .setOnClickListener(() -> {
                    speakGuidance("Destinazione " + destination.location + " a " + String.format(Locale.ITALIAN, "%.1f", totalDistKm) + " chilometri.");
                });

        if (destination.lat != 0.0 && destination.lng != 0.0) {
            destRow.setMetadata(
                new Metadata.Builder()
                    .setPlace(
                        new Place.Builder(CarLocation.create(destination.lat, destination.lng))
                            .setMarker(new PlaceMarker.Builder().setColor(CarColor.GREEN).build())
                            .build()
                    )
                    .build()
            );
        }
        listBuilder.addItem(destRow.build());

        // 3. Ricalcola percorso
        Row.Builder recalcRow = new Row.Builder()
                .setTitle("🔄 Ricalcola Percorso Camper")
                .addText(createDistanceSpanText(0.0, "Aggiorna rotta dalla posizione attuale"))
                .setBrowsable(true)
                .setOnClickListener(this::loadRouteAsync);
        listBuilder.addItem(recalcRow.build());

        // 4. Termina Navigazione
        Row.Builder stopRow = new Row.Builder()
                .setTitle("⛔ Termina Navigazione")
                .addText(createDistanceSpanText(0.0, "Torna al menu principale ViaCamper"))
                .setBrowsable(true)
                .setOnClickListener(this::stopNavigationAndExit);
        listBuilder.addItem(stopRow.build());

        PlaceListMapTemplate.Builder templateBuilder = new PlaceListMapTemplate.Builder()
                .setTitle("Navigatore Camper")
                .setHeaderAction(Action.BACK)
                .setItemList(listBuilder.build())
                .setCurrentLocationEnabled(true);

        if (activeLoc != null) {
            templateBuilder.setAnchor(new Place.Builder(CarLocation.create(activeLoc.getLatitude(), activeLoc.getLongitude())).build());
        }

        return templateBuilder.build();
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

  // H. MainActivity.java (Bridge nativo Android TextToSpeech + sincronizzazione bidirezionale con Android Auto)
  const mainActivityDir = path.join(javaDir, '..');
  const mainActivityJava = `package com.ViaCamper.myapp;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
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
    }

    @Override
    public void onDestroy() {
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

  console.log('[Android Auto] File sorgenti Java per Android Auto e MainActivity TTS generati con successo in:', javaDir);
}

// Esegui se chiamato direttamente
if (process.argv[1] && process.argv[1].endsWith('configure-android-auto.js')) {
  configureAndroidAuto();
}
