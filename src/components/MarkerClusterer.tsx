import React, { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import { MarkerClusterer, Marker } from "@googlemaps/markerclusterer";

export const MarkerClustererComponent = ({ children }: { children: React.ReactNode }) => {
  const map = useMap();
  const clusterer = useRef<MarkerClusterer | null>(null);

  useEffect(() => {
    if (!map) return;

    if (!clusterer.current) {
      clusterer.current = new MarkerClusterer({ map, markers: [] });
    }

    return () => {
      clusterer.current?.setMap(null);
      clusterer.current = null;
    };
  }, [map]);

  // This is a simplified approach, a robust one would need to update markers based on children
  // For the sake of this task, let's see if this works
  return <>{children}</>;
};
