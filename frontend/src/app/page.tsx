"use client";

import Link from "next/link";
import { useAuth } from "./providers/AuthProvider";
import SearchBar from "../components/SearchBar";
import EventCard from "../components/EventCard";
import { buildMealEventHref, getMealEvents } from "../lib/meal-data";
import styles from "./page.module.scss";

const mealEvents = getMealEvents();

const veggieHomeCards = mealEvents
  .filter(
    (event) =>
      event.variant === "veggie" ||
      event.filters.includes("vegetarien") ||
      event.filters.includes("vegetalien"),
  )
  .slice(0, 4);

const nearbyHomeCards = [
  ...mealEvents.filter((event) => event.variant === "nearby"),
  ...mealEvents.filter((event) => event.variant !== "nearby"),
].slice(0, 4);

const homeSections = [
  {
    title: "Prochainement",
    description: "Ne manquez pas les prochains événements !",
    cards: mealEvents.slice(0, 4),
  },
  {
    title: "Veggie",
    description: "Découvrez la cuisine végétarienne",
    cards: veggieHomeCards,
  },
  {
    title: "Autour de moi",
    description: "Les meilleurs événements près de chez vous",
    cards: nearbyHomeCards,
  },
];

export default function Home() {
  const { isLoggedIn, loading } = useAuth();

  return (
    <div className={styles.page}>
      {!loading && !isLoggedIn && (
        <section className={styles.heroCard}>
          <div className={styles.heroContent}>
            <h1>Ramène ta poire !</h1>
            <p>On passe à table</p>
            <div className={styles.heroActions}>
              <Link className={styles.btnGhost} href="/connexion">
                Connexion
              </Link>
              <Link className={styles.btnPrimary} href="/inscription">
                S&apos;inscrire
              </Link>
            </div>
          </div>
        </section>
      )}

      <SearchBar />

      <div className={styles.sections}>
        {homeSections.map((section) => (
          <section key={section.title} className={styles.section}>
            <div className={styles.sectionHead}>
              <div className={styles.sectionCopy}>
                <h2>{section.title}</h2>
                <p>{section.description}</p>
              </div>
              <Link href="#" className={styles.sectionLink}>
                Voir Tout
              </Link>
            </div>

            <div className={styles.cardsRow}>
              {section.cards.map((card) => (
                <EventCard
                  key={`${section.title}-${card.id}`}
                  title={card.title}
                  city={card.city}
                  dateLabel={card.dateLabel}
                  host={card.host}
                  variant={card.variant}
                  href={buildMealEventHref(card.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}