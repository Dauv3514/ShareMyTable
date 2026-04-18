export type MealFilterCategory = "imperatifs" | "stricts" | "preferences" | "nutrition";

export type MealFilter = {
  id: string;
  label: string;
  description: string;
  category: MealFilterCategory;
};

export type MealEvent = {
  id: string;
  title: string;
  city: string;
  date: string;
  dateLabel: string;
  host: string;
  variant: "default" | "veggie" | "nearby";
  filters: string[];
};

export const mealFilterGroups: Array<{
  id: MealFilterCategory;
  title: string;
  filters: MealFilter[];
}> = [
  {
    id: "imperatifs",
    title: "Impératifs",
    filters: [
      {
        id: "sans-arachides",
        label: "Sans arachides",
        description: "Allergie aux cacahuètes - risque vital",
        category: "imperatifs",
      },
      {
        id: "sans-fruits-a-coque",
        label: "Sans fruits à coque",
        description: "Noix, amandes, noisettes - risque vital",
        category: "imperatifs",
      },
      {
        id: "sans-gluten",
        label: "Sans gluten",
        description: "Pour maladie cœliaque ou intolérance",
        category: "imperatifs",
      },
      {
        id: "sans-lactose",
        label: "Sans lactose",
        description: "Intolérance aux produits laitiers",
        category: "imperatifs",
      },
      {
        id: "sans-oeufs",
        label: "Sans œufs",
        description: "Allergie aux œufs",
        category: "imperatifs",
      },
      {
        id: "sans-poisson",
        label: "Sans poisson",
        description: "Allergie aux poissons",
        category: "imperatifs",
      },
      {
        id: "sans-crustaces",
        label: "Sans crustacés",
        description: "Allergie aux crevettes, crabes",
        category: "imperatifs",
      },
      {
        id: "sans-soja",
        label: "Sans soja",
        description: "Allergie au soja",
        category: "imperatifs",
      },
      {
        id: "sans-sesame",
        label: "Sans sésame",
        description: "Allergie au sésame",
        category: "imperatifs",
      },
      {
        id: "sans-moutarde",
        label: "Sans moutarde",
        description: "Allergie à la moutarde",
        category: "imperatifs",
      },
      {
        id: "sans-celeri",
        label: "Sans céleri",
        description: "Allergie au céleri",
        category: "imperatifs",
      },
      {
        id: "sans-lupin",
        label: "Sans lupin",
        description: "Allergie au lupin",
        category: "imperatifs",
      },
      {
        id: "sans-mollusques",
        label: "Sans mollusques",
        description: "Moules, huîtres, calamars",
        category: "imperatifs",
      },
      {
        id: "sans-sulfites",
        label: "Sans sulfites",
        description: "Sensibilité aux sulfites",
        category: "imperatifs",
      },
    ],
  },
  {
    id: "stricts",
    title: "Régimes stricts",
    filters: [
      {
        id: "vegetalien",
        label: "Végétalien",
        description: "Pas de produits animaux du tout",
        category: "stricts",
      },
      {
        id: "vegetarien",
        label: "Végétarien",
        description: "Pas de viande ni poisson",
        category: "stricts",
      },
      {
        id: "halal",
        label: "Halal",
        description: "Conforme aux règles islamiques",
        category: "stricts",
      },
      {
        id: "casher",
        label: "Casher",
        description: "Conforme aux règles juives",
        category: "stricts",
      },
      {
        id: "pescetarien",
        label: "Pescétarien",
        description: "Pas de viande, mais poisson OK",
        category: "stricts",
      },
    ],
  },
  {
    id: "preferences",
    title: "Préférences courantes",
    filters: [
      {
        id: "sans-porc",
        label: "Sans porc",
        description: "Pour convictions religieuses/personnelles",
        category: "preferences",
      },
      {
        id: "sans-viande-rouge",
        label: "Sans viande rouge",
        description: "Pas de bœuf, agneau, porc",
        category: "preferences",
      },
      {
        id: "bio-uniquement",
        label: "Bio uniquement",
        description: "Produits biologiques",
        category: "preferences",
      },
      {
        id: "sans-sucre-ajoute",
        label: "Sans sucre ajouté",
        description: "Pour santé/diabète",
        category: "preferences",
      },
      {
        id: "sans-alcool",
        label: "Sans alcool",
        description: "Pas de vin, bière, spiritueux",
        category: "preferences",
      },
      {
        id: "non-epice",
        label: "Non épicé",
        description: "Repas doux, sans piment",
        category: "preferences",
      },
    ],
  },
  {
    id: "nutrition",
    title: "Nutrition",
    filters: [
      {
        id: "faible-graisses-saturees",
        label: "Faible en graisses saturées",
        description: "Pour limiter le cholestérol",
        category: "nutrition",
      },
      {
        id: "faible-matieres-grasses",
        label: "Faible en matières grasses",
        description: "Repas léger en lipides",
        category: "nutrition",
      },
      {
        id: "faible-calories",
        label: "Faible en calories",
        description: "Repas plus léger",
        category: "nutrition",
      },
      {
        id: "riche-fibres",
        label: "Riche en fibres",
        description: "Légumes, céréales complètes",
        category: "nutrition",
      },
      {
        id: "faible-sel",
        label: "Faible en sel",
        description: "Pour limiter le sodium",
        category: "nutrition",
      },
    ],
  },
];

