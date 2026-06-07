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

const EVENT_SECTIONS: EventSection[] = [
  {
    slug: "prochainement",
    title: "Prochainement",
    description: "Ne manquez pas les prochains événements !",
    emptyTitle: "Aucun événement à venir",
    emptyDescription: "Les prochains événements apparaîtront ici.",
  },
  {
    slug: "veggie",
    title: "Veggie",
    description: "Découvrez la cuisine végétarienne",
    emptyTitle: "Aucun événement veggie pour le moment",
    emptyDescription: "Les prochains événements végétariens et végétaliens apparaîtront ici.",
  },
  {
    slug: "en-exterieur",
    title: "En exterieur",
    description: "Parfait pour profiter des beaux jours",
    emptyTitle: "Aucun événement en extérieur pour le moment",
    emptyDescription: "Les prochains événements en terrasse ou au jardin apparaîtront ici.",
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

export function getEventsForSection(events: MealEvent[], slug: EventSectionSlug) {
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

export function getHomeSections(events: MealEvent[]) {
  return EVENT_SECTIONS.map((section) => ({
    ...section,
    cards: getEventsForSection(events, section.slug).slice(0, 14),
  }));
}