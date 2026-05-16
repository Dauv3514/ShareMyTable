"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { toast } from "react-toastify";
import { useAuth } from "@/app/providers/AuthProvider";

type RegisterEventLinkProps = {
  eventId: string;
  hostUserId: string;
  className: string;
  children: ReactNode;
};

export default function RegisterEventLink({
  eventId,
  hostUserId,
  className,
  children,
}: RegisterEventLinkProps) {
  const { isLoggedIn, loading, user } = useAuth();
  const isOwnMeal = Boolean(user && String(user.id) === String(hostUserId));

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isLoggedIn && loading) {
      event.preventDefault();
      toast.info("Verification de ton compte en cours, reessaie dans un instant.");
      return;
    }

    if (isOwnMeal) {
      event.preventDefault();
      toast.error("Un hôte ne peut pas réserver sur son propre événement.");
    }
  };

  return (
    <Link
      href={`/reservation/${eventId}/places`}
      className={className}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
}
