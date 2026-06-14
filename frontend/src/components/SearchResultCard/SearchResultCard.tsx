"use client";

import Image from "next/image";
import Link from "next/link";
import { getMealFilterById } from "@/lib/search-data";
import { buildMealEventHref } from "@/lib/meal-data";
import type { MealEvent } from "@/lib/data/types";
import { getNextImageSrc } from "@/lib/image-src";
import "./search-result-card.scss";

type SearchResultCardProps = {
  event: MealEvent;
};

export default function SearchResultCard({ event }: SearchResultCardProps) {
  const visibleFilters = event.filters
    .map((filterId) => getMealFilterById(filterId)?.label)
    .filter(Boolean)
    .slice(0, 2);

  return (
    <Link
      href={buildMealEventHref(event.id)}
      className={`search-result-card search-result-card--${event.variant}`}
    >
      <div className="search-result-card__media">
        <Image
          src={getNextImageSrc(event.imageUrl)}
          alt={event.title}
          fill
          sizes="(max-width: 720px) 360px, 440px"
          className="search-result-card__image"
        />
      </div>

      <div className="search-result-card__content">
        <div className="search-result-card__host">
          <span>{event.host}</span>
        </div>

        <div className="search-result-card__meta">
          <span>{event.city}</span>
          <span>{event.dateLabel}</span>
        </div>
      </div>

      <h2>{event.title}</h2>

      {visibleFilters.length > 0 && (
        <div className="search-result-card__tags" aria-label="Filtres compatibles">
          {visibleFilters.map((filter) => (
            <span key={filter}>{filter}</span>
          ))}
        </div>
      )}
    </Link>
  );
}
