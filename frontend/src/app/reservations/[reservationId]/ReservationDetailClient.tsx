"use client";

import {
  CalendarDays,
  CircleAlert,
  ChevronLeft,
  Clock3,
  CreditCard,
  History,
  House,
  MapPin,
  ShieldCheck,
  Ticket,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  getReservationBadgeLabel,
  getReservationBadgeStatus,
  getGuestReservationById,
  getReservationPaymentLabel,
  type ReservationItem,
} from "@/lib/reservations";
import styles from "./reservation-detail.module.scss";

function formatPrice(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function getPaymentMethodLabel(paymentMethod: ReservationItem["paymentMethod"]) {
  if (paymentMethod === "apple-pay") {
    return "Apple Pay";
  }

  if (paymentMethod === "paypal") {
    return "PayPal";
  }

  return "Carte bancaire";
}

function getStatusIcon(status: ReturnType<typeof getReservationBadgeStatus>) {
  if (status === "past") {
    return <History />;
  }

  if (status === "confirmed") {
    return <ShieldCheck />;
  }

  if (status === "pending") {
    return <Clock3 />;
  }

  return <CircleAlert />;
}

export default function ReservationDetailClient({
  reservationId,
}: {
  reservationId: string;
}) {
  const router = useRouter();
  const { isLoggedIn, loading } = useAuth();
  const [reservation] = useState<ReservationItem | null>(() =>
    getGuestReservationById(reservationId),
  );

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/connexion");
    }
  }, [isLoggedIn, loading, router]);

  if (loading) {
    return <section className={styles.loadingState}>Chargement de ta réservation...</section>;
  }

  if (!isLoggedIn) {
    return null;
  }

  if (!reservation) {
    return (
      <section className={styles.page}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Ticket />
          </div>
          <h1>Réservation introuvable</h1>
          <p>
            Cette réservation n&apos;existe pas dans les données mock enregistrées
            localement.
          </p>
          <Link href="/mes-repas" className={styles.primaryButton}>
            Retour à mes réservations
          </Link>
        </div>
      </section>
    );
  }

  const addressVisible = reservation.status === "confirmed";
  const badgeStatus = getReservationBadgeStatus(reservation);

  return (
    <section className={styles.page}>
      <article className={styles.sheet}>
        <header className={styles.hero}>
          <div className={styles.heroPhoto}>
            <Image
              src={reservation.coverImageUrl}
              alt={reservation.mealTitle}
              fill
              priority
              className={styles.heroImage}
              sizes="(max-width: 640px) 100vw, 920px"
            />
          </div>
        </header>

        <section className={styles.content}>
          <div className={styles.topBar}>
            <Link href="/mes-repas" className={styles.backLink}>
              <ChevronLeft />
              Retour à mes réservations
            </Link>
            <span
              className={`${styles.statusBadge} ${
                styles[`statusBadge--${badgeStatus}`]
              }`}
            >
              {getStatusIcon(badgeStatus)}
              {getReservationBadgeLabel(badgeStatus)}
            </span>
          </div>

          <div className={styles.headline}>
            <div className={styles.headlineMain}>
              <h1>{reservation.mealTitle}</h1>
              <div className={styles.headlineMeta}>
                <span className={styles.metaChip}>
                  <CalendarDays />
                  {reservation.detailDateLabel}
                </span>
                <span className={styles.metaChip}>
                  <Clock3 />
                  {reservation.timeLabel}
                </span>
              </div>
            </div>

            <div className={styles.priceBlock}>
              <strong>{formatPrice(reservation.totalPrice)}</strong>
              <span>{reservation.seats} place(s)</span>
            </div>
          </div>

          <div className={styles.infoGrid}>
            <article className={styles.infoCard}>
              <h2>Statut du paiement</h2>
              <p>{getReservationPaymentLabel(reservation.paymentState)}</p>
            </article>
            <article className={styles.infoCard}>
              <h2>Méthode de paiement</h2>
              <p>{getPaymentMethodLabel(reservation.paymentMethod)}</p>
            </article>
          </div>

          <section className={styles.locationSection}>
            <div className={styles.locationBlock}>
              <span className={styles.locationIcon}>
                <MapPin />
              </span>
              <div className={styles.locationText}>
                <strong>
                  {addressVisible
                    ? reservation.exactAddressLabel
                    : reservation.locationLabel}
                </strong>
                <span>{addressVisible ? "Adresse visible" : reservation.addressReleaseLabel}</span>
              </div>
            </div>
          </section>

          <section className={styles.detailGrid}>
            <article className={styles.panel}>
              <h2>Récapitulatif</h2>
              <dl className={styles.metaList}>
                <div>
                  <dt>
                    <CalendarDays />
                    Date
                  </dt>
                  <dd>{reservation.detailDateLabel}</dd>
                </div>
                <div>
                  <dt>
                    <Clock3 />
                    Heure
                  </dt>
                  <dd>{reservation.timeLabel}</dd>
                </div>
                <div>
                  <dt>
                    <Users />
                    Places
                  </dt>
                  <dd>{reservation.seats} place(s)</dd>
                </div>
                <div>
                  <dt>
                    <CreditCard />
                    Prix / place
                  </dt>
                  <dd>{formatPrice(reservation.pricePerSeat)}</dd>
                </div>
                <div>
                  <dt>
                    <House />
                    Total
                  </dt>
                  <dd>{formatPrice(reservation.totalPrice)}</dd>
                </div>
              </dl>
            </article>

            <article className={`${styles.panel} ${styles.panelActions}`}>
              <h2>Rappels & actions</h2>
              <ul className={styles.noticeList}>
                {reservation.reminderLabels.map((item) => (
                  <li key={item}>{item}</li>
                ))}
                <li>{reservation.cancellationPolicyLabel}</li>
              </ul>

              <div className={styles.actions}>
                <Link href={`/profil/${reservation.hostId}`} className={styles.secondaryButton}>
                  Voir l&apos;hôte
                </Link>
                <button type="button" className={styles.warningButton}>
                  Annuler la réservation
                </button>
              </div>
            </article>
          </section>

          <section className={styles.panel}>
            <h2>Règles importantes</h2>
            <ul className={styles.ruleList}>
              {reservation.houseRules.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </section>
      </article>
    </section>
  );
}