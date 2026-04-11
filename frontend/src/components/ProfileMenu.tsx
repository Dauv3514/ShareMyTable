"use client";

import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Bell,
  ChevronRight,
  LogOut,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useAuth } from "../app/providers/AuthProvider";
import UserAvatar from "./UserAvatar";
import "./profile-menu.scss";

type ProfileMenuProps = {
  children: (open: boolean) => React.ReactElement;
};

type ProfileAction = {
  key: string;
  label: string;
  icon: typeof UserRound;
  onClick: () => void;
  tone?: "default" | "danger";
};

function ProfileMenuContent({
  onClose,
}: {
  onClose: () => void;
}) {
  const router = useRouter();
  const { logout, user } = useAuth();
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();

  const actions: ProfileAction[] = [
    {
      key: "profile",
      label: "Mon profil",
      icon: UserRound,
      onClick: () => {
        router.push("/profil");
        onClose();
      },
    },
    {
      key: "settings",
      label: "Paramètres",
      icon: Settings,
      onClick: () => {
        router.push("/parametres");
        onClose();
      },
    },
    {
      key: "notifications",
      label: "Notifications",
      icon: Bell,
      onClick: () => {
        toast.info("La gestion des notifications arrive bientôt.");
        onClose();
      },
    },
    {
      key: "logout",
      label: "Déconnexion",
      icon: LogOut,
      tone: "danger",
      onClick: () => {
        logout();
        onClose();
        toast.success("Déconnexion réussie");
        router.push("/connexion");
      },
    },
  ];

  return (
    <div className="profile-menu__panel">
      <div className="profile-menu__header">
        <div className="profile-menu__avatar">
          <UserAvatar
            src={user?.profilePhotoUrl}
            alt="Profil"
            size={56}
            priority
          />
        </div>

        <div className="profile-menu__identity">
          <strong>{fullName || "Mon compte"}</strong>
          <span>{user?.email || "Compte connecté"}</span>
        </div>
      </div>

      <div className="profile-menu__divider" aria-hidden="true" />

      <div className="profile-menu__actions">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.key}
              type="button"
              className={`profile-menu__action ${action.tone === "danger" ? "profile-menu__action--danger" : ""}`}
              onClick={action.onClick}
            >
              <span className="profile-menu__action-left">
                <Icon className="profile-menu__action-icon" />
                <span>{action.label}</span>
              </span>
              <ChevronRight className="profile-menu__action-arrow" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ProfileMenu({ children }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 720px)");
    const syncViewport = () => setIsMobile(mediaQuery.matches);

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  const trigger = children(open);

  if (isMobile) {
    return (
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="profile-menu__overlay" />
          <DialogPrimitive.Content className="profile-menu__sheet">
            <DialogPrimitive.Title className="profile-menu__sr-only">
              Menu profil
            </DialogPrimitive.Title>
            <div className="profile-menu__sheet-handle" aria-hidden="true" />

            <DialogPrimitive.Close asChild>
              <button
                type="button"
                className="profile-menu__close"
                aria-label="Fermer le menu profil"
              >
                <X />
              </button>
            </DialogPrimitive.Close>

            <ProfileMenuContent onClose={() => setOpen(false)} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="profile-menu__popover" align="end" sideOffset={22}>
        <ProfileMenuContent onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}