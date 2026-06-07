"use client";

import Image from "next/image";
import Link from "next/link";
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
};

function EventCardContent({
  title,
  city,
  dateLabel,
  host,
  showHost = false,
}: Omit<EventCardProps, "variant" | "layout" | "href">) {
  return (
    <>
      <div className="event-card__media" aria-hidden="true">
        <div className="event-card__plate">
          <Image
            src="/ramenetapoire.svg"
            alt=""
            width={58}
            height={58}
            className="event-card__logo"
          />
        </div>
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
        showHost={showHost}
      />
    </article>
  );
}