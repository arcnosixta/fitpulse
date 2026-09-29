package app.fitpulse.tracker;

import android.os.Bundle;

import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Must run before super.onCreate() so the launch theme is replaced with
        // AppTheme.NoActionBar, which carries the real window background and the
        // light system bar icons.
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
    }
}
