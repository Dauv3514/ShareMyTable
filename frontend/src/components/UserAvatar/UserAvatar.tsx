"use client";

import Image from "next/image";
import { UserRound } from "lucide-react";
import "./user-avatar.scss";

type UserAvatarProps = {
  src?: string | null;
  alt: string;
  size: number;
  priority?: boolean;
};

export default function UserAvatar({
  src,
  alt,
  size,
  priority = false,
}: UserAvatarProps) {
  const resolvedSrc = src?.trim() || "";
  const isRemoteImage = /^https?:\/\//.test(resolvedSrc);
  const isPlaceholder = !resolvedSrc;

  if (isPlaceholder) {
    return (
      <span className="user-avatar user-avatar--placeholder" aria-hidden="true">
        <UserRound />
      </span>
    );
  }

  return (
    <Image
      src={resolvedSrc}
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      unoptimized={isRemoteImage}
      className="user-avatar user-avatar--photo"
    />
  );
}
