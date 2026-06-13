"use client";

import { useEffect, useState } from "react";
import { divIcon } from "leaflet";
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";

type ReservationExactMapProps = {
  center: [number, number] | null;
  addressLabel: string;
};

const mealPinIcon = divIcon({
  className: "reservation-exact-map__pin-wrapper",
  html: '<img class="reservation-exact-map__meal-pin" src="/pin-repas.png" alt="" aria-hidden="true" />',
  iconSize: [58, 64],
  iconAnchor: [29, 58],
  popupAnchor: [0, -58],
  tooltipAnchor: [0, -46],
});

function MapViewport({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, 16, { animate: true });
  }, [center, map]);

  return null;
}

export default function ReservationExactMap({
  center,
  addressLabel,
}: ReservationExactMapProps) {
  const [geocodedLocation, setGeocodedLocation] = useState<{
    addressLabel: string;
    center: [number, number];
  } | null>(null);
  const resolvedCenter =
    center ?? (geocodedLocation?.addressLabel === addressLabel ? geocodedLocation.center : null);

  useEffect(() => {
    if (center) {
      return;
    }

    const abortController = new AbortController();

    const resolveAddress = async () => {
      try {
        const response = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
            addressLabel,
          )}&limit=1`,
          {
            signal: abortController.signal,
          },
        );

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          features?: Array<{
            geometry?: {
              coordinates?: [number, number];
            };
          }>;
        };
        const coordinates = data.features?.[0]?.geometry?.coordinates;

        if (!coordinates) {
          return;
        }

        const [lng, lat] = coordinates;
        setGeocodedLocation({
          addressLabel,
          center: [lat, lng],
        });
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("Impossible de géocoder l'adresse de la réservation", error);
        }
      }
    };

    void resolveAddress();

    return () => {
      abortController.abort();
    };
  }, [addressLabel, center]);

  if (!resolvedCenter) {
    return (
      <div className="reservation-exact-map__fallback">
        Localisation de l&apos;adresse exacte...
      </div>
    );
  }

  return (
    <MapContainer
      key={resolvedCenter.join(",")}
      center={resolvedCenter}
      zoom={16}
      scrollWheelZoom={false}
      className="reservation-exact-map__canvas"
    >
      <MapViewport center={resolvedCenter} />
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      <Marker position={resolvedCenter} icon={mealPinIcon}>
        <Tooltip direction="top" offset={[0, -4]} opacity={1}>
          {addressLabel}
        </Tooltip>
      </Marker>
    </MapContainer>
  );
}