export const mealFilters = mealFilterGroups.flatMap((group) => group.filters);

export const mealFilterById = new Map(mealFilters.map((filter) => [filter.id, filter]));

export const mealEvents: MealEvent[] = [
  {
    id: "brunch-samedi-rennes",
    title: "Brunch du samedi",
    city: "Rennes",
    date: "2026-04-24",
    dateLabel: "Ven. 24 avr.",
    host: "Antoine GREGE",
    variant: "default",
    filters: ["vegetarien", "sans-porc", "sans-alcool", "riche-fibres"],
  },
  {
    id: "table-vegetale-rennes",
    title: "Table végétale",
    city: "Rennes",
    date: "2026-04-25",
    dateLabel: "Sam. 25 avr.",
    host: "Emma DUBOIS",
    variant: "veggie",
    filters: [
      "vegetalien",
      "sans-lactose",
      "sans-oeufs",
      "non-epice",
      "faible-graisses-saturees",
      "riche-fibres",
    ],
  },
  {
    id: "dhal-naan-nantes",
    title: "Dhal & naan",
    city: "Nantes",
    date: "2026-04-25",
    dateLabel: "Sam. 25 avr.",
    host: "Salome BRUN",
    variant: "veggie",
    filters: [
      "vegetarien",
      "sans-viande-rouge",
      "sans-alcool",
      "sans-moutarde",
      "faible-matieres-grasses",
    ],
  },
  {
    id: "couscous-maison-paris",
    title: "Couscous maison",
    city: "Paris",
    date: "2026-04-26",
    dateLabel: "Dim. 26 avr.",
    host: "Nora ZEGH",
    variant: "default",
    filters: ["halal", "sans-porc", "sans-alcool", "faible-sel"],
  },
  {
    id: "apero-tapas-lyon",
    title: "Apéro tapas",
    city: "Lyon",
    date: "2026-04-27",
    dateLabel: "Lun. 27 avr.",
    host: "Maxime PETIT",
    variant: "nearby",
    filters: [
      "pescetarien",
      "sans-viande-rouge",
      "sans-mollusques",
      "faible-graisses-saturees",
    ],
  },
  {
    id: "repas-sans-gluten-bordeaux",
    title: "Dîner sans gluten",
    city: "Bordeaux",
    date: "2026-04-28",
    dateLabel: "Mar. 28 avr.",
    host: "Claire DUMAS",
    variant: "default",
    filters: [
      "sans-gluten",
      "sans-arachides",
      "sans-fruits-a-coque",
      "sans-celeri",
      "sans-lupin",
      "faible-sel",
    ],
  },
  {
    id: "bio-marseille",
    title: "Assiette bio",
    city: "Marseille",
    date: "2026-04-29",
    dateLabel: "Mer. 29 avr.",
    host: "Julie RENARD",
    variant: "nearby",
    filters: [
      "bio-uniquement",
      "sans-sucre-ajoute",
      "sans-alcool",
      "non-epice",
      "faible-calories",
      "riche-fibres",
    ],
  },
  {
    id: "casher-strasbourg",
    title: "Table familiale",
    city: "Strasbourg",
    date: "2026-04-30",
    dateLabel: "Jeu. 30 avr.",
    host: "Noah GARNIER",
    variant: "default",
    filters: ["casher", "sans-crustaces", "sans-soja", "sans-sulfites"],
  },
];

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function filterMealEvents({
  location,
  date,
  filters,
}: {
  location?: string;
  date?: string;
  filters?: string[];
}) {
  const normalizedLocation = normalizeText(location ?? "");
  const selectedFilters = new Set(filters ?? []);

  return mealEvents.filter((event) => {
    const matchesLocation =
      !normalizedLocation || normalizeText(event.city).includes(normalizedLocation);
    const matchesDate = !date || event.date === date;
    const matchesFilters =
      selectedFilters.size === 0 ||
      Array.from(selectedFilters).every((filter) => event.filters.includes(filter));

    return matchesLocation && matchesDate && matchesFilters;
  });
}