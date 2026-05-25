"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "react-toastify";
import { useAuth } from "@/app/providers/AuthProvider";
import ConversationAvatar from "./ConversationAvatar";
import {
  createMessagingSocket,
  fetchMessagingConversations,
  formatConversationTime,
  getMessagePreview,
  groupConversationsByMeal,
  isUpcomingConversationMeal,
  type MessagingConversationSummary,
  type MessagingMealThread,
} from "@/lib/messaging";
import styles from "./messaging-ui.module.scss";

function includesQuery(mealThread: MessagingMealThread, query: string, currentUserId: number) {
  const lowerQuery = query.toLowerCase();
  const preview = getMessagePreview(mealThread.latestMessage, currentUserId).toLowerCase();
  const participantNames = mealThread.participants
    .map((participant) =>
      [participant.firstName, participant.lastName, participant.pseudo]
        .filter(Boolean)
        .join(" ")
        .trim()
        .toLowerCase(),
    )
    .join(" ");

  return (
    mealThread.mealTitle.toLowerCase().includes(lowerQuery) ||
    preview.includes(lowerQuery) ||
    participantNames.includes(lowerQuery)
  );
}

function getLatestSenderLabel(
  message: MessagingMealThread["latestMessage"],
  currentUserId: number,
) {
  if (!message) {
    return "Discussion repas";
  }

  if (message.sender.userId === currentUserId) {
    return "Vous";
  }

  return message.sender.firstName || message.sender.pseudo || "Participant";
}

function getLatestMessageBody(message: MessagingMealThread["latestMessage"]) {
  return message?.body || "Aucun message pour le moment.";
}

type MealThreadRowProps = {
  mealThread: MessagingMealThread;
  currentUserId: number;
};

function MealThreadRow({ mealThread, currentUserId }: MealThreadRowProps) {
  const groupConversation = mealThread.conversations.find(
    (conversation) => conversation.type === "meal_group",
  );
  const avatarUsers = groupConversation?.members ?? mealThread.participants;

  return (
    <Link
      href={`/messages/${mealThread.mealId}`}
      className={`${styles.threadLink} ${styles.threadLinkFlat}`}
    >
      <ConversationAvatar
        users={avatarUsers}
        currentUserId={currentUserId}
        alt={mealThread.mealTitle}
        includeCurrentUser={Boolean(groupConversation)}
      />

      <div className={styles.threadBody}>
        <div className={styles.threadTitleRow}>
          <h3 className={styles.threadTitle}>{mealThread.mealTitle}</h3>
          <span className={styles.threadTime}>
            {formatConversationTime(
              mealThread.latestMessage?.createdAt ?? mealThread.dateTime,
            )}
          </span>
        </div>

        <p className={styles.threadMeta}>
          {getLatestSenderLabel(mealThread.latestMessage, currentUserId)} :
        </p>
        <p className={styles.threadPreview}>
          {getLatestMessageBody(mealThread.latestMessage)}
        </p>
      </div>
    </Link>
  );
}

type ThreadSectionProps = {
  title: string;
  threads: MessagingMealThread[];
  currentUserId: number;
  muted?: boolean;
};

function ThreadSection({ title, threads, currentUserId, muted = false }: ThreadSectionProps) {
  return (
    <section className={`${styles.listSection} ${muted ? styles.listSectionMuted : ""}`}>
      <div className={styles.sectionHead}>
        <h2>{title}</h2>
      </div>

      <div className={`${styles.threadsList} ${styles.threadsListFlat}`}>
        {threads.map((thread) => (
          <MealThreadRow
            key={thread.mealId}
            mealThread={thread}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </section>
  );
}

export default function MessagesPage() {
  const router = useRouter();
  const { isLoggedIn, loading, user } = useAuth();
  const [conversations, setConversations] = useState<MessagingConversationSummary[]>([]);
  const [query, setQuery] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  const loadConversations = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setIsFetching(false);
      return;
    }

    try {
      setErrorMessage(null);
      const nextConversations = await fetchMessagingConversations(token);
      setConversations(nextConversations);
    } catch (error) {
      const fallbackMessage =
        "Impossible de charger ta messagerie pour le moment.";
      const message =
        error instanceof Error ? error.message : fallbackMessage;

      setErrorMessage(message);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/connexion");
    }
  }, [isLoggedIn, loading, router]);

  useEffect(() => {
    if (loading || !isLoggedIn) {
      return;
    }

    void loadConversations();
  }, [isLoggedIn, loading, loadConversations]);

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }

    const socket = createMessagingSocket(token);
    if (!socket) {
      return;
    }

    socket.on("messaging:ready", (payload: { conversations: MessagingConversationSummary[] }) => {
      setConversations(payload.conversations);
      setIsFetching(false);
    });

    socket.on("messaging:newMessage", () => {
      void loadConversations();
    });

    socket.on("messaging:error", (payload: { message?: string }) => {
      if (payload.message) {
        toast.error(payload.message);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [isLoggedIn, loadConversations]);

  const groupedMeals = useMemo(
    () => groupConversationsByMeal(conversations),
    [conversations],
  );

  const filteredMeals = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    if (!normalizedQuery || !user) {
      return groupedMeals;
    }

    return groupedMeals.filter((mealThread) =>
      includesQuery(mealThread, normalizedQuery, user.id),
    );
  }, [deferredQuery, groupedMeals, user]);

  const upcomingMeals = useMemo(
    () => filteredMeals.filter((mealThread) => isUpcomingConversationMeal(mealThread.dateTime)),
    [filteredMeals],
  );

  const pastMeals = useMemo(
    () => filteredMeals.filter((mealThread) => !isUpcomingConversationMeal(mealThread.dateTime)),
    [filteredMeals],
  );

  if (loading) {
    return (
      <section className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.stateCard}>
            <h2>Chargement de la messagerie</h2>
            <p>On prépare tes discussions repas...</p>
          </div>
        </div>
      </section>
    );
  }

  if (!isLoggedIn || !user) {
    return (
      <section className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.stateCard}>
            <h2>Connexion requise</h2>
            <p>Redirection vers la connexion en cours.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.searchArea}>
          <label className={styles.searchBar} aria-label="Filtrer une discussion">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filtrer une discussion"
            />
            <Search className={styles.searchIcon} />
          </label>

          <Link href="/rechercher" className={styles.searchMealButton}>
            Rechercher un repas
          </Link>
        </div>

        {isFetching ? (
          <div className={styles.stateCard}>
            <h2>Chargement en cours</h2>
            <p>On rassemble tes repas à venir et passés.</p>
          </div>
        ) : errorMessage ? (
          <div className={styles.stateCard}>
            <h2>Messagerie indisponible</h2>
            <p>{errorMessage}</p>
          </div>
        ) : filteredMeals.length === 0 ? (
          <div className={styles.stateCard}>
            <h2>Aucune discussion trouvée</h2>
            <p>
              Après une réservation, tu peux échanger avec un hôte ou des invités ici.
            </p>
          </div>
        ) : (
          <>
            <ThreadSection
              title="À venir"
              threads={upcomingMeals}
              currentUserId={user.id}
            />
            <ThreadSection
              title="Passés"
              threads={pastMeals}
              currentUserId={user.id}
              muted
            />
          </>
        )}
      </div>
    </section>
  );
}
