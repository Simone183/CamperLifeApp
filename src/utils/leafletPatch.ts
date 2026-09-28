import L from "leaflet";

/**
 * Monkey-patches Leaflet's L.DomUtil.getPosition and L.DomUtil.setPosition
 * to prevent 'Cannot read properties of undefined (reading _leaflet_pos)' errors
 * when markers, tiles, or popups are unmounted or removed during animation/zooming.
 */
export function patchLeafletDomUtil() {
  try {
    if (typeof L !== "undefined" && L && L.DomUtil) {
      const origGetPos = L.DomUtil.getPosition;
      L.DomUtil.getPosition = function (el: any) {
        if (!el) return new L.Point(0, 0);
        try {
          return origGetPos.call(L.DomUtil, el) || new L.Point(0, 0);
        } catch {
          return new L.Point(0, 0);
        }
      };

      const origSetPos = L.DomUtil.setPosition;
      L.DomUtil.setPosition = function (el: any, point: any) {
        if (!el) return;
        try {
          origSetPos.call(L.DomUtil, el, point);
        } catch {}
      };
    }
  } catch (e) {
    console.warn("Could not patch Leaflet DomUtil:", e);
  }
}

// Execute immediately upon module import
patchLeafletDomUtil();
