"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import "./bottom-menu.scss";

const items = [
  { key: "home", href: "/home", icon: "/home.svg", size: 26 },
  { key: "search", href: "/rechercher", icon: "/rechercher.svg", size: 26 },
  { key: "meals", href: "/mes-repas", icon: "/ramenetapoire.svg", size: 32 },
  { key: "messages", href: "/messages", icon: "/messages.svg", size: 32 },
];

export default function BottomMenu() {
  const pathname = usePathname();
  const isMeActive = pathname === "/me";
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
        <Link
          className={`bottom-menu__item ${isMeActive ? "bottom-menu__item--active" : ""}`}
          href="/me"
        >
          <span className="bottom-menu__avatar">
            <Image src="/homme-profil.jpg" alt="Profil" width={34} height={34} />
          </span>
        </Link>
      </nav>
    </div>
  );
}