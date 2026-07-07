import { OSMObstacle } from '../types';

export const isNearRoute = (obstacleLat: number, obstacleLng: number, routeCoords: [number, number][], thresholdMeters = 400) => {
  const degThreshold = thresholdMeters / 111000;
  return routeCoords.some(coord => {
    if (Math.abs(coord[0] - obstacleLat) > degThreshold || Math.abs(coord[1] - obstacleLng) > degThreshold) {
      return false;
    }
    const dist = calculateHaversineDistance([obstacleLat, obstacleLng], coord);
    return (dist * 1000) < thresholdMeters;
  });
};

export const calculateHaversineDistance = (coord1: [number, number], coord2: [number, number]) => {
  const R = 6371; // km
  const dLat = (coord2[0] - coord1[0]) * Math.PI / 180;
  const dLng = (coord2[1] - coord1[1]) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(coord1[0] * Math.PI / 180) * Math.cos(coord2[0] * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const scanOSMObstacles = async (
  coords: [number, number][], 
  vehicleDimensions: any
): Promise<OSMObstacle[]> => {
  if (coords.length === 0) return [];
  try {
    const lats = coords.map(c => c[0]);
    const lngs = coords.map(c => c[1]);
    const minLat = Math.min(...lats) - 0.005;
    const maxLat = Math.max(...lats) + 0.005;
    const minLng = Math.min(...lngs) - 0.005;
    const maxLng = Math.max(...lngs) + 0.005;

    const latDelta = maxLat - minLat;
    const lngDelta = maxLng - minLng;
    
    let query = "";
    if (latDelta > 0.4 || lngDelta > 0.4) {
      const pointsToQuery = [
        coords[0],
        coords[Math.floor(coords.length / 2)],
        coords[coords.length - 1]
      ];
      query = `[out:json][timeout:15];
(
  node["maxheight"](around:2500,${pointsToQuery[0][0]},${pointsToQuery[0][1]});
  node["maxheight"](around:2500,${pointsToQuery[1][0]},${pointsToQuery[1][1]});
  node["maxheight"](around:2500,${pointsToQuery[2][0]},${pointsToQuery[2][1]});
  node["maxwidth"](around:2500,${pointsToQuery[0][0]},${pointsToQuery[0][1]});
  node["maxwidth"](around:2500,${pointsToQuery[1][0]},${pointsToQuery[1][1]});
  node["maxwidth"](around:2500,${pointsToQuery[2][0]},${pointsToQuery[2][1]});
);
out body;`;
    } else {
      query = `[out:json][timeout:15];
(
  node["maxheight"](${minLat},${minLng},${maxLat},${maxLng});
  node["maxwidth"](${minLat},${minLng},${maxLat},${maxLng});
);
out body;>;out skel qt;`;
    }

    const payload = new URLSearchParams();
    payload.append("data", query);

    const res = await fetch("/api/map-data-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: payload.toString()
    });

    if (!res.ok) return [];

    const data = await res.json();
    if (!data.elements) return [];

    const filtered: OSMObstacle[] = [];
    const safetyMargin = 0.2; 

    data.elements.forEach((el: any) => {
      if (el.tags && el.lat && el.lon) {
        if (!isNearRoute(el.lat, el.lon, coords, 400)) {
          return;
        }

        let type: 'height' | 'width' | 'weight' | 'barrier' = 'height';
        let val = 0;
        let label = "";

        if (el.tags.maxheight) {
          type = 'height';
          val = parseFloat(el.tags.maxheight.replace(',', '.')) || 0;
          label = `Sottopasso: ${el.tags.maxheight}`;
        } else if (el.tags.maxwidth) {
          type = 'width';
          val = parseFloat(el.tags.maxwidth.replace(',', '.')) || 0;
          label = `Strettoia: ${el.tags.maxwidth}`;
        } else {
          return;
        }

        if (val === 0) return;

        let isViolating = false;
        if (type === 'height' && vehicleDimensions.height > val) isViolating = true;
        if (type === 'width' && vehicleDimensions.width > val) isViolating = true;

        filtered.push({
          id: el.id,
          lat: el.lat,
          lng: el.lon,
          type: type,
          value: val,
          name: label,
          roadName: el.tags.name || el.tags.ref || "Strada",
          isViolation: isViolating
        });
      }
    });

    return filtered;
  } catch (err) {
    console.warn("OSM scanning error:", err);
    return [];
  }
};
