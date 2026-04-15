"use client";

import Link from "next/link";
import { useAuth } from "./providers/AuthProvider";
import SearchBar from "../components/SearchBar";
import EventCard from "../components/EventCard";
import styles from "./page.module.scss";

const homeSections = [
  {
    title: "Prochainement",
    description: "Ne manquez pas les prochains repas !",
    cards: [
      { title: "Brunch du samedi", city: "Rennes", dateLabel: "Ven. 3 avr.", host: "Antoine GREGE", variant: "default" as const },
      { title: "Pasta party", city: "Rennes", dateLabel: "Sam. 4 avr.", host: "Claire DUMAS", variant: "default" as const },
      { title: "Couscous maison", city: "Rennes", dateLabel: "Dim. 5 avr.", host: "Nora ZEGH", variant: "default" as const },
      { title: "Pizza entre voisins", city: "Rennes", dateLabel: "Lun. 6 avr.", host: "Alex MARTIN", variant: "default" as const },
    ],
  },
  {
    title: "Veggie",
    description: "Découvrez la cuisine végétarienne",
    cards: [
      { title: "Curry doux veggie", city: "Rennes", dateLabel: "Ven. 3 avr.", host: "Lina ROUSSEAU", variant: "veggie" as const },
      { title: "Table végétale", city: "Rennes", dateLabel: "Sam. 4 avr.", host: "Emma DUBOIS", variant: "veggie" as const },
      { title: "Dhal & naan", city: "Rennes", dateLabel: "Dim. 5 avr.", host: "Salomé BRUN", variant: "veggie" as const },
      { title: "Lasagnes légumes", city: "Rennes", dateLabel: "Mar. 7 avr.", host: "Julie RENARD", variant: "veggie" as const },
    ],
  },
  {
    title: "Autour de moi",
    description: "Les meilleurs repas près de chez vous",
    cards: [
      { title: "Apéro tapas", city: "Rennes", dateLabel: "Jeu. 9 avr.", host: "Maxime PETIT", variant: "nearby" as const },
      { title: "Dîner de quartier", city: "Rennes", dateLabel: "Ven. 10 avr.", host: "Sarah BERNARD", variant: "nearby" as const },
      { title: "Repas entre voisins", city: "Rennes", dateLabel: "Sam. 11 avr.", host: "Noah GARNIER", variant: "nearby" as const },
      { title: "Brunch du coin", city: "Rennes", dateLabel: "Dim. 12 avr.", host: "Camille FAURE", variant: "nearby" as const },
    ],
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
                  key={`${section.title}-${card.title}`}
                  title={card.title}
                  city={card.city}
                  dateLabel={card.dateLabel}
                  host={card.host}
                  variant={card.variant}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
