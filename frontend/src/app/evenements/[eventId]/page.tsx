import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, House, ShieldCheck, Star } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import {
  getMealFilterById,
} from "@/lib/search-data";
import {
  buildHostProfileHref,
  buildMealEventMapHref,
  getHostProfileById,
  getMealEventById,
} from "@/lib/meal-data";
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

  const hostProfile = getHostProfileById(event.hostId);

  if (!hostProfile) {
    notFound();
  }

  const selectedFilters = event.filters
    .map((filterId) => getMealFilterById(filterId)?.label)
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

          <section className={styles.hostSection} aria-label="Profil de l'hôte">
            <article className={styles.hostCard}>
              <div className={styles.hostCardTop}>
                <div className={styles.hostAvatarFrame}>
                  <UserAvatar
                    src={hostProfile.photoUrl}
                    alt={hostProfile.name}
                    size={72}
                    priority
                  />
                </div>

                <span className={styles.hostBadge} aria-hidden="true">
                  <ShieldCheck />
                </span>
              </div>

              <h2>{hostProfile.name}</h2>

              <div className={styles.hostRating} aria-label={`Note ${hostProfile.rating} sur 5`}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} fill="currentColor" />
                ))}
              </div>

              <p>{hostProfile.reviewCount} avis</p>
            </article>

            <div className={styles.hostContent}>
              <div className={styles.hostQuotePanel}>
                <span className={styles.hostQuoteMark} aria-hidden="true">
                  &ldquo;
                </span>
                <blockquote className={styles.hostQuote}>
                  {hostProfile.quote}
                </blockquote>
              </div>

              <Link
                href={buildHostProfileHref(hostProfile.id)}
                className={styles.hostProfileLink}
              >
                <span>Voir le profil</span>
                <ChevronRight aria-hidden="true" />
              </Link>
            </div>
          </section>
        </section>
      </article>
    </div>
  );
}
