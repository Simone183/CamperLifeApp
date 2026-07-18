import re
with open('src/components/MapTab.tsx', 'r') as f:
    content = f.read()

old_code = """    // Intercept Tile Creation completely to avoid initial network load and prevent direct OSM CORS requests
    (customTileLayer as any).createTile = function (coords: any, done: any) {
      const tile = document.createElement("img");
      tile.className = "leaflet-tile";
      tile.width = 256;
      tile.height = 256;
      tile.alt = "";
      tile.setAttribute("role", "presentation");
      
      tile.onload = function () {
        done(null, tile);
      };
      
      tile.onerror = function () {
        tile.src = generatePlaceholderTile(
          coords.z,
          coords.x,
          coords.y,
          "Mappa Offline",
        );
      };

      const key = `${coords.z}-${coords.x}-${coords.y}`;
      getBestTile(coords.z, coords.x, coords.y)
        .then((cachedBase64) => {
          if (cachedBase64) {
            tile.src = cachedBase64;
          } else {
            // Check if we are simulated offline or physically offline
            const isSimulated =
              localStorage.getItem("camper_simulated_offline") === "true";
            const offlineActive =
              isSimulated ||
              !isOnline ||
              (typeof navigator !== "undefined" && !navigator.onLine);

            if (!offlineActive) {
              tile.src = `https://mt1.google.com/vt/lyrs=m&x=${coords.x}&y=${coords.y}&z=${coords.z}`;
            } else {
              tile.src = generatePlaceholderTile(
                coords.z,
                coords.x,
                coords.y,
                "Mappa Offline",
              );
            }
          }
        })
        .catch(() => {
          tile.src = generatePlaceholderTile(
            coords.z,
            coords.x,
            coords.y,
            "Mappa Offline",
          );
        });

      return tile;
    };"""

new_code = """    // Intercept Tile Creation completely to avoid initial network load and prevent direct OSM CORS requests
    (customTileLayer as any).createTile = function (coords: any, done: any) {
      const tile = document.createElement("img");
      tile.className = "leaflet-tile";
      tile.width = 256;
      tile.height = 256;
      tile.alt = "";
      tile.setAttribute("role", "presentation");
      
      tile.onload = function () {
        done(null, tile);
      };
      
      tile.onerror = function () {
        tile.src = generatePlaceholderTile(
          coords.z,
          coords.x,
          coords.y,
          "Mappa Offline",
        );
      };

      const isSimulated = localStorage.getItem("camper_simulated_offline") === "true";
      const isOfflineMode = isSimulated || !isOnline || (typeof navigator !== "undefined" && !navigator.onLine);

      if (!isOfflineMode) {
        // Fast path for 5G / online mode (avoid blocking IndexedDB lookup)
        tile.src = `https://mt1.google.com/vt/lyrs=m&x=${coords.x}&y=${coords.y}&z=${coords.z}`;
      } else {
        const key = `${coords.z}-${coords.x}-${coords.y}`;
        getBestTile(coords.z, coords.x, coords.y)
          .then((cachedBase64) => {
            if (cachedBase64) {
              tile.src = cachedBase64;
            } else {
              tile.src = generatePlaceholderTile(
                coords.z,
                coords.x,
                coords.y,
                "Mappa Offline",
              );
            }
          })
          .catch(() => {
            tile.src = generatePlaceholderTile(
              coords.z,
              coords.x,
              coords.y,
              "Mappa Offline",
            );
          });
      }

      return tile;
    };"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('src/components/MapTab.tsx', 'w') as f:
        f.write(content)
    print("Fixed MapTab tile loading")
else:
    print("old_code not found in MapTab")
