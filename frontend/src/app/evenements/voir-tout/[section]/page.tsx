import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import EventCard from "@/components/EventCard";
import {
  buildEventSectionHref,
  type EventSectionSlug,
  getEventSectionBySlug,
  getEventsForSection,
} from "@/lib/event-sections";
import { buildMealEventHref, getMealEvents } from "@/lib/meal-data";
import styles from "./section-list.module.scss";

type EventSectionPageProps = {
  params: Promise<{
    section: string;
  }>;
  searchParams: Promise<{
    page?: string;
  }>;
};

const ITEMS_PER_PAGE = 8;

function normalizePage(pageValue?: string) {
  const page = Number(pageValue);

  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }

  return Math.floor(page);
}

function buildPaginationHref(section: EventSectionSlug, page: number) {
  const baseHref = buildEventSectionHref(section);

  if (page <= 1) {
    return baseHref;
  }

  return `${baseHref}?page=${page}`;
}

export default async function EventSectionPage({
  params,
  searchParams,
}: EventSectionPageProps) {
  const { section: sectionSlug } = await params;
  const { page: rawPage } = await searchParams;
  const section = getEventSectionBySlug(sectionSlug);

  if (!section) {
    notFound();
  }

  const allEvents = await getMealEvents();
  const sectionEvents = getEventsForSection(allEvents, section.slug);
  const totalPages = Math.max(1, Math.ceil(sectionEvents.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(normalizePage(rawPage), totalPages);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedEvents = sectionEvents.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft aria-hidden="true" />
          <span>Retour à l&apos;accueil</span>
        </Link>
      </div>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Voir tout</p>
          <h1>{section.title}</h1>
          <p>{section.description}</p>
        </div>

        <div className={styles.heroMeta}>
          <strong>{sectionEvents.length}</strong>
          <span>{sectionEvents.length > 1 ? "événements" : "événement"}</span>
        </div>
      </section>

      {paginatedEvents.length > 0 ? (
        <section className={styles.grid} aria-label={section.title}>
          {paginatedEvents.map((event) => (
            <EventCard
              key={`${section.slug}-${event.id}`}
              title={event.title}
              city={event.city}
              dateLabel={event.dateLabel}
              host={event.host}
              imageUrl={event.imageUrl}
              variant={event.variant}
              href={buildMealEventHref(event.id)}
            />
          ))}
        </section>
      ) : (
        <section className={styles.emptyState}>
          <h2>{section.emptyTitle}</h2>
          <p>{section.emptyDescription}</p>
        </section>
      )}

      {totalPages > 1 ? (
        <nav className={styles.pagination} aria-label="Pagination">
          <Link
            href={buildPaginationHref(section.slug, currentPage - 1)}
            className={`${styles.paginationButton} ${
              currentPage === 1 ? styles["paginationButton--disabled"] : ""
            }`}
            aria-disabled={currentPage === 1}
            tabIndex={currentPage === 1 ? -1 : undefined}
          >
            Précédent
          </Link>

          <div className={styles.paginationPages}>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <Link
                key={page}
                href={buildPaginationHref(section.slug, page)}
                className={`${styles.paginationPage} ${
                  page === currentPage ? styles["paginationPage--active"] : ""
                }`}
                aria-current={page === currentPage ? "page" : undefined}
              >
                {page}
              </Link>
            ))}
          </div>

          <Link
            href={buildPaginationHref(section.slug, currentPage + 1)}
            className={`${styles.paginationButton} ${
              currentPage === totalPages ? styles["paginationButton--disabled"] : ""
            }`}
            aria-disabled={currentPage === totalPages}
            tabIndex={currentPage === totalPages ? -1 : undefined}
          >
            Suivant
          </Link>
        </nav>
      ) : null}
    </div>
  );
}
