import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MOCK_HOST_PROFILES } from "./data/mocks/host-profiles";
import { MOCK_MEAL_EVENTS } from "./data/mocks/meal-events";
import type { HostProfile, HostReview, MealEvent, MealMenuSection } from "./data/types";
import { getNextImageSrc, sanitizeNextImageSrc } from "./image-src";

type ApiMealHostSummary = {
  userId: number;
  pseudo: string | null;
  city: string;
  country: string;
};

type ApiMealItem = {
  id: number;
  title: string | null;
  mealType: string | null;
  menuDescription: string | null;
  dateTime: string;
  seatsTotal: number;
  currentParticipants?: number;
  pricePerSeatCents: number;
  houseRules: string | null;
  status: "draft" | "published" | "cancelled" | "done";
  createdAt: string;
  updatedAt: string;
  host: ApiMealHostSummary;
};

type ApiMealsResponse = {
  items: ApiMealItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type ApiPublicHostProfile = {
  id: number;
  isActive: boolean;
  homePhotoUrl: string | null;
  validationStatus: string;
  hostLevel: number;
  activatedAt: string | null;
  lat: number | null;
  lng: number | null;
  country: string;
  city: string;
  districtLabel: string;
  address: string;
  addressVerified: boolean;
  homePhotoVerified: boolean;
  verificationScore: number;
  autoReviewNotes: string | null;
  lastAutoReviewedAt: string | null;
  homePhotoVisionLabels: Array<{ description: string; score: number | null }>;
  homePhotoSafeSearch: Record<string, string | null> | null;
  verificationRiskFlags: string[];
  manualReviewRequired: boolean;
  user: {
    userId: number;
    pseudo: string | null;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
    bio: string | null;
    createdAt: string;
  };
  stats: {
    publishedMealsCount: number;
    completedMealsCount: number;
  };
};

type MealQueryParams = {
  hostId?: string | number;
  limit?: number;
};

type EventDetailPayload = {
  event: MealEvent;
  hostProfile: HostProfile;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const filterKeywordMap: Array<{ id: string; keywords: string[] }> = [
  { id: "vegan", keywords: ["vegetalien", "vegan", "vegetal"] },
  { id: "vegetarien", keywords: ["vegetarien", "veggie"] },
  { id: "flexitarien", keywords: ["flexitarien", "flexi"] },
  { id: "sans-lactose", keywords: ["sans lactose"] },
  { id: "sans-gluten", keywords: ["sans gluten", "gluten free"] },
  { id: "halal", keywords: ["halal"] },
  { id: "casher", keywords: ["casher"] },
  { id: "pas-de-porc", keywords: ["sans porc", "pas de porc"] },
  { id: "allergie-aux-noix", keywords: ["sans noix", "sans amandes", "fruits a coque"] },
  { id: "diabetique", keywords: ["sans sucre", "diabete", "diabetique"] },
  { id: "ambiance-decontractee", keywords: ["decontracte", "detendu", "brunch"] },
  { id: "soiree-jeux", keywords: ["soiree jeux", "jeux", "game night"] },
  { id: "decouverte-culinaire", keywords: ["decouverte culinaire", "degustation", "saveurs"] },
  { id: "repas-calme", keywords: ["calme", "intimiste"] },
  { id: "echange-linguistique", keywords: ["echange linguistique", "bilingue", "anglais"] },
  { id: "cuisine-du-monde", keywords: ["cuisine du monde", "couscous", "dhal", "tapas"] },
  { id: "repas-en-plein-air", keywords: ["plein air", "terrasse", "jardin"] },
  { id: "convivial-et-festif", keywords: ["convivial", "festif", "apero"] },
  { id: "sans-ecrans", keywords: ["sans ecrans", "deconnecte"] },
  {
    id: "discussions-enrichissantes",
    keywords: ["discussion", "echanges", "conversation"],
  },
];

function buildUrl(path: string, query?: Record<string, string | number | undefined>) {
  const baseUrl =
    typeof window === "undefined"
      ? apiUrl
      : "/api";

  if (!baseUrl) {
    return null;
  }

  const url = baseUrl.startsWith("http")
    ? new URL(path, baseUrl)
    : new URL(`${baseUrl}${path}`, window.location.origin);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && `${value}`.length > 0) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

async function fetchJson<T>(path: string, query?: Record<string, string | number | undefined>) {
  const url = buildUrl(path, query);

  if (!url) {
    return null;
  }

  try {
    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function pickFallbackEvent(seed: string | number) {
  const index = Math.abs(Number.parseInt(String(seed), 10) || 0) % MOCK_MEAL_EVENTS.length;
  return MOCK_MEAL_EVENTS[index];
}

function pickFallbackHost(seed: string | number) {
  const exactMatch = MOCK_HOST_PROFILES.find((host) => host.id === String(seed));
  if (exactMatch) {
    return exactMatch;
  }

  const index = Math.abs(Number.parseInt(String(seed), 10) || 0) % MOCK_HOST_PROFILES.length;
  return MOCK_HOST_PROFILES[index];
}

function capitalize(value: string) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildHostName(params: {
  firstName?: string | null;
  lastName?: string | null;
  pseudo?: string | null;
  fallback: string;
}) {
  const fullName = [params.firstName, params.lastName].filter(Boolean).join(" ").trim();
  if (fullName) {
    return fullName;
  }

  if (params.pseudo?.trim()) {
    return params.pseudo.trim();
  }

  return params.fallback;
}

function inferVariant(meal: ApiMealItem, fallback: MealEvent["variant"]): MealEvent["variant"] {
  const haystack = normalizeText(
    [meal.title, meal.mealType, meal.menuDescription, meal.houseRules].filter(Boolean).join(" "),
  );

  if (
    haystack.includes("vegetal") ||
    haystack.includes("veggie") ||
    haystack.includes("vegetar")
  ) {
    return "veggie";
  }

  if (fallback === "nearby") {
    return "nearby";
  }

  return "default";
}

function inferFilters(meal: ApiMealItem, fallbackFilters: string[]) {
  const haystack = normalizeText(
    [meal.title, meal.mealType, meal.menuDescription, meal.houseRules].filter(Boolean).join(" "),
  );

  const inferred = filterKeywordMap
    .filter(({ keywords }) => keywords.some((keyword) => haystack.includes(normalizeText(keyword))))
    .map(({ id }) => id);

  return inferred.length > 0 ? inferred : fallbackFilters;
}

function splitDescriptionItems(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(/[.,;:]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildMenuSections(meal: ApiMealItem, fallbackSections: MealMenuSection[]) {
  const items = splitDescriptionItems(meal.menuDescription);

  if (items.length === 0) {
    return fallbackSections;
  }

  const title = meal.mealType?.trim() || "Menu";

  return [
    {
      title,
      items,
    },
  ];
}

function buildPreferenceGroups(filters: string[], fallback: MealEvent["dietaryPreferenceGroups"]) {
  if (filters.length === 0) {
    return fallback;
  }

  return [
    {
      title: "Compatibilites",
      items: filters,
    },
  ];
}

function mergeHomePhotos(homePhotoUrl: string | null | undefined, fallbackPhotos: string[]) {
  const photos = [homePhotoUrl, ...fallbackPhotos]
    .map((photoUrl) => sanitizeNextImageSrc(photoUrl))
    .filter((photoUrl): photoUrl is string => Boolean(photoUrl));

  return photos.length > 0 ? photos.slice(0, 4) : [getNextImageSrc(null)];
}

function mapMealToEvent(
  meal: ApiMealItem,
  options?: {
    fallbackEvent?: MealEvent;
    hostProfile?: HostProfile | null;
  },
): MealEvent {
  const fallbackEvent = options?.fallbackEvent ?? pickFallbackEvent(meal.id);
  const eventDate = new Date(meal.dateTime);
  const derivedFilters = inferFilters(meal, fallbackEvent.filters);
  const hostName = options?.hostProfile?.name
    ?? buildHostName({
      pseudo: meal.host.pseudo,
      fallback: fallbackEvent.host,
    });

  return {
    id: String(meal.id),
    title: meal.title?.trim() || fallbackEvent.title,
    city: meal.host.city || options?.hostProfile?.city || fallbackEvent.city,
    locationLabel:
      options?.hostProfile?.districtLabel ||
      options?.hostProfile?.address ||
      options?.hostProfile?.city ||
      fallbackEvent.locationLabel,
    hostId: String(meal.host.userId),
    date: format(eventDate, "yyyy-MM-dd"),
    dateLabel: capitalize(format(eventDate, "EEE d MMM", { locale: fr })),
    detailDateLabel: capitalize(format(eventDate, "EEEE d MMMM", { locale: fr })),
    timeLabel: format(eventDate, "HH'h'mm"),
    host: hostName,
    variant: inferVariant(meal, fallbackEvent.variant),
    filters: derivedFilters,
    pricePerPerson: Math.round(meal.pricePerSeatCents / 100),
    currentParticipants:
      typeof meal.currentParticipants === "number"
        ? meal.currentParticipants
        : fallbackEvent.currentParticipants,
    maxParticipants: meal.seatsTotal || fallbackEvent.maxParticipants,
    participantProfileIds: fallbackEvent.participantProfileIds,
    menuSections: buildMenuSections(meal, fallbackEvent.menuSections),
    dietaryPreferenceGroups: buildPreferenceGroups(
      derivedFilters,
      fallbackEvent.dietaryPreferenceGroups,
    ),
  };
}

function mapApiHostToProfile(apiHost: ApiPublicHostProfile): HostProfile {
  const fallbackHost = pickFallbackHost(apiHost.user.userId);
  const name = buildHostName({
    firstName: apiHost.user.firstName,
    lastName: apiHost.user.lastName,
    pseudo: apiHost.user.pseudo,
    fallback: fallbackHost.name,
  });

  const quoteSource = apiHost.user.bio?.trim() || fallbackHost.quote;
  const quote = quoteSource.split(".")[0]?.trim() || fallbackHost.quote;

  return {
    id: String(apiHost.user.userId),
    name,
    city: apiHost.city || fallbackHost.city,
    country: apiHost.country,
    districtLabel: apiHost.districtLabel,
    address: apiHost.address,
    quote,
    bio: apiHost.user.bio?.trim() || fallbackHost.bio,
    photoUrl: apiHost.user.profilePhotoUrl || fallbackHost.photoUrl,
    homePhotoUrl: apiHost.homePhotoUrl,
    homePhotos: mergeHomePhotos(apiHost.homePhotoUrl, fallbackHost.homePhotos),
    reviewCount: fallbackHost.reviewCount,
    rating: fallbackHost.rating,
    completedEvents:
      apiHost.stats.completedMealsCount ||
      apiHost.stats.publishedMealsCount ||
      fallbackHost.completedEvents,
    responseRate: fallbackHost.responseRate,
    reviews: fallbackHost.reviews as HostReview[],
  };
}

async function fetchMeals(params?: MealQueryParams) {
  const response = await fetchJson<ApiMealsResponse>("/meals", {
    limit: params?.limit ?? 50,
    hostId: params?.hostId,
  });

  return response?.items ?? [];
}

async function fetchMealById(eventId: string | number) {
  return fetchJson<ApiMealItem>(`/meals/${eventId}`);
}

async function fetchPublicHostProfile(hostId: string | number) {
  return fetchJson<ApiPublicHostProfile>(`/host-profiles/public/user/${hostId}`);
}

export type { HostProfile, HostReview, MealEvent };

export async function getMealEvents() {
  const meals = await fetchMeals();
  if (meals.length === 0) {
    return MOCK_MEAL_EVENTS;
  }

  return meals.map((meal) => mapMealToEvent(meal));
}

export async function getMealEventById(eventId: string) {
  const meal = await fetchMealById(eventId);

  if (!meal) {
    return MOCK_MEAL_EVENTS.find((event) => event.id === eventId);
  }

  const hostProfile = await getHostProfileById(String(meal.host.userId));
  return mapMealToEvent(meal, { hostProfile });
}

export async function getMealEventsByHostId(hostId: string) {
  const meals = await fetchMeals({ hostId });
  if (meals.length === 0) {
    return MOCK_MEAL_EVENTS.filter((event) => event.hostId === hostId);
  }

  const hostProfile = await getHostProfileById(hostId);
  return meals.map((meal) => mapMealToEvent(meal, { hostProfile }));
}

export async function getHostProfiles() {
  const meals = await fetchMeals();
  const hostIds = Array.from(new Set(meals.map((meal) => String(meal.host.userId))));
  const profiles = await Promise.all(hostIds.map((hostId) => getHostProfileById(hostId)));

  return profiles.filter((profile): profile is HostProfile => Boolean(profile));
}

export async function getHostProfileById(hostId: string) {
  const apiHost = await fetchPublicHostProfile(hostId);

  if (apiHost) {
    return mapApiHostToProfile(apiHost);
  }

  const numericId = Number.parseInt(hostId, 10);
  return pickFallbackHost(Number.isNaN(numericId) ? 0 : numericId);
}

export async function getEventDetailPayload(eventId: string): Promise<EventDetailPayload | null> {
  const meal = await fetchMealById(eventId);

  if (!meal) {
    const fallbackEvent = MOCK_MEAL_EVENTS.find((event) => event.id === eventId);

    if (!fallbackEvent) {
      return null;
    }

    return {
      event: fallbackEvent,
      hostProfile: await getHostProfileById(fallbackEvent.hostId),
    };
  }

  const hostProfile = await getHostProfileById(String(meal.host.userId));

  return {
    event: mapMealToEvent(meal, { hostProfile }),
    hostProfile,
  };
}

export function buildMealEventHref(eventId: string | number) {
  return `/evenements/${eventId}`;
}

export function buildMealEventMapHref(eventId: string | number) {
  return `/evenements/${eventId}/carte`;
}

export function buildHostProfileHref(hostId: string | number) {
  return `/profil/${hostId}`;
}
