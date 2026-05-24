"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/app/providers/AuthProvider";
import ProfileMenu from "../ProfileMenu";
import UserAvatar from "../UserAvatar";
import "./navbar.scss";

const navItems = [
  { label: "Rechercher", href: "/rechercher" },
  { label: "Mes événements", href: "/mes-evenements" },
  { label: "Messagerie", href: "/messages" },
];

export default function Navbar() {
  const { isLoggedIn, loading, user } = useAuth();
  const userRole = user?.role?.toUpperCase();
  const createEventHref =
    userRole === "HOST" || userRole === "ADMIN"
      ? "/mes-evenements/creer"
      : "/profil/devenir-hote";

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link href="/" className="navbar__logo" aria-label="RameneTaPoire">
          <div className="navbar__logoRTP">
            <Image
              src="/ramenetapoire.svg"
              alt="RameneTaPoire"
              width={40}
              height={40}
              priority
            />
          </div>
        </Link>

        <nav className="navbar__links" aria-label="Navigation principale">
          {navItems.map((item) => (
            <Link key={item.label} href={item.href} className="navbar__link">
              {item.label}
            </Link>
          ))}
          <Link href={createEventHref} className="navbar__link">
            Créer un événement
          </Link>
        </nav>

        {loading && <div className="navbar__auth-placeholder" aria-hidden="true" />}

        {!loading && !isLoggedIn && (
          <div className="navbar__actions">
            <Link href="/connexion" className="navbar__btn navbar__btn--ghost">
              Connexion
            </Link>
            <Link href="/inscription" className="navbar__btn navbar__btn--primary">
              S&apos;inscrire
            </Link>
          </div>
        )}

        {!loading && isLoggedIn && (
          <ProfileMenu>
            {(open) => (
              <button
                type="button"
                className={`navbar__profile-button ${
                  open ? "navbar__profile-button--open" : ""
                }`}
                aria-label="Ouvrir le menu profil"
              >
                <div className="navbar__profile">
                  <div className="navbar__avatar">
                    <UserAvatar
                      src={user?.profilePhotoUrl}
                      alt="Profil"
                      size={42}
                      priority
                    />
                  </div>
                </div>
              </button>
            )}
          </ProfileMenu>
        )}
      </div>
    </header>
  );
}
