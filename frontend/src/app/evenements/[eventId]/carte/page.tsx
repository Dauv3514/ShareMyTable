import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, House } from "lucide-react";
import SearchMap from "@/components/SearchMap";
import {
  buildMealEventHref,
  getMealEventById,
} from "@/lib/meal-data";
import { getNextImageSrc } from "@/lib/image-src";
import RegisterEventLink from "../RegisterEventLink";
import styles from "./event-map.module.scss";

type EventMapPageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

function getHostFirstName(hostName: string) {
  const normalizedHostName = hostName.trim();

  if (!normalizedHostName) {
    return "l'hôte";
  }

  return normalizedHostName.split(/\s+/)[0];
}

export default async function EventMapPage({ params }: EventMapPageProps) {
  const { eventId } = await params;
  const event = await getMealEventById(eventId);

  if (!event) {
    notFound();
  }

  const hostFirstName = getHostFirstName(event.host);

  return (
    <div className={styles.page}>
      <Link href={buildMealEventHref(event.id)} className={styles.backLink}>
        <ArrowLeft aria-hidden="true" />
        <span>Retour à l&apos;événement</span>
      </Link>

      <section className={styles.summary}>
        <div className={styles.summaryContent}>
          <div className={styles.summaryMain}>
            <p className={styles.eyebrow}>Lieu de l&apos;événement</p>
            <h1>{event.title}</h1>

            <div className={styles.locationRow}>
              <span className={styles.locationIcon} aria-hidden="true">
                <House />
              </span>

              <div className={styles.locationText}>
                <strong>{event.locationLabel}</strong>
                <span>{event.city}</span>
              </div>
            </div>

            <p className={styles.meta}>
              {event.detailDateLabel} · {event.timeLabel}
            </p>
          </div>

          <div className={styles.summaryPhoto}>
            <Image
              src={getNextImageSrc(event.imageUrl)}
              alt={event.title}
              fill
              priority
              className={styles.summaryPhotoImage}
              sizes="(max-width: 719px) 100vw, 320px"
            />
          </div>
        </div>
      </section>

      <div className={styles.detailActions}>
        <Link href={`/messages/${event.id}`} className={styles.contactButton}>
          <span>Contacter {hostFirstName}</span>
        </Link>
        <RegisterEventLink
          eventId={event.id}
          hostUserId={event.hostId}
          className={styles.registerButton}
        >
          <span>S&apos;inscrire à l&apos;événement</span>
        </RegisterEventLink>
      </div>

      <SearchMap location={event.city} eventCount={1} />
    </div>
  );
}
