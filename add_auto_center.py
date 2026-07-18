import re

with open('src/components/MapTab.tsx', 'r') as f:
    content = f.read()

new_effect = """
  // Auto-center on user location when it first becomes available
  const hasAutoCenteredOnUserRef = React.useRef(false);
  React.useEffect(() => {
    if (userLocation && mapRef.current && !hasAutoCenteredOnUserRef.current && !selectedPlace) {
      mapRef.current.setView([userLocation.lat, userLocation.lng], 13);
      hasAutoCenteredOnUserRef.current = true;
    }
  }, [userLocation, selectedPlace]);
"""

# Insert after const mapRef = React.useRef<L.Map | null>(null);
target = "const containerRef = React.useRef<HTMLDivElement>(null);"

if target in content:
    content = content.replace(target, target + new_effect)
    with open('src/components/MapTab.tsx', 'w') as f:
        f.write(content)
    print("Added auto-center")
else:
    print("Not found")

