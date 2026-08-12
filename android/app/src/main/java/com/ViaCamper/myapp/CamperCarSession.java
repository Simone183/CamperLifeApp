package com.ViaCamper.myapp;

import android.content.Intent;
import androidx.annotation.NonNull;
import androidx.car.app.Session;
import androidx.car.app.Screen;

public class CamperCarSession extends Session {
    @NonNull
    @Override
    public Screen onCreateScreen(@NonNull Intent intent) {
        return new CamperCarScreen(getCarContext());
    }
}
