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
} from "@/lib/meal-data";
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
} as const;

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { eventId } = await params;
  const payload = await getEventDetailPayload(eventId);

  if (!payload) {
    notFound();
  }

  const { event, hostProfile } = payload;

  const selectedFilters = event.filters
    .map((filterId) => getMealFilterById(filterId)?.label)
    .filter(Boolean);
  const hostFirstName = hostProfile.name.split(" ")[0] ?? hostProfile.name;
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
              <span className={styles.detailChevron} aria-hidden="true" />
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
                <span className={styles.detailChevron} aria-hidden="true" />
              </Link>
            </div>
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

          {event.dietaryPreferenceGroups && event.dietaryPreferenceGroups.length > 0 ? (
            <section
              className={styles.preferenceSection}
              aria-label="Préférences alimentaires"
            >
              <div className={styles.preferenceHead}>
                <h2>Préférences alimentaires</h2>
              </div>

              <div className={styles.preferenceGrid}>
                {event.dietaryPreferenceGroups.map((group) => (
                  <section key={group.title} className={styles.preferenceGroup}>
                    <span className={styles.preferenceTitle}>{group.title}</span>

                    <div className={styles.preferenceBox}>
                      {group.items.map((item) => (
                        <span key={`${group.title}-${item}`} className={styles.preferenceChip}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          ) : null}

          <section className={styles.rulesSection} aria-label="Règles et conditions">
            <div className={styles.rulesHead}>
              <h2>Règles et conditions</h2>
            </div>

            <div className={styles.rulesList}>
              <Link href="#" className={styles.ruleLink}>
                <span>Règles de la maison</span>
                <span className={styles.detailChevron} aria-hidden="true" />
              </Link>
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

          <div className={styles.detailActions}>
            <Link href="/connexion" className={styles.contactButton}>
              <span>Contacter {hostFirstName}</span>
            </Link>
            <Link href="/connexion" className={styles.registerButton}>
              <span>S&apos;inscrire</span>
            </Link>
          </div>
        </section>
      </article>
    </div>
  );
}
