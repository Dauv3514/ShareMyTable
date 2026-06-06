"use client";

import axios from "axios";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./providers/AuthProvider";
import SearchBar from "../components/SearchBar";
import EventCard from "../components/EventCard";
import { buildMealEventHref, getMealEvents, type MealEvent } from "../lib/meal-data";
import {
  buildEventSectionHref,
  getHomeSections,
  type EventSectionSlug,
} from "../lib/event-sections";
import styles from "./page.module.scss";

function NewsletterModal({
  email,
  error,
  isSubmitting,
  onClose,
  onConfirm,
  onEmailChange,
}: {
  email: string;
  error: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onEmailChange: (value: string) => void;
}) {
  return (
    <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="newsletter-title">
      <button
        type="button"
        className={styles.modalBackdrop}
        onClick={onClose}
        aria-label="Fermer la confirmation newsletter"
      />

      <section className={styles.modalSheet}>
        <p className={styles.modalEyebrow}>Newsletter</p>
        <h2 id="newsletter-title">S&apos;inscrire à notre newsletter ?</h2>
        <p>
          Recevez les nouveaux événements, les idées de tables et les événements près de
          chez vous.
        </p>

        <label className={styles.modalField}>
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="ton.email@example.com"
            autoComplete="email"
          />
        </label>

        {error ? <p className={styles.modalError}>{error}</p> : null}

        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.modalSecondaryButton}
            onClick={onClose}
            disabled={isSubmitting}
          >
            Non
          </button>
          <button
            type="button"
            className={styles.modalPrimaryButton}
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Inscription..." : "Oui, m'inscrire"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function Home() {
  const { isLoggedIn, loading, user } = useAuth();
  const [mealEvents, setMealEvents] = useState<MealEvent[]>([]);
  const [newsletterModalOpen, setNewsletterModalOpen] = useState(false);
  const [newsletterConfirmed, setNewsletterConfirmed] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterError, setNewsletterError] = useState<string | null>(null);
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);
  const sectionRowRefs = useRef<Partial<Record<EventSectionSlug, HTMLDivElement | null>>>({});

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

  useEffect(() => {
    if (newsletterModalOpen) {
      setNewsletterEmail((previousEmail) => previousEmail || user?.email || "");
      setNewsletterError(null);
    }
  }, [newsletterModalOpen, user?.email]);

  const scrollSection = (slug: EventSectionSlug, direction: "left" | "right") => {
    const row = sectionRowRefs.current[slug];

    if (!row) {
      return;
    }

    const firstCard = row.querySelector<HTMLElement>(".event-card");
    const gap = Number.parseFloat(window.getComputedStyle(row).columnGap || "0");
    const cardWidth = firstCard?.getBoundingClientRect().width ?? row.clientWidth / 4;
    const offset = cardWidth + gap;

    row.scrollBy({
      left: direction === "left" ? -offset : offset,
      behavior: "smooth",
    });
  };

  const handleConfirmNewsletter = async () => {
    const normalizedEmail = newsletterEmail.trim().toLowerCase();

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setNewsletterError("Entre une adresse email valide.");
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "/api";

    try {
      setNewsletterSubmitting(true);
      setNewsletterError(null);

      await axios.post(`${apiUrl}/newsletter-subscriptions`, {
        email: normalizedEmail,
      });

      setNewsletterEmail(normalizedEmail);
      setNewsletterConfirmed(true);
      setNewsletterModalOpen(false);
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ?? "Impossible de t'inscrire à la newsletter."
        : "Impossible de t'inscrire à la newsletter.";
      setNewsletterError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setNewsletterSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      {!loading && !isLoggedIn && (
        <section className={styles.heroCard}>
          <div className={styles.heroContent}>
            <h1>Ramène ta poire</h1>
            <div className={styles.heroActions}>
              <Link className={styles.btnGhost} href="/connexion">
                Se connecter
              </Link>
              <Link className={styles.btnPrimary} href="/inscription">
                Voir plus de repas
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
              <div className={styles.sectionActions}>
                <Link href={buildEventSectionHref(section.slug)} className={styles.sectionLink}>
                  Voir Tout
                </Link>
              </div>
            </div>

            <div className={styles.cardsRail}>
              <button
                type="button"
                className={styles.sectionNavButton}
                onClick={() => scrollSection(section.slug, "left")}
                aria-label={`Voir les cartes précédentes dans ${section.title}`}
              >
                <span aria-hidden="true">‹</span>
              </button>

              <div
                className={styles.cardsRow}
                ref={(node) => {
                  sectionRowRefs.current[section.slug] = node;
                }}
              >
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

              <button
                type="button"
                className={styles.sectionNavButton}
                onClick={() => scrollSection(section.slug, "right")}
                aria-label={`Voir les cartes suivantes dans ${section.title}`}
              >
                <span aria-hidden="true">›</span>
              </button>
            </div>

            {section.slug === "autour-de-moi" ? (
              <div className={styles.newsletterBlock}>
                <button
                  type="button"
                  className={styles.newsletterButton}
                  onClick={() => setNewsletterModalOpen(true)}
                >
                  S&apos;inscrire à notre newsletter
                </button>
                {newsletterConfirmed ? (
                  <p>Votre demande d&apos;inscription a bien été prise en compte.</p>
                ) : null}
              </div>
            ) : null}
          </section>
        ))}
      </div>

      {newsletterModalOpen ? (
        <NewsletterModal
          email={newsletterEmail}
          error={newsletterError}
          isSubmitting={newsletterSubmitting}
          onClose={() => setNewsletterModalOpen(false)}
          onConfirm={handleConfirmNewsletter}
          onEmailChange={setNewsletterEmail}
        />
      ) : null}
    </div>
  );
}