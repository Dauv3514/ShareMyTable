"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import "./bottom-menu.scss";
import { useAuth } from "../app/providers/AuthProvider";
import ProfileMenu from "./ProfileMenu";
import UserAvatar from "./UserAvatar";

const items = [
  { key: "home", href: "/", icon: "/home.svg", size: 26 },
  { key: "search", href: "/rechercher", icon: "/rechercher.svg", size: 26 },
  { key: "meals", href: "/mes-repas", icon: "/ramenetapoire.svg", size: 32 },
  { key: "messages", href: "/messages", icon: "/messages.svg", size: 32 },
];

export default function BottomMenu() {
  const pathname = usePathname();
  const { isLoggedIn, loading, user } = useAuth();
  const isMeActive = pathname === "/me";
  const isAuthActive = pathname === "/connexion" || pathname === "/inscription";

  return (
    <div className="bottom-menu">
      <nav className="bottom-menu__bar" aria-label="Navigation principale">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.key}
              className={`bottom-menu__item ${isActive ? "bottom-menu__item--active" : ""}`}
              href={item.href}
            >
              <span className="bottom-menu__icon" aria-hidden="true">
                <Image src={item.icon} alt="Logos" width={item.size} height={item.size} />
              </span>
            </Link>
          );
        })}
        {loading ? (
          <div></div>
        ) : isLoggedIn ? (
          <ProfileMenu>
            {(open) => (
              <button
                type="button"
                className={`bottom-menu__item ${isMeActive || open ? "bottom-menu__item--active" : ""} bottom-menu__item--button`}
                aria-label="Ouvrir le menu profil"
              >
                <span className="bottom-menu__avatar">
                  <UserAvatar
                    src={user?.profilePhotoUrl}
                    alt="Profil"
                    size={34}
                  />
                </span>
              </button>
            )}
          </ProfileMenu>
        ) : (
          <Link
            className={`bottom-menu__item ${isAuthActive ? "bottom-menu__item--active" : ""}`}
            href="/inscription"
            aria-label="Créer un compte ou se connecter"
          >
            <span className="bottom-menu__avatar" aria-hidden="true">
              <UserAvatar
                alt="Profil"
                size={34}
              />
            </span>
          </Link>
        )}
      </nav>
    </div>
  );
}