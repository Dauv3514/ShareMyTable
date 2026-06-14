"use client";

import Image from "next/image";
import Link from "next/link";
import { getNextImageSrc } from "@/lib/image-src";
import "./event-card.scss";

type EventCardProps = {
  title: string;
  city: string;
  dateLabel: string;
  host: string;
  variant?: "default" | "veggie" | "nearby";
  layout?: "tile" | "wide";
  featured?: boolean;
  showHost?: boolean;
  href?: string;
  imageUrl?: string | null;
};

function EventCardContent({
  title,
  city,
  dateLabel,
  host,
  imageUrl,
  showHost = false,
}: Omit<EventCardProps, "variant" | "layout" | "href">) {
  return (
    <>
      <div className="event-card__media">
        <Image
          src={getNextImageSrc(imageUrl)}
          alt={title}
          fill
          sizes="(max-width: 720px) 112px, 260px"
          className="event-card__image"
        />
      </div>

      <div className="event-card__body">
        <h3 className="event-card__title">{title}</h3>
        {showHost ? <p className="event-card__host">{host}</p> : null}
        <p className="event-card__city">{city}</p>
        <p className="event-card__date">{dateLabel}</p>
      </div>
    </>
  );
}

export default function EventCard({
  title,
  city,
  dateLabel,
  host,
  variant = "default",
  layout = "tile",
  featured = false,
  showHost = false,
  href,
  imageUrl,
}: EventCardProps) {
  const className = `event-card event-card--${variant} event-card--${layout} ${
    href ? "event-card--link" : ""
  } ${featured ? "event-card--featured" : ""}`;

  if (href) {
    return (
      <Link href={href} className={className}>
        <EventCardContent
          title={title}
          city={city}
          dateLabel={dateLabel}
          host={host}
          imageUrl={imageUrl}
          showHost={showHost}
        />
      </Link>
    );
  }

  return (
    <article className={className}>
      <EventCardContent
        title={title}
        city={city}
        dateLabel={dateLabel}
        host={host}
        imageUrl={imageUrl}
        showHost={showHost}
      />
    </article>
  );
}
