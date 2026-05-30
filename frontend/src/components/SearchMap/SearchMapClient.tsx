"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { divIcon } from "leaflet";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

export type SearchMapPin = {
  id: string;
  title: string;
  city: string;
  dateLabel: string;
  imageSrc: string;
  href: string;
  lat: number;
  lng: number;
};

type SearchMapClientProps = {
  center: [number, number];
  radiusMeters: number;
  pins?: SearchMapPin[];
};

const mealPinIcon = divIcon({
  className: "search-map__pin-wrapper",
  html: '<img class="search-map__meal-pin" src="/pin-repas.png" alt="" aria-hidden="true" />',
  iconSize: [58, 64],
  iconAnchor: [29, 58],
  popupAnchor: [0, -58],
});

const MapViewport = ({ center }: { center: [number, number] }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, 12, { animate: true });
  }, [center, map]);

  return null;
};

export default function SearchMapClient({
  center,
  radiusMeters,
  pins = [],
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
      {pins.map((pin) => (
        <Marker
          key={pin.id}
          position={[pin.lat, pin.lng]}
          icon={mealPinIcon}
          title={pin.title}
        >
          <Popup
            closeButton={false}
            minWidth={106}
            maxWidth={106}
            className="search-map__meal-preview-popup"
          >
            <Link href={pin.href} className="search-map__meal-preview">
              <span className="search-map__meal-preview-media">
                <Image
                  src={pin.imageSrc}
                  alt={pin.title}
                  width={88}
                  height={88}
                  className="search-map__meal-preview-image"
                />
              </span>
              <span className="search-map__meal-preview-details">
                <strong>{pin.title}</strong>
                <span>{pin.city}</span>
                <span>{pin.dateLabel}</span>
              </span>
            </Link>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
