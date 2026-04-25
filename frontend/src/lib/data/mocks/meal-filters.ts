import type { MealFilterGroup } from "../types";

export const MOCK_MEAL_FILTER_GROUPS: MealFilterGroup[] = [
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
