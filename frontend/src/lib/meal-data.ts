import { MOCK_HOST_PROFILES } from "./data/mocks/host-profiles";
import { MOCK_MEAL_EVENTS } from "./data/mocks/meal-events";
import type { HostProfile, HostReview, MealEvent } from "./data/types";

const mealEventRepository = {
  list(): MealEvent[] {
    return MOCK_MEAL_EVENTS;
  },
  findById(eventId: string): MealEvent | undefined {
    return this.list().find((event) => event.id === eventId);
  },
  findByHostId(hostId: string): MealEvent[] {
    return this.list().filter((event) => event.hostId === hostId);
  },
};

const hostProfileRepository = {
  list(): HostProfile[] {
    return MOCK_HOST_PROFILES;
  },
  findById(hostId: string): HostProfile | undefined {
    return this.list().find((host) => host.id === hostId);
  },
};

export type { HostProfile, HostReview, MealEvent };

export function getMealEvents() {
  return mealEventRepository.list();
}

export function getMealEventById(eventId: string) {
  return mealEventRepository.findById(eventId);
}

export function getMealEventsByHostId(hostId: string) {
  return mealEventRepository.findByHostId(hostId);
}

export function getHostProfiles() {
  return hostProfileRepository.list();
}

export function getHostProfileById(hostId: string) {
  return hostProfileRepository.findById(hostId);
}

export function buildMealEventHref(eventId: string) {
  return `/evenements/${eventId}`;
}

export function buildMealEventMapHref(eventId: string) {
  return `/evenements/${eventId}/carte`;
}

export function buildHostProfileHref(hostId: string) {
  return `/profil/${hostId}`;
}
