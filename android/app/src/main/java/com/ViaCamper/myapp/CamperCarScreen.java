package com.ViaCamper.myapp;

import android.content.Context;
import android.content.Intent;
import android.location.Location;
import android.location.LocationManager;
import android.net.Uri;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.ActionStrip;
import androidx.car.app.model.CarColor;
import androidx.car.app.model.CarLocation;
import androidx.car.app.model.ItemList;
import androidx.car.app.model.ListTemplate;
import androidx.car.app.model.MessageTemplate;
import androidx.car.app.model.Metadata;
import androidx.car.app.model.Place;
import androidx.car.app.model.PlaceListMapTemplate;
import androidx.car.app.model.PlaceMarker;
import androidx.car.app.model.Row;
import androidx.car.app.model.Template;
import androidx.lifecycle.DefaultLifecycleObserver;
import androidx.lifecycle.Lifecycle;
import androidx.lifecycle.LifecycleOwner;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public class CamperCarScreen extends Screen implements DefaultLifecycleObserver {
    private static final String TAG = "CamperCarScreen";
    private static final int MAX_CAR_ITEMS = 6; // Max 6 items allowed in standard car templates
    private final List<CamperStop> camperStops = new ArrayList<>();
    private boolean isLoading = false;
    private double currentLat = 41.9028; // Default Italy center (Roma)
    private double currentLng = 12.4964;
    private boolean hasFetched = false;

    private static class CamperStop {
        String name;
        String description;
        double latitude;
        double longitude;
        double distanceKm;

        CamperStop(String name, String description, double latitude, double longitude) {
            this.name = name;
            this.description = description;
            this.latitude = latitude;
            this.longitude = longitude;
            this.distanceKm = 0;
        }
    }

    public CamperCarScreen(@NonNull CarContext carContext) {
        super(carContext);
        getLifecycle().addObserver(this);
        loadDefaultStops();
    }

    @Override
    public void onStart(@NonNull LifecycleOwner owner) {
        updateUserLocation();
        if (!hasFetched) {
            hasFetched = true;
            fetchDynamicStops();
        }
    }

    @Override
    public void onResume(@NonNull LifecycleOwner owner) {
        updateUserLocation();
    }

    private void safeInvalidate() {
        new android.os.Handler(android.os.Looper.getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                try {
                    if (getLifecycle().getCurrentState().isAtLeast(Lifecycle.State.STARTED)) {
                        invalidate();
                    }
                } catch (Exception e) {
                    Log.w(TAG, "safeInvalidate ignored exception: ", e);
                }
            }
        });
    }

    private void updateUserLocation() {
        try {
            LocationManager locationManager = (LocationManager) getCarContext().getSystemService(Context.LOCATION_SERVICE);
            if (locationManager != null) {
                Location loc = null;
                try {
                    loc = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
                } catch (SecurityException ignored) {}
                if (loc == null) {
                    try {
                        loc = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
                    } catch (SecurityException ignored) {}
                }
                if (loc != null) {
                    currentLat = loc.getLatitude();
                    currentLng = loc.getLongitude();
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not obtain user location: ", e);
        }
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        double theta = lon1 - lon2;
        double dist = Math.sin(Math.toRadians(lat1)) * Math.sin(Math.toRadians(lat2))
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.cos(Math.toRadians(theta));
        dist = Math.acos(Math.min(1.0, Math.max(-1.0, dist)));
        dist = Math.toDegrees(dist);
        return dist * 60 * 1.1515 * 1.609344;
    }

    private void sortStopsByDistance() {
        for (CamperStop stop : camperStops) {
            stop.distanceKm = calculateDistance(currentLat, currentLng, stop.latitude, stop.longitude);
        }
        Collections.sort(camperStops, new Comparator<CamperStop>() {
            @Override
            public int compare(CamperStop a, CamperStop b) {
                return Double.compare(a.distanceKm, b.distanceKm);
            }
        });
    }

    private void loadDefaultStops() {
        camperStops.clear();
        camperStops.add(new CamperStop("Area Camper Roma", "Allaccio 220V, Scarico, Custodita", 41.956, 12.512));
        camperStops.add(new CamperStop("Area Sosta Firenze", "Camper service, Ombrosa, Vicino centro", 43.762, 11.285));
        camperStops.add(new CamperStop("Area Camper Milano", "Videosorvegliata, Allaccio, Metro vicina", 45.438, 9.219));
        camperStops.add(new CamperStop("Camping Venezia", "Fermata Bus per Venezia, Wifi", 45.479, 12.274));
        camperStops.add(new CamperStop("Camper Stop Napoli", "Custodita h24, Carico e Scarico", 40.862, 14.288));
        camperStops.add(new CamperStop("Area Sosta Bologna", "Allaccio elettrico, CS, Vicino tangenziale", 44.512, 11.325));
        sortStopsByDistance();
    }

    private void fetchDynamicStops() {
        isLoading = true;
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    URL url = new URL("https://ais-pre-ajaitltcclogrgumjfdqkq-942333460354.europe-west2.run.app/api/public-places");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("GET");
                    conn.setConnectTimeout(6000);
                    conn.setReadTimeout(6000);

                    int responseCode = conn.getResponseCode();
                    if (responseCode == 200) {
                        BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                        StringBuilder response = new StringBuilder();
                        String inputLine;
                        while ((inputLine = in.readLine()) != null) {
                            response.append(inputLine);
                        }
                        in.close();

                        JSONArray jsonArray = new JSONArray(response.toString());
                        List<CamperStop> fetched = new ArrayList<>();
                        for (int i = 0; i < jsonArray.length(); i++) {
                            JSONObject obj = jsonArray.getJSONObject(i);
                            String name = obj.optString("name", "Area Sosta");
                            String desc = obj.optString("description", "Sosta Camper");
                            if (desc.length() > 60) {
                                desc = desc.substring(0, 57) + "...";
                            }
                            double lat = obj.optDouble("latitude", 0.0);
                            double lng = obj.optDouble("longitude", 0.0);
                            if (lat != 0.0 && lng != 0.0) {
                                fetched.add(new CamperStop(name, desc, lat, lng));
                            }
                        }

                        if (!fetched.isEmpty()) {
                            camperStops.clear();
                            camperStops.addAll(fetched);
                            updateUserLocation();
                            sortStopsByDistance();
                        }
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Failed to fetch live stops from remote server, keeping default: ", e);
                } finally {
                    isLoading = false;
                    safeInvalidate();
                }
            }
        }).start();
    }

    private void startNavigation(double lat, double lng, String name) {
        try {
            Uri uri = Uri.parse("geo:" + lat + "," + lng + "?q=" + lat + "," + lng + "(" + Uri.encode(name) + ")");
            Intent intent = new Intent(CarContext.ACTION_NAVIGATE, uri);
            getCarContext().startCarApp(intent);
        } catch (Exception err) {
            Log.e(TAG, "Failed to start car navigation: ", err);
            try {
                Intent fallback = new Intent(Intent.ACTION_VIEW, Uri.parse("google.navigation:q=" + lat + "," + lng));
                fallback.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getCarContext().startActivity(fallback);
            } catch (Exception ex) {
                Log.e(TAG, "Fallback navigation failed: ", ex);
            }
        }
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        try {
            ItemList.Builder listBuilder = new ItemList.Builder();

            if (camperStops.isEmpty()) {
                listBuilder.setNoItemsMessage("Nessuna area di sosta trovata.");
            } else {
                int limit = Math.min(camperStops.size(), MAX_CAR_ITEMS);
                for (int i = 0; i < limit; i++) {
                    final CamperStop stop = camperStops.get(i);

                    String subTitle = stop.description;
                    if (stop.distanceKm > 0.1) {
                        subTitle = String.format("%.1f km • %s", stop.distanceKm, stop.description);
                    }

                    Row.Builder rowBuilder = new Row.Builder()
                            .setTitle(stop.name)
                            .addText(subTitle)
                            .setOnClickListener(new androidx.car.app.model.OnClickListener() {
                                @Override
                                public void onClick() {
                                    startNavigation(stop.latitude, stop.longitude, stop.name);
                                }
                            });

                    // Add metadata place marker safely
                    try {
                        Place place = new Place.Builder(CarLocation.create(stop.latitude, stop.longitude))
                                .setMarker(new PlaceMarker.Builder().build())
                                .build();
                        rowBuilder.setMetadata(new Metadata.Builder().setPlace(place).build());
                    } catch (Exception ignored) {}

                    listBuilder.addItem(rowBuilder.build());
                }
            }

            ActionStrip actionStrip = new ActionStrip.Builder()
                    .addAction(new Action.Builder()
                            .setTitle("Aggiorna")
                            .setOnClickListener(new androidx.car.app.model.OnClickListener() {
                                @Override
                                public void onClick() {
                                    updateUserLocation();
                                    fetchDynamicStops();
                                }
                            })
                            .build())
                    .build();

            // Try PlaceListMapTemplate first, with automatic fallback to ListTemplate
            try {
                return new PlaceListMapTemplate.Builder()
                        .setTitle("ViaCamper - Aree Sosta")
                        .setHeaderAction(Action.APP_ICON)
                        .setActionStrip(actionStrip)
                        .setItemList(listBuilder.build())
                        .build();
            } catch (Throwable t) {
                Log.w(TAG, "PlaceListMapTemplate not supported on this head unit, falling back to ListTemplate: ", t);
                return new ListTemplate.Builder()
                        .setTitle("ViaCamper - Aree Sosta")
                        .setHeaderAction(Action.APP_ICON)
                        .setActionStrip(actionStrip)
                        .setSingleList(listBuilder.build())
                        .build();
            }

        } catch (Throwable e) {
            Log.e(TAG, "Error in onGetTemplate: ", e);
            // Universal fallback template that is 100% compliant on all Android Auto versions
            return new MessageTemplate.Builder("ViaCamper - Seleziona per ricaricare le aree sosta")
                    .setTitle("ViaCamper")
                    .setHeaderAction(Action.APP_ICON)
                    .addAction(new Action.Builder()
                            .setTitle("Ricarica")
                            .setOnClickListener(new androidx.car.app.model.OnClickListener() {
                                @Override
                                public void onClick() {
                                    fetchDynamicStops();
                                    safeInvalidate();
                                }
                            })
                            .build())
                    .build();
        }
    }
}
