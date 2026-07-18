import re

with open('server.ts', 'r') as f:
    content = f.read()

# Replace snapToRoad function
old_snap = """  async function snapToRoad(coord: string): Promise<string> {
    const servers = [
      `https://routing.openstreetmap.de/routed-car/nearest/v1/driving/${coord}?number=1`,
      `https://router.project-osrm.org/nearest/v1/driving/${coord}?number=1`
    ];
    for (const url of servers) {
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          },
          signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
          const data = await res.json();
          if (data.code === 'Ok' && data.waypoints && data.waypoints[0]) {
            const loc = data.waypoints[0].location; // [lon, lat]
            return `${loc[0]},${loc[1]}`;
          }
        }
      } catch (e) {
        // ignore and try next server
      }
    }
    return coord; // fallback to original if all fail
  }"""

new_snap = """  async function snapToRoad(coord: string): Promise<string> {
    const servers = [
      `https://routing.openstreetmap.de/routed-car/nearest/v1/driving/${coord}?number=1`,
      `https://router.project-osrm.org/nearest/v1/driving/${coord}?number=1`
    ];
    try {
      const fetchPromises = servers.map(async (url) => {
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          },
          signal: AbortSignal.timeout(2500) // Fast fail
        });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        if (data.code === 'Ok' && data.waypoints && data.waypoints[0]) {
            const loc = data.waypoints[0].location;
            return `${loc[0]},${loc[1]}`;
        }
        throw new Error("Invalid format");
      });
      return await Promise.any(fetchPromises);
    } catch (e) {
      return coord; // Fallback to original
    }
  }"""

content = content.replace(old_snap, new_snap)

# Fix /api/osrm snap calls to be parallel
old_osrm_snap = """      // Pre-snap coordinates using the high-reliability OSRM nearest service
      const snappedStart = await snapToRoad(start as string);
      const snappedEnd = await snapToRoad(end as string);"""

new_osrm_snap = """      // Pre-snap coordinates using the high-reliability OSRM nearest service in parallel
      const [snappedStart, snappedEnd] = await Promise.all([
        snapToRoad(start as string),
        snapToRoad(end as string)
      ]);"""

content = content.replace(old_osrm_snap, new_osrm_snap)

# Fix /api/brouter snap calls to be parallel
content = content.replace("""      const snappedStart = await snapToRoad(start as string);
      const snappedEnd = await snapToRoad(end as string);""", new_osrm_snap)

with open('server.ts', 'w') as f:
    f.write(content)
print("Fixed routing speed")
