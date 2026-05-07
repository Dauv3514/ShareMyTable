import axios from "axios";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { io, type Socket } from "socket.io-client";

export type MessagingConversationType = "booking_direct" | "meal_group" | "meal_direct";
export type MessagingMemberRole = "host" | "guest" | "participant";

export type MessagingUserSummary = {
  userId: number;
  pseudo: string | null;
  firstName: string;
  lastName: string;
  profilePhotoUrl: string | null;
};

export type MessagingConversationMember = MessagingUserSummary & {
  role: MessagingMemberRole;
  joinedAt: string;
};

export type MessagingMessageSummary = {
  id: number;
  body: string;
  createdAt: string;
  sender: MessagingUserSummary;
};

export type MessagingConversationSummary = {
  id: number;
  type: MessagingConversationType;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  meal: {
    mealId: number;
    title: string | null;
    dateTime: string;
    hostUserId: number;
  } | null;
  members: MessagingConversationMember[];
  latestMessage: MessagingMessageSummary | null;
};

export type MessagingConversationDetail = MessagingConversationSummary & {
  messages: MessagingMessageSummary[];
};

export type MessagingMealThread = {
  mealId: number;
  mealTitle: string;
  dateTime: string;
  hostUserId: number;
  latestMessage: MessagingMessageSummary | null;
  conversations: MessagingConversationSummary[];
  participants: MessagingUserSummary[];
};

type ApiMealItem = {
  id: number;
  title: string | null;
  mealType: string | null;
  menuDescription: string | null;
  dateTime: string;
  seatsTotal: number;
  pricePerSeatCents: number;
  houseRules: string | null;
  status: "draft" | "published" | "cancelled" | "done";
  createdAt: string;
  updatedAt: string;
  host: {
    userId: number;
    pseudo: string | null;
    city: string;
    country: string;
  };
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

function getAuthHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

function toApiPath(path: string) {
  if (!apiUrl) {
    return null;
  }

  return `${apiUrl}${path}`;
}

function buildDisplayName(user: MessagingUserSummary) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (fullName) {
    return fullName;
  }

  if (user.pseudo?.trim()) {
    return user.pseudo.trim();
  }

  return `Utilisateur ${user.userId}`;
}

export function formatConversationTime(dateValue: string) {
  return format(new Date(dateValue), "HH:mm", { locale: fr });
}

export function formatConversationDate(dateValue: string) {
  return format(new Date(dateValue), "EEEE d MMMM", { locale: fr });
}

export function isUpcomingConversationMeal(dateValue: string) {
  return new Date(dateValue).getTime() >= Date.now();
}

export function getConversationCounterpart(
  conversation: MessagingConversationSummary | MessagingConversationDetail,
  currentUserId: number,
) {
  return (
    conversation.members.find((member) => member.userId !== currentUserId) ??
    conversation.members[0] ??
    null
  );
}

export function getConversationTitle(
  conversation: MessagingConversationSummary | MessagingConversationDetail,
  currentUserId: number,
) {
  if (conversation.type === "meal_group") {
    return "Discussion de groupe";
  }

  const counterpart = getConversationCounterpart(conversation, currentUserId);
  if (counterpart) {
    return buildDisplayName(counterpart);
  }

  return conversation.title?.trim() || "Conversation";
}

export function getConversationSubtitle(
  conversation: MessagingConversationSummary | MessagingConversationDetail,
  currentUserId: number,
) {
  if (conversation.type === "meal_group") {
    const otherCount = conversation.members.filter(
      (member) => member.userId !== currentUserId,
    ).length;
    return `${otherCount} personne${otherCount > 1 ? "s" : ""}`;
  }

  if (conversation.type === "booking_direct") {
    return "Discussion avant validation";
  }

  return "Discussion individuelle";
}

