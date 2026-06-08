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

export const REPORT_REASON_OPTIONS: Array<{
  value: ReportReason;
  label: string;
}> = [
  {
    value: "inappropriate_behavior",
    label: "Comportement inapproprié",
  },
  {
    value: "harassment",
    label: "Harcèlement ou propos déplacés",
  },
  {
    value: "safety",
    label: "Problème de sécurité",
  },
  {
    value: "fraud",
    label: "Suspicion de fraude",
  },
  {
    value: "wrong_information",
    label: "Informations trompeuses",
  },
  {
    value: "spam",
    label: "Spam ou démarchage",
  },
  {
    value: "other",
    label: "Autre raison",
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
