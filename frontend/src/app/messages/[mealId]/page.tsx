"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Search, ChevronRight, CalendarDays, MapPin } from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { buildMealEventHref } from "@/lib/meal-data";
import ConversationAvatar from "../ConversationAvatar";
import {
  createMessagingSocket,
  fetchMealCardDetails,
  fetchMessagingConversations,
  formatConversationDate,
  formatConversationTime,
  getConversationTitle,
  getMessagePreview,
  type MessagingConversationSummary,
} from "@/lib/messaging";
import styles from "../messaging-ui.module.scss";

function getLatestSenderLabel(
  conversation: MessagingConversationSummary,
  currentUserId: number,
) {
  const message = conversation.latestMessage;

  if (!message) {
    return conversation.type === "meal_group" ? "Discussion repas" : "Participant";
  }

  if (message.sender.userId === currentUserId) {
    return "Vous";
  }

  return message.sender.firstName || message.sender.pseudo || "Participant";
}

function getLatestMessageBody(conversation: MessagingConversationSummary) {
  return conversation.latestMessage?.body || "Aucun message pour le moment.";
}

function sortMealConversations(conversations: MessagingConversationSummary[]) {
  return [...conversations].sort((firstConversation, secondConversation) => {
    if (
      firstConversation.type === "meal_group" &&
      secondConversation.type !== "meal_group"
    ) {
      return -1;
    }

    if (
      firstConversation.type !== "meal_group" &&
      secondConversation.type === "meal_group"
    ) {
      return 1;
    }

    const firstTimestamp = new Date(
      firstConversation.latestMessage?.createdAt ?? firstConversation.updatedAt,
    ).getTime();
    const secondTimestamp = new Date(
      secondConversation.latestMessage?.createdAt ?? secondConversation.updatedAt,
    ).getTime();

    return secondTimestamp - firstTimestamp;
  });
}

