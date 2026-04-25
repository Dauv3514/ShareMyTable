import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, House } from "lucide-react";
import {
  buildMealEventMapHref,
  getMealEventById,
  mealFilterById,
} from "@/lib/search-data";
import styles from "./event-detail.module.scss";

type EventDetailPageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { eventId } = await params;
  const event = getMealEventById(eventId);

  if (!event) {
    notFound();
  }

  const selectedFilters = event.filters
    .map((filterId) => mealFilterById.get(filterId)?.label)
    .filter(Boolean);
  const participationRatio = Math.min(
    100,
    Math.round((event.currentParticipants / event.maxParticipants) * 100),
  );

  return (
    <div className={styles.page}>
      <article className={styles.sheet}>
        <header className={styles.hero}>
          <div className={styles.heroPhoto}>
            <Image
              src="/photoRepas.png"
              alt={event.title}
              fill
              priority
              className={styles.heroImage}
              sizes="(max-width: 640px) 100vw, 920px"
            />
          </div>
        </header>

        <section className={styles.content}>
          <div className={styles.headline}>
            <div className={styles.headlineMain}>
              <h1>{event.title}</h1>
              <p>
                <span>{event.detailDateLabel}</span>
                <span>{event.timeLabel}</span>
              </p>
            </div>

            <div className={styles.priceBlock}>
              <strong>{event.pricePerPerson}€</strong>
              <span>par personne</span>
            </div>
          </div>

          <div className={styles.participants}>
            <div className={styles.participantsGrid}>
              <span>Participants</span>
              <strong>
                {event.currentParticipants}/{event.maxParticipants}
              </strong>
            </div>
            <div className={styles.progress} aria-hidden="true">
              <span style={{ width: `${participationRatio}%` }} />
            </div>
          </div>

          <div className={styles.filters}>
            {selectedFilters.map((filter) => (
              <span key={filter} className={styles.filterChip}>
                {filter}
              </span>
            ))}
          </div>

          <section className={styles.locationSection} aria-label="Lieu de l'événement">
            <div className={styles.locationBlock}>
              <span className={styles.locationIcon} aria-hidden="true">
                <House />
              </span>

              <div className={styles.locationText}>
                <strong>{event.locationLabel}</strong>
                <span>{event.city}</span>
              </div>
            </div>

            <Link
              href={buildMealEventMapHref(event.id)}
              className={styles.locationLink}
            >
              <span>Voir sur la carte</span>
              <ChevronRight aria-hidden="true" />
            </Link>
          </section>
        </section>
      </article>
    </div>
  );
}
