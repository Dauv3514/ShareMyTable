import { MOCK_MEAL_FILTER_GROUPS } from "./data/mocks/meal-filters";
import type {
  MealFilter,
  MealFilterCategory,
  MealFilterGroup,
  MealEvent,
} from "./data/types";

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

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isMealAvailable(event: MealEvent, today = getLocalDateKey(new Date())) {
  return !event.date || event.date >= today;
}

export function filterMealEvents({
  events,
  location,
  date,
  filters,
}: {
  events: MealEvent[];
  location?: string;
  date?: string;
  filters?: string[];
}) {
  const normalizedLocation = normalizeText(location ?? "");
  const selectedFilters = new Set(filters ?? []);

  return events.filter((event) => {
    const isAvailable = isMealAvailable(event);
    const matchesLocation =
      !normalizedLocation || normalizeText(event.city).includes(normalizedLocation);
    const matchesDate = !date || event.date === date;
    const matchesFilters =
      selectedFilters.size === 0 ||
      Array.from(selectedFilters).every((filter) => event.filters.includes(filter));

    return isAvailable && matchesLocation && matchesDate && matchesFilters;
  });
}
