import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, ChevronRight, MapPin, Star } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import {
  buildMealEventHref,
  getMealEventsByHostId,
  getHostProfileById,
} from "@/lib/meal-data";
import HomePhotoGallery from "./HomePhotoGallery";
import ReportProfileButton from "./ReportProfileButton";
import styles from "./public-profile.module.scss";

type PublicProfilePageProps = {
  params: Promise<{
    hostId: string;
  }>;
};

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { hostId } = await params;
  const host = await getHostProfileById(hostId);

  if (!host) {
    notFound();
  }

  const hostEvents = await getMealEventsByHostId(host.id);
  const latestEvent = hostEvents[0];
  const firstName = host.name.split(" ")[0] ?? host.name;
  const needsElision = /^[aeiouyàâäéèêëîïôöùûü]/i.test(firstName);
  const homeTitle = needsElision
    ? `La maison d'${firstName}`
    : `La maison de ${firstName}`;

  return (
    <div className={styles.page}>
      <Link
        href={latestEvent ? buildMealEventHref(latestEvent.id) : "/rechercher"}
        className={styles.backLink}
      >
        <ArrowLeft aria-hidden="true" />
        <span>Retour à l&apos;événement</span>
      </Link>

      <section className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.identity}>
            <div className={styles.avatarFrame}>
              <UserAvatar
                src={host.photoUrl}
                alt={host.name}
                size={112}
                priority
              />
            </div>

            <div className={styles.identityText}>
              <p className={styles.eyebrow}>Profil hôte</p>
              <h1>{host.name}</h1>

              <div className={styles.metaRow}>
                <span>
                  <MapPin />
                  {host.city}
                </span>
                <span>
                  <Star fill="currentColor" />
                  {host.reviewCount > 0 ? host.rating.toFixed(1) : "Nouveau"} ·{" "}
                  {host.reviewCount} avis
                </span>
              </div>
            </div>
          </div>

          <div className={styles.profileActions}>
            {latestEvent && (
              <Link href={buildMealEventHref(latestEvent.id)} className={styles.eventLink}>
                <CalendarDays aria-hidden="true" />
                <span>Voir l&apos;événement</span>
                <ChevronRight aria-hidden="true" />
              </Link>
            )}

            <ReportProfileButton targetUserId={host.id} profileName={host.name} />
          </div>
        </div>

        <div className={styles.stats}>
          <article>
            <strong>{host.completedEvents}</strong>
            <span>événements organisés</span>
          </article>
          <article>
            <strong>{host.responseRate}%</strong>
            <span>taux de réponse</span>
          </article>
          <article>
            <strong>{host.reviewCount}</strong>
            <span>avis participants</span>
          </article>
        </div>
      </section>

      <section className={styles.reviews} id="avis">
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>Avis</p>
            <h2>Ce que disent les participants</h2>
          </div>
        </div>

        <div className={styles.reviewGrid}>
          {host.reviews.length > 0 ? (
            host.reviews.map((review) => (
              <article key={review.id} className={styles.reviewCard}>
                <div className={styles.reviewHead}>
                  <div>
                    <strong>{review.author}</strong>
                    <span>{review.dateLabel}</span>
                  </div>

                  <div className={styles.reviewStars} aria-label={`Note ${review.rating} sur 5`}>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        className={
                          index < review.rating ? styles.starFilled : styles.starEmpty
                        }
                        fill={index < review.rating ? "currentColor" : "none"}
                      />
                    ))}
                  </div>
                </div>

                <p>{review.comment}</p>
                <span className={styles.reviewEvent}>Événement : {review.eventTitle}</span>
              </article>
            ))
          ) : (
            <p className={styles.emptyReviews}>
              Les avis laissés après les événements de cet hôte apparaîtront ici.
            </p>
          )}
        </div>
      </section>

      <section className={styles.homeSection}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>Chez l&apos;hôte</p>
            <h2>{homeTitle}</h2>
          </div>
        </div>

        <HomePhotoGallery homeTitle={homeTitle} photos={host.homePhotos} />
      </section>
    </div>
  );
}
