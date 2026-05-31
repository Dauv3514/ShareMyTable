"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import "./search-map.scss";
import type { SearchMapPin } from "./SearchMapClient";

const DEFAULT_RADIUS_KM = 5;

const formatRadius = (radiusMeters: number) => {
  return radiusMeters >= 1000
    ? `${radiusMeters / 1000} km`
    : `${radiusMeters} m`;
};

const MapClient = dynamic(() => import("./SearchMapClient"), {
  ssr: false,
  loading: () => (
    <div className="search-map__loading" aria-live="polite">
      Chargement de la carte...
    </div>
  ),
});

type CommuneCenter = {
  type: "Point";
  coordinates: [number, number];
};

type CommuneResponse = {
  code: string;
  nom: string;
  population?: number;
  centre?: CommuneCenter;
};

type SearchMapProps = {
  location: string;
  eventCount: number;
  variant?: "default" | "hero";
  pins?: SearchMapPin[];
  radiusKm?: number;
  centerOverride?: {
    center: [number, number];
    label: string;
    locationKey: string;
  } | null;
  onMapScopeChange?: (scope: {
    locationKey: string;
    cityName: string;
    center: [number, number];
  } | null) => void;
};

type MapState =
  | { status: "loading" }
  | {
      status: "ready";
      cityName: string;
      center: [number, number];
    }
  | { status: "empty" }
  | { status: "error" };

export default function SearchMap({
  location,
  eventCount,
  variant = "default",
  pins = [],
  radiusKm = DEFAULT_RADIUS_KM,
  centerOverride = null,
  onMapScopeChange,
}: SearchMapProps) {
  const [mapState, setMapState] = useState<MapState>({ status: "loading" });
  const selectedRadiusMeters = radiusKm * 1000;

  useEffect(() => {
    if (centerOverride) {
      onMapScopeChange?.({
        locationKey: centerOverride.locationKey,
        cityName: centerOverride.label,
        center: centerOverride.center,
      });
      return;
    }

    const query = location.trim();

    if (!query) {
      onMapScopeChange?.(null);
      return;
    }

    const controller = new AbortController();
    onMapScopeChange?.(null);

    axios
      .get<CommuneResponse[]>("https://geo.api.gouv.fr/communes", {
        params: {
          nom: query,
          fields: "nom,code,centre,population",
          boost: "population",
          limit: "1",
        },
        signal: controller.signal,
      })
      .then((response) => {
        const commune = response.data[0];

        if (!commune?.centre?.coordinates) {
          setMapState({ status: "empty" });
          onMapScopeChange?.(null);
          return;
        }

        const [longitude, latitude] = commune.centre.coordinates;
        const center: [number, number] = [latitude, longitude];

        const nextMapState = {
          status: "ready",
          cityName: commune.nom,
          center,
        } satisfies MapState;

        setMapState(nextMapState);
        onMapScopeChange?.({
          locationKey: query,
          cityName: nextMapState.cityName,
          center: nextMapState.center,
        });
      })
      .catch((error) => {
        if (!axios.isCancel(error)) {
          setMapState({ status: "error" });
          onMapScopeChange?.(null);
        }
      });

    return () => controller.abort();
  }, [centerOverride, location, onMapScopeChange]);

  const visibleMapState: MapState = centerOverride
    ? {
        status: "ready",
        cityName: centerOverride.label,
        center: centerOverride.center,
      }
    : mapState;

  if (visibleMapState.status === "empty") {
    return null;
  }

  return (
    <section
      className={`search-map search-map--${variant}`}
      aria-label="Zone approximative des événements"
    >
      {variant === "default" && (
        <div className="search-map__header">
          <div>
            <h2>Zone approximative</h2>
            <p>
              {visibleMapState.status === "ready"
                ? `${eventCount} ${
                    eventCount === 1 ? "événement" : "événements"
                  } autour de ${visibleMapState.cityName}`
                : "Localisation de la commune en cours"}
            </p>
          </div>
          <span>
            {visibleMapState.status === "ready"
              ? `Rayon ${formatRadius(selectedRadiusMeters)}`
              : "Rayon"}
          </span>
        </div>
      )}

      {visibleMapState.status === "ready" && (
        <MapClient
          center={visibleMapState.center}
          radiusMeters={selectedRadiusMeters}
          pins={pins}
        />
      )}

      {visibleMapState.status === "loading" && (
        <div className="search-map__loading" aria-live="polite">
          Chargement de la carte...
        </div>
      )}

      {visibleMapState.status === "error" && (
        <div className="search-map__message">
          La carte est indisponible pour le moment.
        </div>
      )}
    </section>
  );
}
