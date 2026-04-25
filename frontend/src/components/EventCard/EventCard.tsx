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
  href?: string;
};

function EventCardContent({
  title,
  city,
  dateLabel,
  host,
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
        <p className="event-card__city">{city}</p>
        <p className="event-card__date">{dateLabel}</p>
        <h3 className="event-card__title">{title}</h3>
        <p className="event-card__host">{host}</p>
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
  href,
}: EventCardProps) {
  const className = `event-card event-card--${variant} event-card--${layout} ${
    href ? "event-card--link" : ""
  }`;

  if (href) {
    return (
      <Link href={href} className={className}>
        <EventCardContent
          title={title}
          city={city}
          dateLabel={dateLabel}
          host={host}
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
      />
    </article>
  );
}