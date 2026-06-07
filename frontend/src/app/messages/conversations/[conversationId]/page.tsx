"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowUp, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/app/providers/AuthProvider";
import { PWA_BADGE_REFRESH_EVENT } from "@/components/Pwa";
import ConversationAvatar from "../../ConversationAvatar";
import {
  createMessagingSocket,
  fetchMessagingConversationDetail,
  formatConversationDate,
  formatConversationTime,
  getConversationSubtitle,
  getConversationTitle,
  postMessagingMessage,
  type MessagingConversationDetail,
  type MessagingMessageSummary,
} from "@/lib/messaging";
import styles from "../../messaging-ui.module.scss";

function appendMessageIfMissing(
  currentMessages: MessagingMessageSummary[],
  nextMessage: MessagingMessageSummary,
) {
  const alreadyExists = currentMessages.some((message) => message.id === nextMessage.id);
  if (alreadyExists) {
    return currentMessages;
  }

  return [...currentMessages, nextMessage];
}

function shouldShowMessageMeta(
  messages: MessagingMessageSummary[],
  currentIndex: number,
) {
  const currentMessage = messages[currentIndex];
  const nextMessage = messages[currentIndex + 1];

  if (!nextMessage) {
    return true;
  }

  const nextIsFarAway =
    new Date(nextMessage.createdAt).getTime() -
      new Date(currentMessage.createdAt).getTime() >=
    60 * 60 * 1000;
  const nextIsDifferentDay =
    new Date(nextMessage.createdAt).toDateString() !==
    new Date(currentMessage.createdAt).toDateString();

  return nextIsFarAway || nextIsDifferentDay;
}

function getUnreadStartIndex(
  messages: MessagingMessageSummary[],
  currentUserId: number,
) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].sender.userId === currentUserId) {
      const unreadIndex = index + 1;
      return unreadIndex < messages.length ? unreadIndex : null;
    }
  }

  return messages.length > 0 ? 0 : null;
}

function refreshPwaBadge() {
  window.dispatchEvent(new Event(PWA_BADGE_REFRESH_EVENT));
}

