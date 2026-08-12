package com.ViaCamper.myapp;
 
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
 
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            if (FirebaseApp.getApps(this).isEmpty()) {
                try {
                    // Inizializzazione programmatica fail-safe (ideale per APK compilati su GitHub Actions senza google-services.json)
                    FirebaseOptions options = new FirebaseOptions.Builder()
                            .setApplicationId("1:17441453721:android:8365707115b4fcc276aa08")
                            .setApiKey("AIzaSyA8uIBLACdsr-j1bGsC9J1Tjx9A8zRtUeM")
                            .setProjectId("calm-light-fg02f")
                            .setStorageBucket("calm-light-fg02f.firebasestorage.app")
                            .build();
                    FirebaseApp.initializeApp(this, options);
                } catch (Exception e) {
                    // Fallback all'inizializzazione automatica standard basata su risorse
                    FirebaseApp.initializeApp(this);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
