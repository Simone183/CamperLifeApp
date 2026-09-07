package com.ViaCamper.myapp;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        try {
            if (FirebaseApp.getApps(this).isEmpty()) {
                FirebaseOptions options = new FirebaseOptions.Builder()
                    .setApplicationId("1:17441453721:android:b0f4028724ea2bb276aa08")
                    .setProjectId("calm-light-fg02f")
                    .setApiKey("AIzaSyBrLUDywyD1lgs6WyS1fd6dvegBjExJxTM")
                    .setGcmSenderId("17441453721")
                    .build();
                FirebaseApp.initializeApp(this, options);
            }
        } catch (Exception e) {
            android.util.Log.e("ViaCamper", "Firebase programmatic init exception", e);
        }
        super.onCreate(savedInstanceState);
    }
}
