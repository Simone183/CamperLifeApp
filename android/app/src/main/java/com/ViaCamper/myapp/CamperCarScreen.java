package com.ViaCamper.myapp;

import android.content.Intent;
import android.net.Uri;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.CarColor;
import androidx.car.app.model.CarLocation;
import androidx.car.app.model.Header;
import androidx.car.app.model.ItemList;
import androidx.car.app.model.Metadata;
import androidx.car.app.model.Place;
import androidx.car.app.model.PlaceListMapTemplate;
import androidx.car.app.model.PlaceMarker;
import androidx.car.app.model.Row;
import androidx.car.app.model.Template;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;

public class CamperCarScreen extends Screen {
    private static final String TAG = "CamperCarScreen";
    private final List<CamperStop> camperStops = new ArrayList<>();
    private boolean isLoading = true;

    private static class CamperStop {
        String name;
        String description;
        double latitude;
        double longitude;

        CamperStop(String name, String description, double latitude, double longitude) {
            this.name = name;
            this.description = description;
            this.latitude = latitude;
            this.longitude = longitude;
        }
    }

    public CamperCarScreen(@NonNull CarContext carContext) {
        super(carContext);
        loadDefaultStops();
        fetchDynamicStops();
    }

    private void loadDefaultStops() {
        camperStops.add(new CamperStop("Area Camper Roma", "Via di Prato Rotondo - Allaccio 220V, Scarico, Custodita", 41.956, 12.512));
        camperStops.add(new CamperStop("Area Sosta Firenze", "Viale Giannotti - Camper service, Ombrosa, Vicino centro", 43.762, 11.285));
        camperStops.add(new CamperStop("Area Camper Milano", "Via San Dionigi - Videosorvegliata, Allaccio, Metro vicina", 45.438, 9.219));
        camperStops.add(new CamperStop("Camping Venezia", "Via S. Giuliano - Mestre, Fermata Bus per Venezia, Wifi", 45.479, 12.274));
        camperStops.add(new CamperStop("Camper Stop Napoli", "Via Nuova Poggioreale - Custodita h24, Carico e Scarico", 40.862, 14.288));
    }

    private void fetchDynamicStops() {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    URL url = new URL("https://ais-pre-ajaitltcclogrgumjfdqkq-942333460354.europe-west2.run.app/api/public-places");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("GET");
                    conn.setConnectTimeout(8000);
                    conn.setReadTimeout(8000);

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
                            double lat = obj.optDouble("latitude", 0.0);
                            double lng = obj.optDouble("longitude", 0.0);
                            if (lat != 0.0 && lng != 0.0) {
                                fetched.add(new CamperStop(name, desc, lat, lng));
                            }
                        }

                        if (!fetched.isEmpty()) {
                            camperStops.clear();
                            camperStops.addAll(fetched);
                        }
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error fetching dynamic stops: ", e);
                } finally {
                    isLoading = false;
                    new android.os.Handler(android.os.Looper.getMainLooper()).post(new Runnable() {
                        @Override
                        public void run() {
                            invalidate();
                        }
                    });
                }
            }
        }).start();
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        ItemList.Builder listBuilder = new ItemList.Builder();

        if (camperStops.isEmpty()) {
            listBuilder.setNoItemsMessage("Nessuna sosta camper caricata.");
        } else {
            for (final CamperStop stop : camperStops) {
                Place place = new Place.Builder(CarLocation.create(stop.latitude, stop.longitude))
                        .setMarker(new PlaceMarker.Builder()
                                .setColor(CarColor.GREEN)
                                .build())
                        .build();

                listBuilder.addItem(new Row.Builder()
                        .setTitle(stop.name)
                        .addText(stop.description)
                        .setMetadata(new Metadata.Builder().setPlace(place).build())
                        .setOnClickListener(new androidx.car.app.model.OnClickListener() {
                            @Override
                            public void onClick() {
                                Intent intent = new Intent(CarContext.ACTION_NAVIGATE, Uri.parse("geo:" + stop.latitude + "," + stop.longitude));
                                getCarContext().startCarApp(intent);
                            }
                        })
                        .build());
            }
        }

        return new PlaceListMapTemplate.Builder()
                .setTitle(isLoading ? "ViaCamper (Caricamento...)" : "ViaCamper - Aree Sosta")
                .setHeaderAction(Action.APP_ICON)
                .setItemList(listBuilder.build())
                .build();
    }
}
