"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import "./search-map.scss";

const DEFAULT_RADIUS_METERS = 2000;

const getRadiusFromPopulation = (population?: number) => {
  if (!population) {
    return DEFAULT_RADIUS_METERS;
  }

  if (population < 20_000) {
    return 1000;
  } else if (population < 100_000) {
    return 2000;
  } else if (population < 500_000) {
    return 3000;
  } else {
    return 5000;
  }

}

const formatRadius = (radiusMeters: number) => {
  return radiusMeters >= 1000
    ? `${radiusMeters / 1000} km`
    : `${radiusMeters} m`;
}

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
};

type MapState =
  | { status: "loading" }
  | {
    status: "ready";
    cityName: string;
    center: [number, number];
    radiusMeters: number;
  }
  | { status: "empty" }
  | { status: "error" };

export default function SearchMap({ location, eventCount }: SearchMapProps) {
  const [mapState, setMapState] = useState<MapState>({ status: "loading" });

  useEffect(() => {
    const query = location.trim();

    if (!query) {
      return;
    }

    const controller = new AbortController();

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
          return;
        }

        const [longitude, latitude] = commune.centre.coordinates;
        const radiusMeters = getRadiusFromPopulation(commune.population);

        setMapState({
          status: "ready",
          cityName: commune.nom,
          center: [latitude, longitude],
          radiusMeters,
        });
      })
      .catch((error) => {
        if (!axios.isCancel(error)) {
          setMapState({ status: "error" });
        }
      });

    return () => controller.abort();
  }, [location]);

  if (mapState.status === "empty") {
    return null;
  }

  return (
    <section className="search-map" aria-label="Zone approximative des repas">
      <div className="search-map__header">
        <div>
          <h2>Zone approximative</h2>
          <p>
            {mapState.status === "ready"
              ? `${eventCount} ${
                  eventCount === 1 ? "événement" : "événements"
                } autour de ${mapState.cityName}`
              : "Localisation de la commune en cours"}
          </p>
        </div>
        <span>
          {mapState.status === "ready"
            ? `Rayon ${formatRadius(mapState.radiusMeters)}`
            : "Rayon"}
        </span>
      </div>

      {mapState.status === "ready" && (
        <MapClient
          center={mapState.center}
          radiusMeters={mapState.radiusMeters}
        />
      )}

      {mapState.status === "loading" && (
        <div className="search-map__loading" aria-live="polite">
          Chargement de la carte...
        </div>
      )}

      {mapState.status === "error" && (
        <div className="search-map__message">
          La carte est indisponible pour le moment.
        </div>
      )}
    </section>
  );
}