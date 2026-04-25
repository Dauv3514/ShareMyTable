import { MOCK_MEAL_FILTER_GROUPS } from "./data/mocks/meal-filters";
import type {
  MealFilter,
  MealFilterCategory,
  MealFilterGroup,
} from "./data/types";
import { getMealEvents } from "./meal-data";

const mealFilterRepository = {
  listGroups(): MealFilterGroup[] {
    return MOCK_MEAL_FILTER_GROUPS;
  },
  list(): MealFilter[] {
    return this.listGroups().flatMap((group) => group.filters);
  },
  findById(filterId: string): MealFilter | undefined {
    return this.list().find((filter) => filter.id === filterId);
  },
};

export type { MealFilter, MealFilterCategory, MealFilterGroup };

export function getMealFilterGroups() {
  return mealFilterRepository.listGroups();
}

export function getMealFilters() {
  return mealFilterRepository.list();
}

export function getMealFilterById(filterId: string) {
  return mealFilterRepository.findById(filterId);
}

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

  return getMealEvents().filter((event) => {
    const matchesLocation =
      !normalizedLocation || normalizeText(event.city).includes(normalizedLocation);
    const matchesDate = !date || event.date === date;
    const matchesFilters =
      selectedFilters.size === 0 ||
      Array.from(selectedFilters).every((filter) => event.filters.includes(filter));

    return matchesLocation && matchesDate && matchesFilters;
  });
}