import type { HostProfile, MealEvent } from "./data/types";
import { MOCK_MEAL_EVENTS } from "./data/mocks/meal-events";
import { MOCK_HOST_PROFILES } from "./data/mocks/host-profiles";
import { getMealFilterById } from "./search-data";

export type ReservationStatus = "confirmed" | "pending" | "refused";
export type ReservationBadgeStatus = ReservationStatus | "past";
export type ReservationPaymentMethod = "card" | "apple-pay" | "paypal";
export type ReservationPaymentState =
  | "authorized"
  | "awaiting_host"
  | "refunded";

export type ReservationDraft = {
  seats: number;
  paymentMethod: ReservationPaymentMethod;
};

export type ReservationItem = {
  id: string;
  eventId: string;
  hostId: string;
  mealTitle: string;
  mealType: string;
  hostName: string;
  hostPhotoUrl: string | null;
  city: string;
  locationLabel: string;
  detailDateLabel: string;
  dateLabel: string;
  timeLabel: string;
  coverImageUrl: string;
  seats: number;
  pricePerSeat: number;
  totalPrice: number;
  status: ReservationStatus;
  paymentMethod: ReservationPaymentMethod;
  paymentState: ReservationPaymentState;
  createdAt: string;
  exactAddressLabel: string;
  addressReleaseLabel: string;
  cancellationPolicyLabel: string;
  houseRules: string[];
  dietaryTags: string[];
  ambianceTags: string[];
  reminderLabels: string[];
};

const DRAFT_STORAGE_PREFIX = "reservation-draft:";
const RESERVATIONS_STORAGE_KEY = "guest-reservations-v1";

function isBrowser() {
  return typeof window !== "undefined";
}

function toSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getHostById(hostId: string) {
  return MOCK_HOST_PROFILES.find((host) => host.id === hostId) ?? null;
}

function splitEventFilters(event: MealEvent) {
  return event.filters.reduce(
    (accumulator, filterId) => {
      const filter = getMealFilterById(filterId);

      if (!filter) {
        return accumulator;
      }

      if (filter.category === "meal-ambiance") {
        accumulator.ambianceTags.push(filter.label);
      } else {
        accumulator.dietaryTags.push(filter.label);
      }

      return accumulator;
    },
    {
      dietaryTags: [] as string[],
      ambianceTags: [] as string[],
    },
  );
}

function getMealTypeLabel(event: MealEvent) {
  return event.menuSections[1]?.title ?? event.menuSections[0]?.title ?? "Repas";
}

function buildHouseRules(event: MealEvent) {
  return [
    "Adresse exacte partagée 24h avant le repas.",
    "Paiement bloqué jusqu'à la tenue du repas.",
    event.currentParticipants + 1 >= event.maxParticipants
      ? "Table presque complète, merci de confirmer rapidement."
      : "Annulation gratuite jusqu'à 48h avant le repas.",
  ];
}

function buildReservationItem({
  event,
  hostProfile,
  seats,
  status,
  paymentMethod,
  createdAt,
}: {
  event: MealEvent;
  hostProfile: HostProfile;
  seats: number;
  status: ReservationStatus;
  paymentMethod: ReservationPaymentMethod;
  createdAt: string;
}): ReservationItem {
  const filters = splitEventFilters(event);

  return {
    id: `reservation-${toSlug(`${event.id}-${createdAt}`)}`,
    eventId: event.id,
    hostId: hostProfile.id,
    mealTitle: event.title,
    mealType: getMealTypeLabel(event),
    hostName: hostProfile.name,
    hostPhotoUrl: hostProfile.photoUrl ?? null,
    city: event.city,
    locationLabel: event.locationLabel,
    detailDateLabel: event.detailDateLabel,
    dateLabel: event.dateLabel,
    timeLabel: event.timeLabel,
    coverImageUrl: hostProfile.homePhotos[0] ?? "/photoRepas.png",
    seats,
    pricePerSeat: event.pricePerPerson,
    totalPrice: event.pricePerPerson * seats,
    status,
    paymentMethod,
    paymentState:
      status === "refused"
        ? "refunded"
        : status === "pending"
          ? "awaiting_host"
          : "authorized",
    createdAt,
    exactAddressLabel: hostProfile.address
      ? `${hostProfile.address}, ${event.city}`
      : `${event.locationLabel}, ${event.city}`,
    addressReleaseLabel:
      "Adresse exacte partagée dans le détail de la réservation 24h avant le repas",
    cancellationPolicyLabel: "Annulation gratuite jusqu'a 48h avant, puis retenue partielle.",
    houseRules: buildHouseRules(event),
    dietaryTags: filters.dietaryTags,
    ambianceTags: filters.ambianceTags,
    reminderLabels: ["Rappel automatique J-3", "Rappel automatique J-1"],
  };
}