export default function MealMessagesPage() {
  const params = useParams<{ mealId: string }>();
  const router = useRouter();
  const { isLoggedIn, loading, user } = useAuth();
  const mealId = Number(params.mealId);

  const [conversations, setConversations] = useState<MessagingConversationSummary[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [mealDetails, setMealDetails] = useState<Awaited<ReturnType<typeof fetchMealCardDetails>>>(null);
  const deferredQuery = useDeferredValue(query);

  const loadMealConversations = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token || Number.isNaN(mealId)) {
      setIsFetching(false);
      return;
    }

    try {
      setErrorMessage(null);

      const [nextConversations, nextMealDetails] = await Promise.all([
        fetchMessagingConversations(token),
        fetchMealCardDetails(mealId),
      ]);

      setConversations(nextConversations);
      setMealDetails(nextMealDetails);
    } catch (error) {
      const fallbackMessage =
        "Impossible de charger les discussions de ce repas.";
      setErrorMessage(error instanceof Error ? error.message : fallbackMessage);
    } finally {
      setIsFetching(false);
    }
  }, [mealId]);

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/connexion");
    }
  }, [isLoggedIn, loading, router]);

  useEffect(() => {
    if (loading || !isLoggedIn) {
      return;
    }

    void loadMealConversations();
  }, [isLoggedIn, loading, loadMealConversations]);

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
      void loadMealConversations();
    });

    return () => {
      socket.disconnect();
    };
  }, [isLoggedIn, loadMealConversations, mealId]);

  const mealConversations = useMemo(
    () =>
      sortMealConversations(
        conversations.filter((conversation) => conversation.meal?.mealId === mealId),
      ),
    [conversations, mealId],
  );

  const filteredMealConversations = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    if (!normalizedQuery || !user) {
      return mealConversations;
    }

    return mealConversations.filter((conversation) => {
      const title = getConversationTitle(conversation, user.id).toLowerCase();
      const preview = getMessagePreview(conversation.latestMessage, user.id).toLowerCase();
      const memberNames = conversation.members
        .map((member) => [member.firstName, member.lastName, member.pseudo].filter(Boolean).join(" "))
        .join(" ")
        .toLowerCase();

      return (
        title.includes(normalizedQuery) ||
        preview.includes(normalizedQuery) ||
        memberNames.includes(normalizedQuery)
      );
    });
  }, [deferredQuery, mealConversations, user]);

  const groupConversation = filteredMealConversations.find(
    (conversation) => conversation.type === "meal_group",
  );
  const directConversations = filteredMealConversations.filter(
    (conversation) => conversation.type !== "meal_group",
  );

  if (loading) {
    return (
      <section className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.stateCard}>
            <h2>Chargement du repas</h2>
            <p>On recupere tes discussions en cours.</p>
          </div>
        </div>
      </section>
    );
  }

  if (!isLoggedIn || !user) {
    return null;
  }

  return (
    <section className={styles.page}>
      <div className={styles.shell}>
        <label className={styles.searchBar} aria-label="Rechercher dans les discussions du repas">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un repas"
          />
          <Search className={styles.searchIcon} />
        </label>

        {isFetching ? (
          <div className={styles.stateCard}>
            <h2>Chargement des conversations</h2>
            <p>Le groupe et les messages individuels arrivent.</p>
          </div>
        ) : errorMessage ? (
          <div className={styles.stateCard}>
            <h2>Ce repas n&apos;est pas disponible</h2>
            <p>{errorMessage}</p>
          </div>
        ) : mealConversations.length === 0 ? (
          <div className={styles.stateCard}>
            <h2>Aucune conversation pour ce repas</h2>
            <p>
              La messagerie de ce repas s&apos;ouvrira quand une reservation
              donnera acces aux discussions.
            </p>
          </div>
        ) : (
          <>
            <section className={styles.mealPreviewSection}>
              <h1 className={styles.mealPreviewTitle}>
                {mealDetails?.title || mealConversations[0]?.meal?.title || "Nom du repas"}
              </h1>

              <article className={styles.sectionCard}>
              <div className={styles.mealCard}>
                <div className={styles.mealCardMedia}>
                  <Image
                    src="/photoRepas.png"
                    alt={mealDetails?.title || "Repas"}
                    fill
                    className={styles.mealCardImage}
                    sizes="(max-width: 900px) 100vw, 380px"
                  />
                </div>

                <div className={styles.mealCardContent}>
                  <h2 className={styles.mealCardTitle}>
                    {mealDetails?.title || mealConversations[0]?.meal?.title || "Nom du repas"}
                  </h2>

                  <div className={styles.mealCardMeta}>
                    <span>
                      <CalendarDays size={16} />{" "}
                      {formatConversationDate(
                        mealDetails?.dateTime || mealConversations[0].meal!.dateTime,
                      )}{" "}
                      ·{" "}
                      {formatConversationTime(
                        mealDetails?.dateTime || mealConversations[0].meal!.dateTime,
                      )}
                    </span>
                    {mealDetails?.host.city ? (
                      <span>
                        <MapPin size={16} /> {mealDetails.host.city}
                      </span>
                    ) : null}
                  </div>

                  <p className={styles.mealCardDescription}>
                    {mealDetails?.menuDescription ||
                      "Retrouve ici le groupe du repas ainsi que les conversations individuelles ouvertes autour de cette table."}
                  </p>

                  <Link
                    href={buildMealEventHref(mealId)}
                    className={styles.mealLink}
                  >
                    Voir la fiche du repas
                    <ChevronRight size={18} />
                  </Link>
                </div>
              </div>
            </article>
            </section>

            <article className={styles.listSection}>
              <div className={styles.conversationSection}>
                <div className={styles.conversationList}>
                  {groupConversation ? (
                    <Link
                      href={`/messages/conversations/${groupConversation.id}`}
                      className={`${styles.conversationLink} ${styles.conversationLinkFlat} ${styles.groupConversationRow}`}
                    >
                      <ConversationAvatar
                        users={groupConversation.members}
                        currentUserId={user.id}
                        alt="Discussion de groupe"
                        includeCurrentUser
                      />

                      <div className={styles.threadBody}>
                        <div className={styles.threadTitleRow}>
                          <h3 className={styles.threadTitle}>Discussion de groupe</h3>
                          <span className={styles.threadTime}>
                            {formatConversationTime(
                              groupConversation.latestMessage?.createdAt ??
                                groupConversation.updatedAt,
                            )}
                          </span>
                        </div>

                        <p className={styles.threadMeta}>
                          {getLatestSenderLabel(groupConversation, user.id)} :
                        </p>
                        <p className={styles.threadPreview}>
                          {getLatestMessageBody(groupConversation)}
                        </p>
                      </div>
                    </Link>
                  ) : null}

                  {directConversations.map((conversation) => {
                    return (
                      <Link
                        key={conversation.id}
                        href={`/messages/conversations/${conversation.id}`}
                        className={`${styles.conversationLink} ${styles.conversationLinkFlat}`}
                      >
                        <ConversationAvatar
                          users={conversation.members}
                          currentUserId={user.id}
                          alt={getConversationTitle(conversation, user.id)}
                        />

                        <div className={styles.threadBody}>
                          <div className={styles.threadTitleRow}>
                            <p className={`${styles.threadMeta} ${styles.threadMetaSolo}`}>
                              {getLatestSenderLabel(conversation, user.id)} :
                            </p>
                            <span className={styles.threadTime}>
                              {formatConversationTime(
                                conversation.latestMessage?.createdAt ??
                                  conversation.updatedAt,
                              )}
                            </span>
                          </div>

                          <p className={styles.threadPreview}>
                            {getLatestMessageBody(conversation)}
                          </p>
                        </div>
                      </Link>
                    );
                  })}

                  {!groupConversation && directConversations.length === 0 ? (
                    <div className={styles.stateCard}>
                      <h2>Aucune discussion pour le filtre actuel</h2>
                      <p>Essaie un autre mot-cle ou reviens plus tard.</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          </>
        )}
      </div>
    </section>
  );
}
