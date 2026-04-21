"use client";

import Image from "next/image";
import { CalendarDays, MapPin, UserRound } from "lucide-react";
import { MealEvent, mealFilterById } from "@/lib/search-data";
import "./search-result-card.scss";

type SearchResultCardProps = {
  event: MealEvent;
};

export default function SearchResultCard({ event }: SearchResultCardProps) {
  const visibleFilters = event.filters
    .map((filterId) => mealFilterById.get(filterId)?.label)
    .filter(Boolean)
    .slice(0, 2);

  return (
    <article className={`search-result-card search-result-card--${event.variant}`}>
      <div className="search-result-card__media" aria-hidden="true">
        <div className="search-result-card__plate">
          <Image
            src="/ramenetapoire.svg"
            alt=""
            width={78}
            height={78}
            className="search-result-card__logo"
          />
        </div>
      </div>

      <div className="search-result-card__content">
        <div className="search-result-card__topline">
          <span>
            <MapPin aria-hidden="true" />
            {event.city}
          </span>
          <span>
            <CalendarDays aria-hidden="true" />
            {event.dateLabel}
          </span>
        </div>

        <div className="search-result-card__main">
          <h2>{event.title}</h2>
          <p>
            <UserRound aria-hidden="true" />
            {event.host}
          </p>
        </div>

        {visibleFilters.length > 0 && (
          <div className="search-result-card__tags" aria-label="Filtres compatibles">
            {visibleFilters.map((filter) => (
              <span key={filter}>{filter}</span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}