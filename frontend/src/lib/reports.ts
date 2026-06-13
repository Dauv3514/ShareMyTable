import axios from "axios";

export type ReportTargetType = "user" | "meal" | "booking" | "conversation";

export type ReportReason =
  | "inappropriate_behavior"
  | "harassment"
  | "safety"
  | "fraud"
  | "spam"
  | "wrong_information"
  | "payment"
  | "hygiene"
  | "other";

export type CreateReportPayload = {
  targetType: ReportTargetType;
  targetId: number;
  reason: ReportReason;
  description?: string;
};

export type ReportItem = {
  id: number;
  targetType: ReportTargetType;
  targetId: number;
  reason: ReportReason;
  description: string | null;
  status: "pending" | "in_review" | "resolved" | "dismissed";
  createdAt: string;
  updatedAt: string;
};

export type ReportUserSummary = {
  userId: number;
  pseudo: string | null;
  email: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl: string | null;
  displayName: string;
};

export type AdminReportItem = ReportItem & {
  reporter: ReportUserSummary | null;
  target: {
    label: string;
    detail: string | null;
    href: string | null;
    user: ReportUserSummary | null;
    meal: {
      id: number;
      title: string | null;
      status: string;
      dateTime: string;
      host: ReportUserSummary | null;
    } | null;
    booking: {
      id: number;
      status: string;
      seats: number;
      guest: ReportUserSummary | null;
      mealTitle: string | null;
    } | null;
    conversation: {
      id: number;
      title: string | null;
      type: string;
      mealTitle: string | null;
      members: ReportUserSummary[];
    } | null;
  };
  adminNote: string | null;
  reviewedBy: ReportUserSummary | null;
  reviewedAt: string | null;
};

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  inappropriate_behavior: "Comportement inapproprié",
  harassment: "Harcèlement ou propos déplacés",
  safety: "Problème de sécurité",
  fraud: "Suspicion de fraude",
  spam: "Spam ou démarchage",
  wrong_information: "Informations trompeuses",
  payment: "Problème de paiement",
  hygiene: "Problème d'hygiène",
  other: "Autre raison",
};

export const REPORT_TARGET_TYPE_LABELS: Record<ReportTargetType, string> = {
  user: "Profil",
  meal: "Repas",
  booking: "Réservation",
  conversation: "Conversation",
};

export const REPORT_STATUS_LABELS: Record<ReportItem["status"], string> = {
  pending: "En attente",
  in_review: "En examen",
  resolved: "Résolu",
  dismissed: "Classé sans suite",
};

export const REPORT_REASON_OPTIONS: Array<{
  value: ReportReason;
  label: string;
}> = [
  {
    value: "inappropriate_behavior",
    label: REPORT_REASON_LABELS.inappropriate_behavior,
  },
  {
    value: "harassment",
    label: REPORT_REASON_LABELS.harassment,
  },
  {
    value: "safety",
    label: REPORT_REASON_LABELS.safety,
  },
  {
    value: "fraud",
    label: REPORT_REASON_LABELS.fraud,
  },
  {
    value: "wrong_information",
    label: REPORT_REASON_LABELS.wrong_information,
  },
  {
    value: "spam",
    label: REPORT_REASON_LABELS.spam,
  },
  {
    value: "other",
    label: REPORT_REASON_LABELS.other,
  },
];

export async function submitReport(token: string, payload: CreateReportPayload) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("API_URL manquante.");
  }

  const response = await axios.post<ReportItem>(`${apiUrl}/reports`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

export async function fetchAdminReports(token: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("API_URL manquante.");
  }

  const response = await axios.get<AdminReportItem[]>(`${apiUrl}/reports/admin`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

export function getReportErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (Array.isArray(message)) {
      return message.join(", ");
    }

    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Impossible d'envoyer le signalement pour le moment.";
}