function getDefaultReservationMocks(): ReservationItem[] {
  const seeds: Array<{
    eventId: string;
    seats: number;
    status: ReservationStatus;
    paymentMethod: ReservationPaymentMethod;
    createdAt: string;
  }> = [
    {
      eventId: "table-vegetale-rennes",
      seats: 2,
      status: "confirmed",
      paymentMethod: "card",
      createdAt: "2026-04-12T10:00:00.000Z",
    },
    {
      eventId: "dhal-naan-nantes",
      seats: 3,
      status: "pending",
      paymentMethod: "apple-pay",
      createdAt: "2026-04-13T14:25:00.000Z",
    },
    {
      eventId: "couscous-maison-paris",
      seats: 1,
      status: "refused",
      paymentMethod: "paypal",
      createdAt: "2026-04-08T09:40:00.000Z",
    },
  ];

  return seeds.flatMap((seed) => {
    const event = MOCK_MEAL_EVENTS.find((item) => item.id === seed.eventId);
    if (!event) {
      return [];
    }

    const hostProfile = getHostById(event.hostId);
    if (!hostProfile) {
      return [];
    }

    return [
      buildReservationItem({
        event,
        hostProfile,
        seats: seed.seats,
        status: seed.status,
        paymentMethod: seed.paymentMethod,
        createdAt: seed.createdAt,
      }),
    ];
  });
}

function readStorageReservations() {
  if (!isBrowser()) {
    return [] as ReservationItem[];
  }

  const rawValue = window.localStorage.getItem(RESERVATIONS_STORAGE_KEY);
  if (!rawValue) {
    const defaults = getDefaultReservationMocks();
    window.localStorage.setItem(RESERVATIONS_STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) {
      return getDefaultReservationMocks();
    }

    return parsed as ReservationItem[];
  } catch {
    const defaults = getDefaultReservationMocks();
    window.localStorage.setItem(RESERVATIONS_STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  }
}

function saveStorageReservations(reservations: ReservationItem[]) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(RESERVATIONS_STORAGE_KEY, JSON.stringify(reservations));
}

function getDraftStorageKey(eventId: string) {
  return `${DRAFT_STORAGE_PREFIX}${eventId}`;
}

export function readReservationDraft(eventId: string): ReservationDraft | null {
  if (!isBrowser()) {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(getDraftStorageKey(eventId));
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<ReservationDraft>;
    if (
      typeof parsed.seats !== "number" ||
      !["card", "apple-pay", "paypal"].includes(String(parsed.paymentMethod))
    ) {
      return null;
    }

    return {
      seats: Math.max(1, parsed.seats),
      paymentMethod: parsed.paymentMethod as ReservationPaymentMethod,
    };
  } catch {
    return null;
  }
}

export function saveReservationDraft(eventId: string, draft: ReservationDraft) {
  if (!isBrowser()) {
    return;
  }

  window.sessionStorage.setItem(getDraftStorageKey(eventId), JSON.stringify(draft));
}

export function clearReservationDraft(eventId: string) {
  if (!isBrowser()) {
    return;
  }

  window.sessionStorage.removeItem(getDraftStorageKey(eventId));
}

export function listGuestReservations() {
  return readStorageReservations().sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export function getGuestReservationById(reservationId: string) {
  return listGuestReservations().find((reservation) => reservation.id === reservationId) ?? null;
}

export function createGuestReservation({
  event,
  hostProfile,
  draft,
}: {
  event: MealEvent;
  hostProfile: HostProfile;
  draft: ReservationDraft;
}) {
  const createdAt = new Date().toISOString();
  const status: ReservationStatus = draft.seats > 2 ? "pending" : "confirmed";
  const reservation = buildReservationItem({
    event,
    hostProfile,
    seats: draft.seats,
    status,
    paymentMethod: draft.paymentMethod,
    createdAt,
  });

  const reservations = [reservation, ...readStorageReservations()];
  saveStorageReservations(reservations);
  clearReservationDraft(event.id);

  return reservation;
}

export function getReservationStatusLabel(status: ReservationStatus) {
  if (status === "confirmed") {
    return "Confirmée";
  }

  if (status === "pending") {
    return "En attente";
  }

  return "Refusée / remboursée";
}

export function isPastReservation(reservation: ReservationItem) {
  const event = MOCK_MEAL_EVENTS.find((item) => item.id === reservation.eventId);

  if (!event?.date) {
    return false;
  }

  const normalizedTime = reservation.timeLabel.replace("h", ":");
  const eventDateTime = new Date(`${event.date}T${normalizedTime}:00`);

  return eventDateTime.getTime() < Date.now();
}

export function getReservationBadgeStatus(
  reservation: ReservationItem,
): ReservationBadgeStatus {
  if (reservation.status === "confirmed" && isPastReservation(reservation)) {
    return "past";
  }

  return reservation.status;
}

export function getReservationBadgeLabel(status: ReservationBadgeStatus) {
  if (status === "past") {
    return "Passée";
  }

  return getReservationStatusLabel(status);
}

export function getReservationPaymentLabel(paymentState: ReservationPaymentState) {
  if (paymentState === "authorized") {
    return "Paiement autorisé et bloqué jusqu'au repas";
  }

  if (paymentState === "awaiting_host") {
    return "Paiement autorisé, en attente de validation hôte";
  }

  return "Paiement remboursé";
}