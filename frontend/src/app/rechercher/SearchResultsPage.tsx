"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { WheelEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, X } from "lucide-react";
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

export default function SearchResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mealEvents, setMealEvents] = useState<MealEvent[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const suggestionCardsRef = useRef<HTMLDivElement>(null);
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

  const events = useMemo(
    () => filterMealEvents({ events: mealEvents, location, date, filters }),
    [date, filters, location, mealEvents],
  );
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
  const mapLocation = location.trim() || "Rennes";

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
          </div>

          <SearchMap
            key={mapLocation}
            location={mapLocation}
            eventCount={events.length}
            variant="hero"
          />

          <button
            type="button"
            className={styles.panelToggle}
            onClick={() => setPanelOpen((isOpen) => !isOpen)}
            aria-label={panelOpen ? "Refermer la liste des repas" : "Voir la liste des repas"}
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
                {events.length} {events.length > 1 ? "repas trouvés" : "repas trouvé"}
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
              <h2>Aucun repas ne correspond</h2>
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
          className={styles.suggestionCards}
          ref={suggestionCardsRef}
          onWheel={handleSuggestionsWheel}
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
