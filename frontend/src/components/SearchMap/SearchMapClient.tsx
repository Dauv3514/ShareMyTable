"use client";

import { useEffect } from "react";
import { Circle, MapContainer, TileLayer, useMap } from "react-leaflet";

type SearchMapClientProps = {
  center: [number, number];
  radiusMeters: number;
};

const MapViewport = ({ center }: { center: [number, number] }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, 12, { animate: true });
  }, [center, map]);

  return null;
}

export default function SearchMapClient({
  center,
  radiusMeters,
}: SearchMapClientProps) {
  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom={false}
      className="search-map__canvas"
    >
      <MapViewport center={center} />
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      <Circle
        center={center}
        radius={radiusMeters}
        pathOptions={{
          color: "#52590d",
          fillColor: "#e1ec79",
          fillOpacity: 0.28,
          opacity: 0.78,
          weight: 2,
        }}
      />
    </MapContainer>
  );
}