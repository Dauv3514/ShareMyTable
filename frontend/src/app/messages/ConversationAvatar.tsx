"use client";

import { useEffect, useId, useRef, useState } from "react";
import UserAvatar from "@/components/UserAvatar";
import type { MessagingUserSummary } from "@/lib/messaging";
import styles from "./messaging-ui.module.scss";

type ConversationAvatarProps = {
  users: MessagingUserSummary[];
  currentUserId?: number;
  alt: string;
  size?: "sm" | "md";
  includeCurrentUser?: boolean;
  onReportMember?: (user: MessagingUserSummary) => void;
};

function getDisplayUsers(
  users: MessagingUserSummary[],
  currentUserId: number | undefined,
  includeCurrentUser: boolean,
) {
  const uniqueUsers = users.filter(
    (user, index, allUsers) =>
      allUsers.findIndex((currentUser) => currentUser.userId === user.userId) ===
      index,
  );

  if (includeCurrentUser || !currentUserId) {
    return uniqueUsers;
  }

  const withoutCurrentUser = uniqueUsers.filter(
    (user) => user.userId !== currentUserId,
  );

  return withoutCurrentUser.length > 0 ? withoutCurrentUser : uniqueUsers;
}

function getMemberName(user: MessagingUserSummary, currentUserId?: number) {
  if (currentUserId && user.userId === currentUserId) {
    return "Vous";
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();

  return fullName || user.pseudo || `Utilisateur ${user.userId}`;
}

export default function ConversationAvatar({
  users,
  currentUserId,
  alt,
  size = "md",
  includeCurrentUser = false,
  onReportMember,
}: ConversationAvatarProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const displayUsers = getDisplayUsers(users, currentUserId, includeCurrentUser);
  const visibleUsers = displayUsers.slice(0, 3);
  const hiddenCount = Math.max(0, displayUsers.length - visibleUsers.length);
  const canShowMembersPanel = displayUsers.length > 1;

  useEffect(() => {
    if (!isPanelOpen) {
      return;
    }

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsPanelOpen(false);
      }
    };

    document.addEventListener("click", closeOnOutsideClick);

    return () => {
      document.removeEventListener("click", closeOnOutsideClick);
    };
  }, [isPanelOpen]);

  if (visibleUsers.length <= 1) {
    const user = visibleUsers[0];

    return (
      <div className={styles.avatarWrap}>
        <UserAvatar
          src={user?.profilePhotoUrl}
          alt={user?.firstName || alt}
          size={size === "sm" ? 34 : 48}
        />
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={styles.avatarPanelAnchor}
      onClick={(event) => event.stopPropagation()}
    >
      <span
        className={styles.avatarPanelTrigger}
        role={canShowMembersPanel ? "button" : undefined}
        tabIndex={canShowMembersPanel ? 0 : undefined}
        aria-label={canShowMembersPanel ? `Voir les membres de ${alt}` : alt}
        aria-expanded={canShowMembersPanel ? isPanelOpen : undefined}
        aria-controls={canShowMembersPanel ? panelId : undefined}
        onClick={(event) => {
          if (!canShowMembersPanel) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          setIsPanelOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (!canShowMembersPanel || !["Enter", " "].includes(event.key)) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          setIsPanelOpen((current) => !current);
        }}
      >
        <span
          className={`${styles.avatarStack} ${
            size === "sm" ? styles.avatarStackSmall : ""
          }`}
          aria-hidden={canShowMembersPanel}
        >
          {visibleUsers.map((user) => (
            <span key={user.userId} className={styles.avatarStackItem}>
              <UserAvatar
                src={user.profilePhotoUrl}
                alt={user.firstName || alt}
                size={size === "sm" ? 28 : 34}
              />
            </span>
          ))}

          {hiddenCount > 0 ? (
            <span className={styles.avatarStackCount}>+{hiddenCount}</span>
          ) : null}
        </span>
      </span>

      {canShowMembersPanel && isPanelOpen ? (
        <div
          id={panelId}
          className={styles.membersPanel}
          role="dialog"
          aria-label="Membres de la conversation"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <div className={styles.membersPanelHeader}>
            <p>Participants</p>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsPanelOpen(false);
              }}
              aria-label="Fermer le panneau des participants"
            >
              Fermer
            </button>
          </div>

          <div className={styles.membersPanelList}>
            {displayUsers.map((user) => (
              <div key={user.userId} className={styles.membersPanelItem}>
                <span className={styles.membersPanelAvatar}>
                  <UserAvatar
                    src={user.profilePhotoUrl}
                    alt={getMemberName(user, currentUserId)}
                    size={36}
                  />
                </span>
                <span>{getMemberName(user, currentUserId)}</span>
                {onReportMember && user.userId !== currentUserId ? (
                  <button
                    type="button"
                    className={styles.membersPanelReportButton}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onReportMember(user);
                      setIsPanelOpen(false);
                    }}
                  >
                    Signaler
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
