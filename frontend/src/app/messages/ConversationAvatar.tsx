"use client";

import UserAvatar from "@/components/UserAvatar";
import type { MessagingUserSummary } from "@/lib/messaging";
import styles from "./messaging-ui.module.scss";

type ConversationAvatarProps = {
  users: MessagingUserSummary[];
  currentUserId?: number;
  alt: string;
  size?: "sm" | "md";
  includeCurrentUser?: boolean;
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

export default function ConversationAvatar({
  users,
  currentUserId,
  alt,
  size = "md",
  includeCurrentUser = false,
}: ConversationAvatarProps) {
  const displayUsers = getDisplayUsers(users, currentUserId, includeCurrentUser);
  const visibleUsers = displayUsers.slice(0, 3);
  const hiddenCount = Math.max(0, displayUsers.length - visibleUsers.length);

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
      className={`${styles.avatarStack} ${
        size === "sm" ? styles.avatarStackSmall : ""
      }`}
      aria-label={alt}
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
    </div>
  );
}
