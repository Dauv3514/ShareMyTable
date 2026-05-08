import type { MealFilterGroup } from "../types";

export const MOCK_MEAL_FILTER_GROUPS: MealFilterGroup[] = [
  {
    id: "dietary-preferences",
    title: "Régime & préférences alimentaires",
    subtitle: "Contraintes et choix alimentaires de l'invité",
    filters: [
      {
        id: "vegetarien",
        label: "Végétarien",
        description: "Sans viande ni poisson",
        category: "dietary-preferences",
      },
      {
        id: "vegan",
        label: "Vegan",
        description: "Sans produits d'origine animale",
        category: "dietary-preferences",
      },
      {
        id: "flexitarien",
        label: "Flexitarien",
        description: "Mange varié avec peu de viande",
        category: "dietary-preferences",
      },
      {
        id: "sans-gluten",
        label: "Sans gluten",
        description: "Évite le gluten",
        category: "dietary-preferences",
      },
      {
        id: "sans-lactose",
        label: "Sans lactose",
        description: "Évite les produits laitiers",
        category: "dietary-preferences",
      },
      {
        id: "halal",
        label: "Halal",
        description: "Préférence conforme aux règles islamiques",
        category: "dietary-preferences",
      },
      {
        id: "casher",
        label: "Casher",
        description: "Préférence conforme aux règles juives",
        category: "dietary-preferences",
      },
      {
        id: "allergie-aux-noix",
        label: "Allergie aux noix",
        description: "Évite noix, amandes et noisettes",
        category: "dietary-preferences",
      },
      {
        id: "diabetique",
        label: "Diabétique",
        description: "Attention aux sucres rapides",
        category: "dietary-preferences",
      },
      {
        id: "pas-de-porc",
        label: "Pas de porc",
        description: "N'inclut pas de porc",
        category: "dietary-preferences",
      },
    ],
  },
  {
    id: "meal-ambiance",
    title: "Ambiance & style de repas",
    subtitle: "Ce que l'invité aime vivre autour d'une table",
    filters: [
      {
        id: "discussions-enrichissantes",
        label: "Discussions enrichissantes",
        description: "Aime les échanges profonds",
        category: "meal-ambiance",
      },
      {
        id: "ambiance-decontractee",
        label: "Ambiance décontractée",
        description: "Repas simple et détendu",
        category: "meal-ambiance",
      },
      {
        id: "soiree-jeux",
        label: "Soirée jeux",
        description: "Moments ludiques autour de la table",
        category: "meal-ambiance",
      },
      {
        id: "decouverte-culinaire",
        label: "Découverte culinaire",
        description: "Envie de goûter de nouvelles saveurs",
        category: "meal-ambiance",
      },
      {
        id: "repas-calme",
        label: "Repas calme",
        description: "Préférence pour une ambiance posée",
        category: "meal-ambiance",
      },
      {
        id: "echange-linguistique",
        label: "Échange linguistique",
        description: "Aime pratiquer une langue à table",
        category: "meal-ambiance",
      },
      {
        id: "cuisine-du-monde",
        label: "Cuisine du monde",
        description: "Curieux des cuisines internationales",
        category: "meal-ambiance",
      },
      {
        id: "repas-en-plein-air",
        label: "Repas en plein air",
        description: "Aime manger dehors",
        category: "meal-ambiance",
      },
      {
        id: "convivial-et-festif",
        label: "Convivial et festif",
        description: "Recherche une table vivante",
        category: "meal-ambiance",
      },
      {
        id: "sans-ecrans",
        label: "Sans écrans",
        description: "Moment de partage déconnecté",
        category: "meal-ambiance",
      },
    ],
  },
];