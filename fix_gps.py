import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

old_gps = """      // Get a fast network-based location first (especially useful on 5G/WiFi)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation(prev => prev || {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setUserAccuracy(prev => prev || position.coords.accuracy);
        },
        () => {},
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
      );

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setUserAccuracy(position.coords.accuracy);
        },
        (error) => {
          console.warn("GPS error:", error);
          if (error.code === error.PERMISSION_DENIED) {
            setHasDeniedGPS(true);
            setIsGPSEnabled(false);
          }
        },
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 10000 }
      );"""

new_gps = """      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setUserAccuracy(position.coords.accuracy);
        },
        (error) => {
          console.warn("GPS error:", error);
          if (error.code === error.PERMISSION_DENIED) {
            setHasDeniedGPS(true);
            setIsGPSEnabled(false);
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );"""

# I need to find the exact block and replace it using regex if needed, or exact match
# Let's extract from lines 2336 to 2365 and replace it.
