"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./providers/AuthProvider";
import SearchBar from "../components/SearchBar";
import EventCard from "../components/EventCard";
import { buildMealEventHref, getMealEvents, type MealEvent } from "../lib/meal-data";
import { buildEventSectionHref, getHomeSections } from "../lib/event-sections";
import styles from "./page.module.scss";

export default function Home() {
  const { isLoggedIn, loading } = useAuth();
  const [mealEvents, setMealEvents] = useState<MealEvent[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadEvents = async () => {
      const events = await getMealEvents();
      if (!cancelled) {
        setMealEvents(events);
      }
    };

    void loadEvents();

    return () => {
      cancelled = true;
    };
  }, []);

  const homeSections = useMemo(() => getHomeSections(mealEvents), [mealEvents]);

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
              <Link href={buildEventSectionHref(section.slug)} className={styles.sectionLink}>
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