import axios from "axios";

export type HostBookingStatus =
  | "pending"
  | "confirmed"
  | "refused"
  | "cancelled"
  | "completed";

export type HostBookingPaymentState =
  | "authorized"
  | "awaiting_host"
  | "refunded";

export type HostMealBookingSummary = {
  mealId: number;
  mealTitle: string | null;
  mealStatus: "draft" | "published" | "cancelled" | "done";
  mealDateTime: string;
  seatsTotal: number;
  pendingBookingsCount: number;
  pendingSeatsCount: number;
  confirmedBookingsCount: number;
  confirmedSeatsCount: number;
  refusedBookingsCount: number;
  cancelledBookingsCount: number;
  totalActiveSeatsCount: number;
};

export type HostBookingGuest = {
  userId: number;
  pseudo: string | null;
  firstName: string;
  lastName: string;
  city: string;
  country: string;
  profilePhotoUrl: string | null;
};

export type HostBooking = {
  id: number;
  mealId: number;
  seats: number;
  bookingStatus: HostBookingStatus;
  paymentState: HostBookingPaymentState;
  totalPriceCents: number;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  refusedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  refusalReason: string | null;
  guest: HostBookingGuest;
};

export type HostMealBookings = HostMealBookingSummary & {
  bookings: HostBooking[];
};

function getHostBookingsApiContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const token = window.localStorage.getItem("token");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!token || !apiUrl) {
    return null;
  }

  return { token, apiUrl };
}

function getHostBookingsErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (Array.isArray(message)) {
      return message.join(", ");
    }

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
}

function getRequiredApiContext() {
  const apiContext = getHostBookingsApiContext();

  if (!apiContext) {
    throw new Error("Session invalide. Reconnecte-toi.");
  }

  return apiContext;
}

export async function listHostMealBookingSummaries() {
  const apiContext = getRequiredApiContext();

  try {
    const response = await axios.get<HostMealBookingSummary[]>(
      `${apiContext.apiUrl}/bookings/host/meals`,
      {
        headers: {
          Authorization: `Bearer ${apiContext.token}`,
        },
      },
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getHostBookingsErrorMessage(
        error,
        "Impossible de charger les demandes de réservation.",
      ),
    );
  }
}

export async function getHostMealBookings(mealId: string | number) {
  const apiContext = getRequiredApiContext();

  try {
    const response = await axios.get<HostMealBookings>(
      `${apiContext.apiUrl}/bookings/host/meals/${mealId}`,
      {
        headers: {
          Authorization: `Bearer ${apiContext.token}`,
        },
      },
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getHostBookingsErrorMessage(
        error,
        "Impossible de charger les demandes de cette événement.",
      ),
    );
  }
}

export async function acceptHostBooking(bookingId: number) {
  const apiContext = getRequiredApiContext();

  try {
    const response = await axios.patch<HostBooking>(
      `${apiContext.apiUrl}/bookings/host/${bookingId}/accept`,
      {},
      {
        headers: {
          Authorization: `Bearer ${apiContext.token}`,
        },
      },
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getHostBookingsErrorMessage(
        error,
        "Impossible d'accepter cette demande.",
      ),
    );
  }
}

export async function refuseHostBooking(bookingId: number, reason?: string) {
  const apiContext = getRequiredApiContext();

  try {
    const response = await axios.patch<HostBooking>(
      `${apiContext.apiUrl}/bookings/host/${bookingId}/refuse`,
      {
        reason,
      },
      {
        headers: {
          Authorization: `Bearer ${apiContext.token}`,
        },
      },
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getHostBookingsErrorMessage(
        error,
        "Impossible de refuser cette demande.",
      ),
    );
  }
}