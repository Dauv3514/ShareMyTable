"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import EventCard from "@/components/EventCard";
import SearchResultCard from "@/components/SearchResultCard";
import SearchBar from "@/components/SearchBar";
import SearchMap from "@/components/SearchMap";
import { filterMealEvents, mealEvents, mealFilterById } from "@/lib/search-data";
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
  const location = searchParams.get("lieu") ?? "";
  const date = searchParams.get("date") ?? "";
  const filters = useMemo(
    () => parseFilters(searchParams.get("filters")),
    [searchParams],
  );
  const events = useMemo(
    () => filterMealEvents({ location, date, filters }),
    [date, filters, location],
  );
  const shouldShowMap = location.trim().length > 0;
  const recommendedEvents = useMemo(() => {
    const resultIds = new Set(events.map((event) => event.id));
    const recommendations = mealEvents.filter((event) => !resultIds.has(event.id));

    return (recommendations.length > 0 ? recommendations : mealEvents).slice(0, 4);
  }, [events]);
  const activeFilters = filters
    .map((filterId) => {
      const filter = mealFilterById.get(filterId);
      return filter ? { id: filterId, label: filter.label } : null;
    })
    .filter((filter): filter is { id: string; label: string } => Boolean(filter));
  const hasCriteria = Boolean(location || date || filters.length > 0);

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

  return (
    <div className={styles.page}>
      <SearchBar
        initialLocation={location}
        initialDate={date}
        initialFilters={filters}
      />

      {shouldShowMap && (
        <SearchMap key={location} location={location} eventCount={events.length} />
      )}

      <section className={styles.filters} aria-label="Filtres actifs">
        {location && (
          <button
            type="button"
            className={styles.filterChip}
            onClick={() => updateSearch({ location: "" })}
            aria-label={`Retirer le filtre lieu ${location}`}
          >
            <span>Lieu: {location}</span>
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
            <span>Date: {date}</span>
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
        {!hasCriteria && <span className={styles.filterHint}>Tous les événements</span>}
      </section>

      <section className={styles.results} aria-label="Événements">
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
            <h2>Aucun repas ne correspond</h2>
            <p>Essayez une autre ville, une autre date ou moins de filtres.</p>
          </div>
        )}
      </section>

      <section className={styles.suggestions} aria-label="Vous aimeriez aussi">
        <div className={styles.suggestionsHead}>
          <div>
            <h2>Vous aimeriez aussi</h2>
            <p>Les autres événements près de chez vous</p>
          </div>
        </div>

        <div className={styles.suggestionCards}>
          {recommendedEvents.map((event) => (
            <EventCard
              key={`suggestion-${event.id}`}
              title={event.title}
              city={event.city}
              dateLabel={event.dateLabel}
              host={event.host}
              variant={event.variant}
            />
          ))}
        </div>
      </section>
    </div>
  );
}