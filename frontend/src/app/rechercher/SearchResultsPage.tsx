"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent, PointerEvent, WheelEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, LocateFixed, X } from "lucide-react";
import EventCard from "@/components/EventCard";
import SearchResultCard from "@/components/SearchResultCard";
import SearchBar from "@/components/SearchBar";
import SearchMap from "@/components/SearchMap";
import {
  filterMealEvents,
  getMealFilterById,
} from "@/lib/search-data";
import { buildMealEventHref, getMealEvents, type MealEvent } from "@/lib/meal-data";
import styles from "./rechercher.module.scss";

function parseFilters(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((filter) => filter.trim())
    .filter(Boolean);
}

function buildSearchUrl({
  location,
  date,
  filters,
}: {
  location: string;
  date: string;
  filters: string[];
}) {
  const params = new URLSearchParams();

  if (location) {
    params.set("lieu", location);
  }

  if (date) {
    params.set("date", date);
  }

  if (filters.length > 0) {
    params.set("filters", filters.join(","));
  }

  const queryString = params.toString();
  return `/rechercher${queryString ? `?${queryString}` : ""}`;
}

type MapScope = {
  locationKey: string;
  cityName: string;
  center: [number, number];
};

type UserPosition = {
  center: [number, number];
};

const EARTH_RADIUS_METERS = 6_371_000;
const DEFAULT_RADIUS_KM = 5;
const RADIUS_STEPS_KM = [1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const MAX_RADIUS_STEP_INDEX = RADIUS_STEPS_KM.length - 1;

function getDistanceMeters(
  [fromLat, fromLng]: [number, number],
  [toLat, toLng]: [number, number],
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const fromLatRad = toRadians(fromLat);
  const toLatRad = toRadians(toLat);
  const latDelta = toRadians(toLat - fromLat);
  const lngDelta = toRadians(toLng - fromLng);

  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(fromLatRad) *
      Math.cos(toLatRad) *
      Math.sin(lngDelta / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

export default function SearchResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mealEvents, setMealEvents] = useState<MealEvent[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mapScope, setMapScope] = useState<MapScope | null>(null);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const radiusStepIndex = RADIUS_STEPS_KM.indexOf(radiusKm);
  const radiusProgress =
    (Math.max(0, radiusStepIndex) / MAX_RADIUS_STEP_INDEX) * 100;
  const [isDraggingSuggestions, setIsDraggingSuggestions] = useState(false);
  const suggestionCardsRef = useRef<HTMLDivElement>(null);
  const hasTriedInitialLocationRef = useRef(false);
  const suggestionDragRef = useRef({
    hasMoved: false,
    pointerId: null as number | null,
    startX: 0,
    startScrollLeft: 0,
  });
  const location = searchParams.get("lieu") ?? "";
  const date = searchParams.get("date") ?? "";
  const filters = useMemo(
    () => parseFilters(searchParams.get("filters")),
    [searchParams],
  );

  useEffect(() => {
    let cancelled = false;

    const loadEvents = async () => {
      const events = await getMealEvents();
      if (!cancelled) {
        setMealEvents(events);
      }
    };

    void loadEvents();

    return () => {
      cancelled = true;
    };
  }, []);

  const locateUser = useCallback(
    (options?: { clearLocation?: boolean }) => {
      if (!("geolocation" in navigator)) {
        return;
      }

      setIsLocatingUser(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserPosition({
            center: [position.coords.latitude, position.coords.longitude],
          });
          setRadiusKm(DEFAULT_RADIUS_KM);
          setIsLocatingUser(false);

          if (options?.clearLocation) {
            router.push(
              buildSearchUrl({
                location: "",
                date,
                filters,
              }),
            );
          }
        },
        () => {
          setIsLocatingUser(false);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 60_000,
          timeout: 8_000,
        },
      );
    },
    [date, filters, router],
  );

  useEffect(() => {
    if (hasTriedInitialLocationRef.current || location.trim()) {
      return;
    }

    hasTriedInitialLocationRef.current = true;
    window.setTimeout(() => locateUser(), 0);
  }, [locateUser, location]);

  const mapLocation = location.trim() || "Rennes";
  const activeUserPosition = location.trim() ? null : userPosition;
  const activeMapLocationKey = activeUserPosition ? "around-me" : mapLocation;
  const mapCenterOverride = useMemo(
    () =>
      activeUserPosition
        ? {
            center: activeUserPosition.center,
            label: "Autour de moi",
            locationKey: activeMapLocationKey,
          }
        : null,
    [activeMapLocationKey, activeUserPosition],
  );
  const filteredEvents = useMemo(
    () => filterMealEvents({ events: mealEvents, location, date, filters }),
    [date, filters, location, mealEvents],
  );
  const events = useMemo(() => {
    if (!mapScope || mapScope.locationKey !== activeMapLocationKey) {
      return filteredEvents;
    }

    return filteredEvents.filter((event) => {
      if (
        typeof event.locationLat !== "number" ||
        typeof event.locationLng !== "number"
      ) {
        return false;
      }

      return (
        getDistanceMeters(mapScope.center, [event.locationLat, event.locationLng]) <=
        radiusKm * 1000
      );
    });
  }, [activeMapLocationKey, filteredEvents, mapScope, radiusKm]);
  const recommendedEvents = useMemo(() => {
    const resultIds = new Set(events.map((event) => event.id));
    const recommendations = mealEvents.filter((event) => !resultIds.has(event.id));

    return (recommendations.length > 0 ? recommendations : mealEvents).slice(0, 8);
  }, [events, mealEvents]);
  const activeFilters = filters
    .map((filterId) => {
      const filter = getMealFilterById(filterId);
      return filter ? { id: filterId, label: filter.label } : null;
    })
    .filter((filter): filter is { id: string; label: string } => Boolean(filter));
  const handleMapScopeChange = useCallback((scope: MapScope | null) => {
    setMapScope(scope);
  }, []);
  const mapPins = useMemo(
    () =>
      events
        .filter(
          (event) =>
            typeof event.locationLat === "number" &&
            typeof event.locationLng === "number",
        )
        .map((event) => ({
          id: event.id,
          title: event.title,
          city: event.city,
          dateLabel: event.dateLabel,
          imageSrc: "/photoRepas.png",
          href: buildMealEventHref(event.id),
          lat: event.locationLat as number,
          lng: event.locationLng as number,
        })),
    [events],
  );

  const updateSearch = (nextCriteria: {
    location?: string;
    date?: string;
    filters?: string[];
  }) => {
    router.push(
      buildSearchUrl({
        location: nextCriteria.location ?? location,
        date: nextCriteria.date ?? date,
        filters: nextCriteria.filters ?? filters,
      }),
    );
  };

  const scrollSuggestions = () => {
    const container = suggestionCardsRef.current;
    const firstCard = container?.querySelector<HTMLElement>(".event-card");

    if (!container || !firstCard) {
      return;
    }

    const gap = Number.parseFloat(window.getComputedStyle(container).columnGap || "0");
    container.scrollBy({
      left: firstCard.offsetWidth + gap,
      behavior: "smooth",
    });
  };

  const handleSuggestionsWheel = (event: WheelEvent<HTMLDivElement>) => {
    const container = suggestionCardsRef.current;

    if (!container || window.innerWidth < 1024) {
      return;
    }

    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    if (maxScrollLeft <= 0) {
      return;
    }

    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY)
      ? event.deltaX
      : event.deltaY;
    const canScroll =
      (delta > 0 && container.scrollLeft < maxScrollLeft) ||
      (delta < 0 && container.scrollLeft > 0);

    if (!canScroll) {
      return;
    }

    event.preventDefault();
    container.scrollLeft = Math.min(
      maxScrollLeft,
      Math.max(0, container.scrollLeft + delta),
    );
  };

  const handleSuggestionsPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const container = suggestionCardsRef.current;

    if (!container || event.pointerType !== "mouse" || event.button !== 0) {
      return;
    }

    suggestionDragRef.current = {
      hasMoved: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: container.scrollLeft,
    };
    setIsDraggingSuggestions(true);
    container.setPointerCapture(event.pointerId);
  };

  const handleSuggestionsPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const container = suggestionCardsRef.current;
    const drag = suggestionDragRef.current;

    if (!container || drag.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - drag.startX;

    if (Math.abs(deltaX) > 4) {
      drag.hasMoved = true;
    }

    container.scrollLeft = drag.startScrollLeft - deltaX;
  };

  const stopSuggestionsDrag = (event: PointerEvent<HTMLDivElement>) => {
    const container = suggestionCardsRef.current;
    const drag = suggestionDragRef.current;

    if (!container || drag.pointerId !== event.pointerId) {
      return;
    }

    if (container.hasPointerCapture(event.pointerId)) {
      container.releasePointerCapture(event.pointerId);
    }

    suggestionDragRef.current.pointerId = null;
    setIsDraggingSuggestions(false);
  };

  const handleSuggestionClickCapture = (event: PointerEvent<HTMLDivElement>) => {
    if (!suggestionDragRef.current.hasMoved) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    suggestionDragRef.current.hasMoved = false;
  };

  const handleRadiusChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextIndex = Number(event.target.value);
    setRadiusKm(RADIUS_STEPS_KM[nextIndex] ?? DEFAULT_RADIUS_KM);
  };

  return (
    <div className={styles.page}>
      <section
        className={`${styles.searchExperience} ${
          panelOpen ? styles.searchExperienceOpen : ""
        }`}
      >
        <div className={styles.mapStage}>
          <div className={styles.searchOverlay}>
            <SearchBar
              initialLocation={location}
              initialDate={date}
              initialFilters={filters}
            />

            <section className={styles.filters} aria-label="Filtres actifs">
              {location && (
                <button
                  type="button"
                  className={styles.filterChip}
                  onClick={() => updateSearch({ location: "" })}
                  aria-label={`Retirer le filtre lieu ${location}`}
                >
                  <span>{location}</span>
                  <X aria-hidden="true" />
                </button>
              )}
              {date && (
                <button
                  type="button"
                  className={styles.filterChip}
                  onClick={() => updateSearch({ date: "" })}
                  aria-label={`Retirer le filtre date ${date}`}
                >
                  <span>{date}</span>
                  <X aria-hidden="true" />
                </button>
              )}
              {activeFilters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={styles.filterChip}
                  onClick={() =>
                    updateSearch({
                      filters: filters.filter((filterId) => filterId !== filter.id),
                    })
                  }
                  aria-label={`Retirer le filtre ${filter.label}`}
                >
                  <span>{filter.label}</span>
                  <X aria-hidden="true" />
                </button>
              ))}
            </section>

            <section className={styles.radiusControl} aria-label="Rayon de recherche">
              <div className={styles.radiusControlHead}>
                <span>Rayon</span>
                <strong>{radiusKm} km</strong>
              </div>
              <input
                type="range"
                min="0"
                max={MAX_RADIUS_STEP_INDEX}
                step="1"
                value={Math.max(0, radiusStepIndex)}
                onChange={handleRadiusChange}
                aria-label={`Rayon de recherche ${radiusKm} kilomètres`}
                style={
                  {
                    "--radius-progress": `${radiusProgress}%`,
                  } as CSSProperties
                }
              />
            </section>

            <button
              type="button"
              className={styles.aroundMeButton}
              onClick={() => locateUser({ clearLocation: true })}
              disabled={isLocatingUser}
            >
              <LocateFixed aria-hidden="true" />
              {isLocatingUser ? "Localisation..." : "Autour de moi"}
            </button>
          </div>

          <SearchMap
            key={activeMapLocationKey}
            location={mapLocation}
            eventCount={events.length}
            variant="hero"
            pins={mapPins}
            radiusKm={radiusKm}
            centerOverride={mapCenterOverride}
            onMapScopeChange={handleMapScopeChange}
          />

          <button
            type="button"
            className={styles.panelToggle}
            onClick={() => setPanelOpen((isOpen) => !isOpen)}
            aria-label={panelOpen ? "Refermer la liste des événements" : "Voir la liste des événements"}
          >
            {panelOpen ? <ChevronDown aria-hidden="true" /> : <ChevronUp aria-hidden="true" />}
          </button>
        </div>

        <section className={styles.resultsPanel} aria-label="Événements">
          <div className={styles.panelHandle} aria-hidden="true" />
          <div className={styles.resultsHead}>
            <div>
              <h1>Recherche</h1>
              <p>
                {events.length} {events.length > 1 ? "événements trouvés" : "événement trouvé"}
              </p>
            </div>
          </div>

          {events.length > 0 ? (
            <div className={styles.cards}>
              {events.map((event) => (
                <SearchResultCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <h2>Aucun événement ne correspond</h2>
              <p>Essayez une autre ville, une autre date ou moins de filtres.</p>
            </div>
          )}
        </section>
      </section>

      <section className={styles.suggestions} aria-label="Vous aimeriez aussi">
        <div className={styles.suggestionsHead}>
          <div>
            <h2>Ça va te plaire</h2>
            <p>Les tables bien notées du quartier</p>
          </div>
          <button
            type="button"
            className={styles.seeMoreButton}
            onClick={scrollSuggestions}
          >
            Voir plus
            <ChevronUp aria-hidden="true" />
          </button>
        </div>

        <div
          className={`${styles.suggestionCards} ${
            isDraggingSuggestions ? styles.suggestionCardsDragging : ""
          }`}
          ref={suggestionCardsRef}
          onWheel={handleSuggestionsWheel}
          onPointerDown={handleSuggestionsPointerDown}
          onPointerMove={handleSuggestionsPointerMove}
          onPointerUp={stopSuggestionsDrag}
          onPointerCancel={stopSuggestionsDrag}
          onLostPointerCapture={stopSuggestionsDrag}
          onClickCapture={handleSuggestionClickCapture}
          onDragStart={(event) => event.preventDefault()}
        >
          {recommendedEvents.map((event) => (
            <EventCard
              key={`suggestion-${event.id}`}
              title={event.title}
              city={event.city}
              dateLabel={event.dateLabel}
              host={event.host}
              variant={event.variant}
              href={buildMealEventHref(event.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
