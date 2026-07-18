import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

old_code = """    if (
      isGPSEnabled &&
      typeof window !== "undefined" &&
      navigator.geolocation
    ) {
      watchId = navigator.geolocation.watchPosition("""

new_code = """    if (
      isGPSEnabled &&
      typeof window !== "undefined" &&
      navigator.geolocation
    ) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation(prev => prev || {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setUserAccuracy(prev => prev || position.coords.accuracy);
        },
        (err) => console.warn("getCurrentPosition warn:", err),
        { enableHighAccuracy: false, timeout: 5000, maximumAge: Infinity }
      );
      
      watchId = navigator.geolocation.watchPosition("""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print("Added getCurrentPosition back!")
else:
    print("Could not find the code")
