import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Dessert, Salad, ShieldCheck, Soup, Star, UtensilsCrossed, House } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import {
  getMealFilterById,
} from "@/lib/search-data";
import {
  buildHostProfileHref,
  buildMealEventMapHref,
  getEventDetailPayload,
  getHostProfileById,
} from "@/lib/meal-data";
import {
  EventDietaryPreferenceSection,
  EventProfileFilters,
} from "./ProfilePreferencePanels";
import RegisterEventLink from "./RegisterEventLink";
import styles from "./event-detail.module.scss";

type EventDetailPageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

const menuIcons = {
  "Entrée": Salad,
  "Plat": UtensilsCrossed,
  "Dessert": Dessert,
  "Salé": UtensilsCrossed,
  "Sucré": Dessert,
  "Boissons": Soup,
  "À grignoter": UtensilsCrossed,
  "À partager": UtensilsCrossed,
  "Viennoiseries & pains": Dessert,
  "Fruits & accompagnements": Salad,
} as const;

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { eventId } = await params;
  const payload = await getEventDetailPayload(eventId);

  if (!payload) {
    notFound();
  }

  const { event, hostProfile, hostReviews } = payload;
  const displayedReviews = hostReviews.slice(0, 6);
  const hostReviewCount = hostReviews.length > 0 ? hostReviews.length : hostProfile.reviewCount;
  const hostAverageRating =
    hostReviews.length > 0
      ? hostReviews.reduce((total, review) => total + review.rating, 0) / hostReviews.length
      : hostProfile.rating;

  const selectedFilterDefinitions = event.filters
    .map((filterId) => getMealFilterById(filterId))
    .filter((filter): filter is NonNullable<ReturnType<typeof getMealFilterById>> => Boolean(filter));
  const dietaryFilters = selectedFilterDefinitions
    .filter((filter) => filter.category === "dietary-preferences")
    .map((filter) => filter.label);
  const ambianceFilters = selectedFilterDefinitions
    .filter((filter) => filter.category === "meal-ambiance")
    .map((filter) => filter.label);
  const houseRuleTags = event.houseRuleTags ?? [];
  const houseRulesDescription = event.houseRules?.trim() ?? "";
  const participantProfiles = (
    await Promise.all(
      (event.participantProfileIds ?? [])
        .slice(0, event.currentParticipants)
        .map((participantId) => getHostProfileById(participantId)),
    )
  ).filter(Boolean);
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
              src={hostProfile?.homePhotos[0] ?? "/photoRepas.png"}
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
              <div className={styles.participantsMeta}>
                <span>Participants</span>
                {participantProfiles.length > 0 ? (
                  <div className={styles.participantAvatarList} aria-label="Participants au repas">
                    {participantProfiles.map((participant) => (
                      <Link
                        key={participant.id}
                        href={buildHostProfileHref(participant.id)}
                        className={styles.participantAvatarLink}
                        aria-label={`Voir le profil de ${participant.name}`}
                      >
                        <span className={styles.participantAvatarFrame}>
                          <UserAvatar
                            src={participant.photoUrl}
                            alt={participant.name}
                            size={32}
                          />
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
              <strong>
                {event.currentParticipants}/{event.maxParticipants}
              </strong>
            </div>
            <div className={styles.progress} aria-hidden="true">
              <span style={{ width: `${participationRatio}%` }} />
            </div>
          </div>

          <EventProfileFilters tags={ambianceFilters} />

          <div className={styles.detailActions}>
            <RegisterEventLink
              eventId={event.id}
              hostUserId={event.hostId}
              className={styles.registerButton}
            >
              <span>S&apos;inscrire à l&apos;événement</span>
            </RegisterEventLink>
          </div>

          <section className={styles.locationSection} aria-label="Lieu de l&apos;événement">
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
              <span className={styles.detailChevron} aria-hidden="true" />
            </Link>
          </section>

          <section className={styles.hostSection} aria-label="Profil de l&apos;hôte">
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

              <div className={styles.hostRating} aria-label={`Note ${hostAverageRating.toFixed(1)} sur 5`}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className={
                      index < Math.round(hostAverageRating)
                        ? styles.starFilled
                        : styles.starEmpty
                    }
                    fill={index < Math.round(hostAverageRating) ? "currentColor" : "none"}
                  />
                ))}
              </div>

              <p>{hostReviewCount} avis</p>
            </article>

            <Link
              href={buildHostProfileHref(hostProfile.id)}
              className={styles.hostProfileLink}
            >
              <span>Voir le profil de l&apos;hôte</span>
              <span className={styles.detailChevron} aria-hidden="true" />
            </Link>
          </section>

          <section className={styles.menuSection} aria-label="Au menu">
            <div className={styles.menuHead}>
              <h2>Au menu</h2>
            </div>

            <div className={styles.menuGrid}>
              {event.menuSections.map((section) => (
                <section key={section.title} className={styles.menuCourse}>
                  <div className={styles.menuCourseHead}>
                    <span className={styles.menuCourseIcon} aria-hidden="true">
                      {(() => {
                        const Icon = menuIcons[section.title as keyof typeof menuIcons] ?? Soup;
                        return <Icon />;
                      })()}
                    </span>
                    <h3>{section.title}</h3>
                  </div>
                  <ul>
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </section>

          <section className={styles.reviewsSection} aria-label="Avis">
            <div className={styles.reviewsHead}>
              <h2>Avis</h2>
              <Link
                href={`${buildHostProfileHref(hostProfile.id)}#avis`}
                className={styles.reviewsAllLink}
              >
                <span>Voir tous</span>
                <span className={styles.detailChevron} aria-hidden="true" />
              </Link>
            </div>

            {displayedReviews.length > 0 ? (
              <div className={styles.reviewsScroller}>
                {displayedReviews.map((review) => (
                  <article key={review.id} className={styles.reviewCard}>
                    <div className={styles.reviewAuthor}>
                      <span className={styles.reviewAvatarFrame}>
                        <UserAvatar
                          src={review.authorPhotoUrl}
                          alt={review.author}
                          size={58}
                        />
                      </span>
                      <div>
                        <strong>{review.author}</strong>
                        <span>{review.eventTitle}</span>
                      </div>
                    </div>

                    <div className={styles.reviewMeta}>
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
                      <time>{review.dateLabel}</time>
                    </div>

                    <p>{review.comment}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className={styles.reviewsEmpty}>
                Les avis laissés après les repas de cet hôte apparaîtront ici.
              </p>
            )}
          </section>

          <EventDietaryPreferenceSection tags={dietaryFilters} />

          <section className={styles.rulesSection} aria-label="Règles de maisons et conditions">
            <div className={styles.rulesHead}>
              <h2>Règles de maisons et conditions</h2>
            </div>

            <div className={styles.rulesList}>
              {houseRuleTags.length > 0 || houseRulesDescription ? (
                <section className={styles.hostRulesPanel} aria-label="Informations de l'hôte">
                  {houseRuleTags.length > 0 ? (
                    <div className={styles.hostRulesChips}>
                      {houseRuleTags.map((tag) => (
                        <span key={tag} className={styles.hostRuleChip}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {houseRulesDescription ? (
                    <p>{houseRulesDescription}</p>
                  ) : null}
                </section>
              ) : null}

              <Link href="#" className={styles.ruleLink}>
                <span>Règlement de l&apos;application</span>
                <span className={styles.detailChevron} aria-hidden="true" />
              </Link>
              <Link href="#" className={styles.ruleLink}>
                <span>Politique d&apos;annulation</span>
                <span className={styles.detailChevron} aria-hidden="true" />
              </Link>
            </div>
          </section>
        </section>
      </article>
    </div>
  );
}
