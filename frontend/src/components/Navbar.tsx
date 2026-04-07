"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/app/providers/AuthProvider";
import "./navbar.scss";

const navItems = [
    { label: "Rechercher", href: "#" },
    { label: "Mes repas", href: "#" },
    { label: "Créer un événement", href: "#" },
    { label: "Messagerie", href: "#" },
];

export default function Navbar() {
    const { isLoggedIn } = useAuth();
    return (
        <header className="navbar">
            <div className="navbar__inner">
                <Link href="/" className="navbar__logo" aria-label="RamèneTaPoire">
                    <div className="navbar__logoRTP">
                        <Image
                            src="/ramenetapoire.svg"
                            alt="Profil"
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
                </nav>

                {!isLoggedIn && (
                    <div className="navbar__actions">
                        <Link href="/connexion" className="navbar__btn navbar__btn--ghost">
                            Connexion
                        </Link>
                        <Link href="/inscription" className="navbar__btn navbar__btn--primary">
                            S'inscrire
                        </Link>
                    </div>
                )}

                {isLoggedIn && (
                    <div className="navbar__profile">
                        <div className="navbar__avatar">
                            <Image
                                src="/homme-profil.jpg"
                                alt="Profil"
                                width={42}
                                height={42}
                                priority
                            />
                        </div>
                        <div className="navbar__profile-text">
                            <span className="navbar__profile-title">Title</span>
                            <span className="navbar__profile-subtitle">Description</span>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}