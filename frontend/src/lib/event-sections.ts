import type { MealEvent } from "./meal-data";

export type EventSectionSlug =
  | "prochainement"
  | "veggie"
  | "en-exterieur"
  | "autour-de-moi";

export type EventSection = {
  slug: EventSectionSlug;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
};

export type EventLocation = {
  lat: number;
  lng: number;
};

export const DEFAULT_NEARBY_RADIUS_KM = 50;

const EVENT_SECTIONS: EventSection[] = [
  {
    slug: "prochainement",
    title: "Prochainement",
    description: "Ne manquez pas les prochains événements !",
    emptyTitle: "Aucun événement à venir",
    emptyDescription: "Les prochains événements apparaîtront ici.",
  },
  {
    slug: "en-exterieur",
    title: "En extérieur",
    description: "Parfait pour profiter des beaux jours",
    emptyTitle: "Aucun événement en extérieur pour le moment",
    emptyDescription: "Les prochains événements en terrasse ou au jardin apparaîtront ici.",
  },
  {
    slug: "veggie",
    title: "Veggie",
    description: "Découvrez la cuisine végétarienne",
    emptyTitle: "Aucun événement veggie pour le moment",
    emptyDescription: "Les prochains événements végétariens et végétaliens apparaîtront ici.",
  },
  {
    slug: "autour-de-moi",
    title: "Autour de moi",
    description: "Les meilleurs événements près de chez vous",
    emptyTitle: "Aucun événement à proximité",
    emptyDescription: "Les événements proches de chez vous apparaîtront ici.",
  },
];

export function getEventSections() {
  return EVENT_SECTIONS;
}

export function getEventSectionBySlug(slug: string) {
  return EVENT_SECTIONS.find((section) => section.slug === slug);
}

export function buildEventSectionHref(slug: EventSectionSlug) {
  return `/evenements/voir-tout/${slug}`;
}

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function getDistanceKm(firstLocation: EventLocation, secondLocation: EventLocation) {
  const earthRadiusKm = 6371;
  const latDelta = ((secondLocation.lat - firstLocation.lat) * Math.PI) / 180;
  const lngDelta = ((secondLocation.lng - firstLocation.lng) * Math.PI) / 180;
  const firstLat = (firstLocation.lat * Math.PI) / 180;
  const secondLat = (secondLocation.lat * Math.PI) / 180;
  const haversine =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(firstLat) *
      Math.cos(secondLat) *
      Math.sin(lngDelta / 2) *
      Math.sin(lngDelta / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function getEventsAroundLocation(
  events: MealEvent[],
  location: EventLocation,
  radiusKm = DEFAULT_NEARBY_RADIUS_KM,
) {
  return events
    .map((event) => {
      if (!isFiniteCoordinate(event.locationLat) || !isFiniteCoordinate(event.locationLng)) {
        return null;
      }

      const distanceKm = getDistanceKm(location, {
        lat: event.locationLat,
        lng: event.locationLng,
      });

      if (distanceKm > radiusKm) {
        return null;
      }

      return { event, distanceKm };
    })
    .filter((entry): entry is { event: MealEvent; distanceKm: number } => Boolean(entry))
    .sort((firstEntry, secondEntry) => firstEntry.distanceKm - secondEntry.distanceKm)
    .map(({ event }) => event);
}

export function getEventsForSection(
  events: MealEvent[],
  slug: EventSectionSlug,
  location?: EventLocation,
) {
  if (slug === "veggie") {
    const veggieEvents = events.filter(
      (event) =>
        event.variant === "veggie" ||
        event.filters.includes("vegetarien") ||
        event.filters.includes("vegan"),
    );

    return veggieEvents.length > 0 ? veggieEvents : events;
  }

  if (slug === "autour-de-moi") {
    if (location) {
      const eventsAroundLocation = getEventsAroundLocation(events, location);

      if (eventsAroundLocation.length > 0) {
        return eventsAroundLocation;
      }
    }

    return [
      ...events.filter((event) => event.variant === "nearby"),
      ...events.filter((event) => event.variant !== "nearby"),
    ];
  }

  if (slug === "en-exterieur") {
    const outdoorEvents = events.filter((event) =>
      event.filters.includes("repas-en-plein-air"),
    );

    return outdoorEvents.length > 0 ? outdoorEvents : events;
  }

  return events;
}

export function getHomeSections(events: MealEvent[], location?: EventLocation) {
  return EVENT_SECTIONS.map((section) => ({
    ...section,
    cards: getEventsForSection(events, section.slug, location).slice(0, 14),
  }));
}