export default function ConversationPage() {
  const params = useParams<{ conversationId: string }>();
  const router = useRouter();
  const { isLoggedIn, loading, user } = useAuth();
  const conversationId = Number(params.conversationId);
  const currentUserId = user?.id ?? 0;

  const [conversation, setConversation] = useState<MessagingConversationDetail | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const socketRef = useRef<ReturnType<typeof createMessagingSocket>>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback(() => {
    if (!viewportRef.current) {
      return;
    }

    viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
  }, []);

  const loadConversation = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token || Number.isNaN(conversationId)) {
      setIsFetching(false);
      return;
    }

    try {
      const detail = await fetchMessagingConversationDetail(token, conversationId);
      setConversation(detail);
      refreshPwaBadge();
    } catch {
      setConversation(null);
    } finally {
      setIsFetching(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/connexion");
    }
  }, [isLoggedIn, loading, router]);

  useEffect(() => {
    if (loading || !isLoggedIn) {
      return;
    }

    void loadConversation();
  }, [isLoggedIn, loading, loadConversation]);

  useEffect(() => {
    if (!isLoggedIn || !user) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }

    const socket = createMessagingSocket(token);
    socketRef.current = socket;

    if (!socket) {
      return;
    }

    socket.on("connect", () => {
      socket.emit("messaging:joinConversation", { conversationId });
    });

    socket.on("messaging:ready", () => {
      socket.emit("messaging:joinConversation", { conversationId });
      socket.emit("messaging:getMessages", { conversationId });
    });

    socket.on("messaging:messages", (payload: MessagingConversationDetail) => {
      if (payload.id !== conversationId) {
        return;
      }

      setConversation(payload);
      refreshPwaBadge();
      setTimeout(scrollToBottom, 0);
    });

    socket.on("messaging:unreadCount", () => {
      refreshPwaBadge();
    });

    socket.on(
      "messaging:newMessage",
      (payload: { conversationId: number; message: MessagingMessageSummary }) => {
        if (payload.conversationId !== conversationId) {
          return;
        }

        setConversation((currentConversation) => {
          if (!currentConversation) {
            return currentConversation;
          }

          return {
            ...currentConversation,
            updatedAt: payload.message.createdAt,
            latestMessage: payload.message,
            messages: appendMessageIfMissing(
              currentConversation.messages,
              payload.message,
            ),
          };
        });

        socket.emit("messaging:markRead", { conversationId });
        setTimeout(scrollToBottom, 0);
      },
    );

    return () => {
      socket.emit("messaging:leaveConversation", { conversationId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [conversationId, isLoggedIn, scrollToBottom, user]);

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages, scrollToBottom]);

  const handleSubmit = async () => {
    const body = draft.trim();
    if (!body || !conversationId) {
      return;
    }

    setIsSending(true);
    setSendError(null);

    try {
      const socket = socketRef.current;

      if (socket?.connected) {
        socket.emit("messaging:sendMessage", { conversationId, body });
      } else {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Session invalide.");
        }

        const createdMessage = await postMessagingMessage(token, conversationId, body);
        setConversation((currentConversation) => {
          if (!currentConversation) {
            return currentConversation;
          }

          return {
            ...currentConversation,
            updatedAt: createdMessage.createdAt,
            latestMessage: createdMessage,
            messages: appendMessageIfMissing(
              currentConversation.messages,
              createdMessage,
            ),
          };
        });
        refreshPwaBadge();
      }

      setDraft("");
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Envoi impossible.");
    } finally {
      setIsSending(false);
    }
  };

  const messageGroups = useMemo(() => {
    if (!conversation) {
      return [];
    }

    const groups: Array<
      | { type: "divider"; key: string; label: string }
      | { type: "unread"; key: string; label: string }
      | {
          type: "message";
          key: string;
          message: MessagingMessageSummary;
          showMeta: boolean;
        }
    > = [];

    let currentDayKey: string | null = null;
    const unreadStartIndex = getUnreadStartIndex(conversation.messages, currentUserId);

    for (const [index, message] of conversation.messages.entries()) {
      const dayKey = new Date(message.createdAt).toDateString();

      if (dayKey !== currentDayKey) {
        currentDayKey = dayKey;
        groups.push({
          type: "divider",
          key: `divider-${dayKey}`,
          label: formatConversationDate(message.createdAt),
        });
      }

      if (unreadStartIndex !== null && index === unreadStartIndex) {
        groups.push({
          type: "unread",
          key: `unread-${message.id}`,
          label: "Nouveaux messages",
        });
      }

      groups.push({
        type: "message",
        key: `message-${message.id}`,
        message,
        showMeta: shouldShowMessageMeta(conversation.messages, index),
      });
    }

    return groups;
  }, [conversation, currentUserId]);

  if (loading) {
    return (
      <section className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.stateCard}>
            <h2>Ouverture de la discussion</h2>
            <p>On installe ta conversation en direct.</p>
          </div>
        </div>
      </section>
    );
  }

  if (!isLoggedIn || !user) {
    return null;
  }

  if (isFetching) {
    return (
      <section className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.stateCard}>
            <h2>Chargement des messages</h2>
            <p>Les derniers echanges arrivent.</p>
          </div>
        </div>
      </section>
    );
  }

  if (!conversation) {
    return (
      <section className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.stateCard}>
            <h2>Conversation introuvable</h2>
            <p>Cette discussion n&apos;est pas disponible ou tu n&apos;y as pas acces.</p>
          </div>
        </div>
      </section>
    );
  }

  const participantCount = conversation.members.filter(
    (member) => member.userId !== user.id,
  ).length;
  const mealHref = conversation.meal ? `/messages/${conversation.meal.mealId}` : "/messages";

  return (
    <section className={`${styles.page} ${styles.chatPage}`}>
      <div className={`${styles.shell} ${styles.chatShell}`}>
        <div className={styles.chatFrame}>
          <header className={styles.chatHeader}>
            <div className={styles.chatHeaderMain}>
              <Link href={mealHref} className={`${styles.backButton} ${styles.chatBackButton}`}>
                <ChevronRight style={{ transform: "rotate(180deg)" }} />
              </Link>

              <ConversationAvatar
                users={conversation.members}
                currentUserId={user.id}
                alt={getConversationTitle(conversation, user.id)}
                includeCurrentUser={conversation.type === "meal_group"}
              />

              <div className={styles.chatHeaderCopy}>
                <h1>{getConversationTitle(conversation, user.id)}</h1>
                <p>
                  {conversation.type === "meal_group"
                    ? `${participantCount} personne${participantCount > 1 ? "s" : ""}`
                    : getConversationSubtitle(conversation, user.id)}
                </p>
              </div>
            </div>

            {conversation.meal ? (
              <Link href={mealHref} className={styles.chatMealLink}>
                {conversation.meal.title?.trim() || "Voir l'événement"}
              </Link>
            ) : null}
          </header>

          <div className={styles.messagesViewport} ref={viewportRef}>
            {messageGroups.map((item) => {
              if (item.type === "divider") {
                return (
                  <div key={item.key} className={styles.dateDivider}>
                    {item.label}
                  </div>
                );
              }

              if (item.type === "unread") {
                return (
                  <div key={item.key} className={styles.unreadDivider}>
                    <span>{item.label}</span>
                  </div>
                );
              }

              const isMine = item.message.sender.userId === user.id;
              const shouldShowInlineAvatar =
                !isMine || conversation.type === "meal_group";

              return (
                <div
                  key={item.key}
                  className={`${styles.messageRow} ${
                    isMine ? styles.messageRowMine : styles.messageRowIncoming
                  }`}
                >
                  <div
                    className={`${styles.messageAvatar} ${
                      isMine ? styles.messageAvatarOutgoing : ""
                    }`}
                  >
                    {shouldShowInlineAvatar ? (
                      <div className={styles.avatarWrap}>
                        <UserAvatar
                          src={item.message.sender.profilePhotoUrl}
                          alt={item.message.sender.firstName || "Participant"}
                          size={34}
                        />
                      </div>
                    ) : item.showMeta ? (
                      <div
                        className={`${styles.avatarWrap} ${styles.messageAvatarOffset}`}
                      >
                        <UserAvatar
                          src={item.message.sender.profilePhotoUrl}
                          alt={item.message.sender.firstName || "Participant"}
                          size={34}
                        />
                      </div>
                    ) : (
                      <div className={styles.messageAvatarSpacer} />
                    )}

                    {item.showMeta ? (
                      <span className={styles.messageTime}>
                        {formatConversationTime(item.message.createdAt)}
                      </span>
                    ) : null}
                  </div>

                  <div className={styles.messageBody}>
                    {!isMine ? (
                      <span className={styles.messageSender}>
                        {item.message.sender.firstName || item.message.sender.pseudo || "Participant"}
                      </span>
                    ) : null}

                    <div className={styles.messageBubbleWrap}>
                      <div
                        className={`${styles.messageBubble} ${
                          isMine ? styles.messageBubbleMine : ""
                        }`}
                      >
                        <p className={styles.messageText}>{item.message.body}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.composer}>
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSubmit();
                }
              }}
              placeholder=""
              className={styles.composerInput}
            />

            <button
              type="button"
              className={styles.sendButton}
              onClick={() => void handleSubmit()}
              disabled={isSending || draft.trim().length === 0}
              aria-label="Envoyer le message"
            >
              <ArrowUp size={22} />
            </button>
          </div>
        </div>

        {sendError ? (
          <div className={styles.stateCard}>
            <h2>Message non envoye</h2>
            <p>{sendError}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