export function groupConversationsByMeal(
  conversations: MessagingConversationSummary[],
): MessagingMealThread[] {
  const groupedMeals = new Map<number, MessagingMealThread>();

  for (const conversation of conversations) {
    if (!conversation.meal) {
      continue;
    }

    const existingMeal = groupedMeals.get(conversation.meal.mealId);

    if (!existingMeal) {
      groupedMeals.set(conversation.meal.mealId, {
        mealId: conversation.meal.mealId,
        mealTitle: conversation.meal.title?.trim() || `Repas #${conversation.meal.mealId}`,
        dateTime: conversation.meal.dateTime,
        hostUserId: conversation.meal.hostUserId,
        latestMessage: conversation.latestMessage,
        conversations: [conversation],
        participants: conversation.members.map((member) => ({
          userId: member.userId,
          pseudo: member.pseudo,
          firstName: member.firstName,
          lastName: member.lastName,
          profilePhotoUrl: member.profilePhotoUrl,
        })),
      });
      continue;
    }

    existingMeal.conversations.push(conversation);

    if (
      conversation.latestMessage &&
      (!existingMeal.latestMessage ||
        new Date(conversation.latestMessage.createdAt).getTime() >
          new Date(existingMeal.latestMessage.createdAt).getTime())
    ) {
      existingMeal.latestMessage = conversation.latestMessage;
    }

    const knownParticipants = new Set(existingMeal.participants.map((member) => member.userId));
    for (const member of conversation.members) {
      if (knownParticipants.has(member.userId)) {
        continue;
      }

      existingMeal.participants.push({
        userId: member.userId,
        pseudo: member.pseudo,
        firstName: member.firstName,
        lastName: member.lastName,
        profilePhotoUrl: member.profilePhotoUrl,
      });
      knownParticipants.add(member.userId);
    }
  }

  return Array.from(groupedMeals.values()).sort(
    (firstMeal, secondMeal) =>
      new Date(firstMeal.dateTime).getTime() - new Date(secondMeal.dateTime).getTime(),
  );
}

export async function fetchMessagingConversations(token: string) {
  const endpoint = toApiPath("/messaging/conversations");

  if (!endpoint) {
    throw new Error("NEXT_PUBLIC_API_URL est manquante.");
  }

  const response = await axios.get<MessagingConversationSummary[]>(endpoint, {
    headers: getAuthHeaders(token),
  });

  return response.data;
}

export async function fetchMessagingConversationDetail(token: string, conversationId: number) {
  const endpoint = toApiPath(`/messaging/conversations/${conversationId}/messages`);

  if (!endpoint) {
    throw new Error("NEXT_PUBLIC_API_URL est manquante.");
  }

  const response = await axios.get<MessagingConversationDetail>(endpoint, {
    headers: getAuthHeaders(token),
  });

  return response.data;
}

export async function postMessagingMessage(
  token: string,
  conversationId: number,
  body: string,
) {
  const endpoint = toApiPath(`/messaging/conversations/${conversationId}/messages`);

  if (!endpoint) {
    throw new Error("NEXT_PUBLIC_API_URL est manquante.");
  }

  const response = await axios.post<MessagingMessageSummary>(
    endpoint,
    { body },
    {
      headers: getAuthHeaders(token),
    },
  );

  return response.data;
}

export async function fetchMealCardDetails(mealId: number) {
  const response = await fetch(`/api/meals/${mealId}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as ApiMealItem;
}

export function createMessagingSocket(token: string): Socket | null {
  if (!apiUrl) {
    return null;
  }

  return io(new URL("/messaging", apiUrl).toString(), {
    auth: { token },
    transports: ["websocket"],
  });
}

export function getMessagePreview(
  message: MessagingMessageSummary | null,
  currentUserId?: number,
) {
  if (!message) {
    return "Aucun message pour le moment.";
  }

  const senderLabel =
    currentUserId && message.sender.userId === currentUserId
      ? "Vous"
      : buildDisplayName(message.sender);

  return `${senderLabel}: ${message.body}`;
}
