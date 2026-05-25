import { MealTagCategory } from './meal-tag.entity';

export type MealTagSeed = {
  code: string;
  label: string;
  category: MealTagCategory;
  sortOrder: number;
};

export const MEAL_TAG_SEEDS: MealTagSeed[] = [
  {
    code: 'arriver_a_l_heure',
    label: "Merci d'arriver à l'heure",
    category: MealTagCategory.HOUSE_RULE,
    sortOrder: 10,
  },
  {
    code: 'prevenir_allergie',
    label: "Préviens-moi en cas d'allergie",
    category: MealTagCategory.HOUSE_RULE,
    sortOrder: 20,
  },
  {
    code: 'non_fumeur',
    label: 'Non-fumeur',
    category: MealTagCategory.HOUSE_RULE,
    sortOrder: 30,
  },
  {
    code: 'pas_d_alcool',
    label: "Pas d'alcool",
    category: MealTagCategory.HOUSE_RULE,
    sortOrder: 40,
  },
  {
    code: 'pas_d_animaux',
    label: "Pas d'animaux",
    category: MealTagCategory.HOUSE_RULE,
    sortOrder: 50,
  },
  {
    code: 'retirer_ses_chaussures',
    label: 'Retirer ses chaussures',
    category: MealTagCategory.HOUSE_RULE,
    sortOrder: 60,
  },
  {
    code: 'ambiance_calme',
    label: 'Ambiance calme',
    category: MealTagCategory.HOUSE_RULE,
    sortOrder: 70,
  },
  {
    code: 'accessible_pmr',
    label: 'Accessible PMR',
    category: MealTagCategory.HOUSE_RULE,
    sortOrder: 80,
  },
  {
    code: 'vegetarien',
    label: 'Végétarien',
    category: MealTagCategory.DIETARY_PREFERENCE,
    sortOrder: 10,
  },
  {
    code: 'vegan',
    label: 'Vegan',
    category: MealTagCategory.DIETARY_PREFERENCE,
    sortOrder: 20,
  },
  {
    code: 'flexitarien',
    label: 'Flexitarien',
    category: MealTagCategory.DIETARY_PREFERENCE,
    sortOrder: 30,
  },
  {
    code: 'sans-gluten',
    label: 'Sans gluten',
    category: MealTagCategory.DIETARY_PREFERENCE,
    sortOrder: 40,
  },
  {
    code: 'sans-lactose',
    label: 'Sans lactose',
    category: MealTagCategory.DIETARY_PREFERENCE,
    sortOrder: 50,
  },
  {
    code: 'halal',
    label: 'Halal',
    category: MealTagCategory.DIETARY_PREFERENCE,
    sortOrder: 60,
  },
  {
    code: 'casher',
    label: 'Casher',
    category: MealTagCategory.DIETARY_PREFERENCE,
    sortOrder: 70,
  },
  {
    code: 'allergie-aux-noix',
    label: 'Allergie aux noix',
    category: MealTagCategory.DIETARY_PREFERENCE,
    sortOrder: 80,
  },
  {
    code: 'diabetique',
    label: 'Diabétique',
    category: MealTagCategory.DIETARY_PREFERENCE,
    sortOrder: 90,
  },
  {
    code: 'pas-de-porc',
    label: 'Pas de porc',
    category: MealTagCategory.DIETARY_PREFERENCE,
    sortOrder: 100,
  },
  {
    code: 'discussions-enrichissantes',
    label: 'Discussions enrichissantes',
    category: MealTagCategory.MEAL_AMBIANCE,
    sortOrder: 10,
  },
  {
    code: 'ambiance-decontractee',
    label: 'Ambiance décontractée',
    category: MealTagCategory.MEAL_AMBIANCE,
    sortOrder: 20,
  },
  {
    code: 'soiree-jeux',
    label: 'Soirée jeux',
    category: MealTagCategory.MEAL_AMBIANCE,
    sortOrder: 30,
  },
  {
    code: 'decouverte-culinaire',
    label: 'Découverte culinaire',
    category: MealTagCategory.MEAL_AMBIANCE,
    sortOrder: 40,
  },
  {
    code: 'repas-calme',
    label: 'Repas calme',
    category: MealTagCategory.MEAL_AMBIANCE,
    sortOrder: 50,
  },
  {
    code: 'echange-linguistique',
    label: 'Échange linguistique',
    category: MealTagCategory.MEAL_AMBIANCE,
    sortOrder: 60,
  },
  {
    code: 'cuisine-du-monde',
    label: 'Cuisine du monde',
    category: MealTagCategory.MEAL_AMBIANCE,
    sortOrder: 70,
  },
  {
    code: 'repas-en-plein-air',
    label: 'Repas en plein air',
    category: MealTagCategory.MEAL_AMBIANCE,
    sortOrder: 80,
  },
  {
    code: 'convivial-et-festif',
    label: 'Convivial et festif',
    category: MealTagCategory.MEAL_AMBIANCE,
    sortOrder: 90,
  },
  {
    code: 'sans-ecrans',
    label: 'Sans écrans',
    category: MealTagCategory.MEAL_AMBIANCE,
    sortOrder: 100,
  },
];