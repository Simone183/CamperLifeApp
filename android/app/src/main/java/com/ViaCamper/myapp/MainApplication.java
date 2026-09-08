package com.ViaCamper.myapp;

import android.app.Application;
import android.util.Log;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;

public class MainApplication extends Application {
    private static final String TAG = "ViaCamperApp";

    @Override
    public void onCreate() {
        super.onCreate();
        initFirebase();
    }

    private void initFirebase() {
        try {
            if (FirebaseApp.getApps(this).isEmpty()) {
                Log.i(TAG, "Initializing default FirebaseApp in Application.onCreate...");
                try {
                    FirebaseApp.initializeApp(this);
                    Log.i(TAG, "FirebaseApp successfully initialized from google-services resources.");
                } catch (Exception e) {
                    Log.w(TAG, "Standard FirebaseApp.initializeApp failed: " + e.getMessage() + ". Using fallback FirebaseOptions...");
                    FirebaseOptions options = new FirebaseOptions.Builder()
                        .setApplicationId("1:17441453721:android:b0f4028724ea2bb276aa08")
                        .setProjectId("calm-light-fg02f")
                        .setApiKey("AIzaSyBrLUDywyD1lgs6WyS1fd6dvegBjExJxTM")
                        .setGcmSenderId("17441453721")
                        .setStorageBucket("calm-light-fg02f.firebasestorage.app")
                        .build();
                    FirebaseApp.initializeApp(this, options);
                    Log.i(TAG, "FirebaseApp successfully initialized via fallback options.");
                }
            } else {
                Log.i(TAG, "FirebaseApp already initialized in process.");
            }
        } catch (Throwable t) {
            Log.e(TAG, "Critical error during Firebase initialization in MainApplication", t);
        }
    }
}
