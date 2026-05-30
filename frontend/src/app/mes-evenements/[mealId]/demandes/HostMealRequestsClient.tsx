"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  CircleAlert,
  Star,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import UserAvatar from "@/components/UserAvatar";
import {
  acceptHostBooking,
  getHostMealBookings,
  refuseHostBooking,
  type HostBooking,
  type HostMealBookings,
} from "@/lib/host-bookings";
import { useAuth } from "@/app/providers/AuthProvider";
import styles from "./host-meal-requests.module.scss";

type HostMealRequestsClientProps = {
  mealId: string;
};

type ModerationAction = {
  type: "accept" | "refuse";
  booking: HostBooking;
};

function buildGuestName(booking: HostBooking) {
  const fullName = [booking.guest.firstName, booking.guest.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || booking.guest.pseudo || "Invité";
}

function getStatusLabel(booking: HostBooking) {
  if (booking.bookingStatus === "confirmed") {
    return "Acceptée";
  }

  if (booking.bookingStatus === "pending") {
    return "En attente";
  }

  if (booking.bookingStatus === "refused") {
    return "Déclinée";
  }

  if (booking.bookingStatus === "cancelled") {
    return "Annulée";
  }

  return "Passée";
}

function formatMealDate(dateTime: string) {
  return format(new Date(dateTime), "EEEE d MMMM", { locale: fr });
}

function getGuestFirstName(booking: HostBooking) {
  return booking.guest.firstName || booking.guest.pseudo || "Invité";
}

function RatingStars() {
  return (
    <div className={styles.ratingStars} aria-label="Note invitée">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} className={index < 4 ? styles.filledStar : ""} />
      ))}
    </div>
  );
}

function ConfirmedGuest({
  booking,
}: {
  booking: HostBooking;
}) {
  const guestName = getGuestFirstName(booking);

  return (
    <article className={styles.confirmedGuestCard}>
      <UserAvatar
        src={booking.guest.profilePhotoUrl}
        alt={guestName}
        size={86}
      />
      <span>{guestName}</span>
    </article>
  );
}

function GuestRequestCard({
  booking,
  isBusy,
  onAccept,
  onRefuse,
}: {
  booking: HostBooking;
  isBusy: boolean;
  onAccept: (booking: HostBooking) => void;
  onRefuse: (booking: HostBooking) => void;
}) {
  const guestName = buildGuestName(booking);
  const guestFirstName = getGuestFirstName(booking);
  const canModerate = booking.bookingStatus === "pending";
  const isRefused = booking.bookingStatus === "refused";

  return (
    <article
      className={`${styles.requestCard} ${
        isRefused ? styles["requestCard--refused"] : ""
      }`}
    >
      <div className={styles.avatarColumn}>
        <UserAvatar
          src={booking.guest.profilePhotoUrl}
          alt={guestName}
          size={96}
        />
        <span>{guestFirstName}</span>
      </div>

      <div className={styles.requestContent}>
        <div className={styles.requestHead}>
          <div>
            <h3>{guestName}</h3>
            <p>
              {booking.seats} place(s) demandée(s) · {booking.guest.city}
            </p>
            <RatingStars />
          </div>

          {booking.bookingStatus === "pending" ? (
            <span className={styles.newBadge}>+1</span>
          ) : booking.bookingStatus === "refused" ? null : (
            <span
              className={`${styles.statusPill} ${
                styles[`statusPill--${booking.bookingStatus}`]
              }`}
            >
              {booking.bookingStatus === "confirmed" ? <BadgeCheck /> : null}
              {booking.bookingStatus === "refused" ? <X /> : null}
              {getStatusLabel(booking)}
            </span>
          )}
        </div>

        {booking.refusalReason ? (
          <p className={styles.reasonText}>Motif : {booking.refusalReason}</p>
        ) : null}

        <div className={styles.requestActions}>
          {canModerate ? (
            <>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => onRefuse(booking)}
                disabled={isBusy}
              >
                Décliner
                <X />
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => onAccept(booking)}
                disabled={isBusy}
              >
                Accepter
                <Check />
              </button>
            </>
          ) : booking.bookingStatus === "refused" ? (
            <button
              type="button"
              className={styles.fullWidthButton}
              onClick={() => onAccept(booking)}
              disabled={isBusy}
            >
              Accepter
              <Check />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function RequestSection({
  title,
  emptyLabel,
  bookings,
  variant = "requests",
  busyBookingId,
  onAccept,
  onRefuse,
}: {
  title: string;
  emptyLabel: string;
  bookings: HostBooking[];
  variant?: "confirmed" | "requests";
  busyBookingId: number | null;
  onAccept: (booking: HostBooking) => void;
  onRefuse: (booking: HostBooking) => void;
}) {
  return (
    <section className={styles.requestsSection}>
      <div className={styles.sectionHead}>
        <h2>{title}</h2>
        <span>{bookings.length}</span>
      </div>

      {bookings.length > 0 && variant === "confirmed" ? (
        <div className={styles.confirmedGuestList}>
          {bookings.map((booking) => (
            <ConfirmedGuest key={booking.id} booking={booking} />
          ))}
        </div>
      ) : bookings.length > 0 ? (
        <div className={styles.requestsList}>
          {bookings.map((booking) => (
            <GuestRequestCard
              key={booking.id}
              booking={booking}
              isBusy={busyBookingId === booking.id}
              onAccept={onAccept}
              onRefuse={onRefuse}
            />
          ))}
        </div>
      ) : (
        <p className={styles.emptySection}>{emptyLabel}</p>
      )}
    </section>
  );
}

function ModerationModal({
  action,
  reason,
  isBusy,
  onReasonChange,
  onClose,
  onConfirm,
}: {
  action: ModerationAction;
  reason: string;
  isBusy: boolean;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const guestName = buildGuestName(action.booking);
  const guestFirstName = getGuestFirstName(action.booking);
  const isAccept = action.type === "accept";
  const isAcceptingRefused = isAccept && action.booking.bookingStatus === "refused";
  const title = isAccept
    ? isAcceptingRefused
      ? `Accepter finalement la demande de ${guestName} ?`
      : `Accepter la demande de ${guestName} ?`
    : `Décliner la demande de ${guestName} ?`;

  return (
    <div className={styles.modal} role="dialog" aria-modal="true">
      <button
        type="button"
        className={styles.modalBackdrop}
        aria-label="Fermer la fenêtre"
        onClick={isBusy ? undefined : onClose}
      />
      <section
        className={`${styles.modalSheet} ${
          isAccept ? styles["modalSheet--accept"] : ""
        }`}
      >
        {!isAccept ? (
          <button
            type="button"
            className={styles.modalClose}
            onClick={onClose}
            disabled={isBusy}
            aria-label="Fermer"
          >
            <X />
          </button>
        ) : null}

        <h3 className={styles.modalTitle}>{title}</h3>

        <div className={styles.modalGuest}>
          <UserAvatar
            src={action.booking.guest.profilePhotoUrl}
            alt={guestName}
            size={94}
          />
          <span>{guestFirstName}</span>
        </div>

        <div className={styles.modalBody}>
          {isAccept ? (
            <p>
              {guestFirstName} souhaite rejoindre le repas, il s&apos;est engagé
              à respecter les <strong>règles de la maison.</strong>
            </p>
          ) : null}

          {!isAccept ? (
            <label className={styles.modalField}>
              <span>Motif du refus (optionnel)</span>
              <textarea
                value={reason}
                onChange={(event) => onReasonChange(event.target.value)}
                placeholder="Ex : plus assez de places, contrainte d'organisation..."
                rows={4}
              />
            </label>
          ) : null}
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.modalSecondaryButton}
            onClick={onClose}
            disabled={isBusy}
          >
            {isAccept ? "Ne pas accepter" : "Annuler"}
          </button>
          <button
            type="button"
            className={
              isAccept ? styles.modalPrimaryButton : styles.modalDangerButton
            }
            onClick={onConfirm}
            disabled={isBusy}
          >
            {isBusy
              ? "Traitement..."
              : isAccept
                ? "Accepter la demande"
                : "Décliner"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function HostMealRequestsClient({
  mealId,
}: HostMealRequestsClientProps) {
  const router = useRouter();
  const { isLoggedIn, loading } = useAuth();
  const [mealBookings, setMealBookings] = useState<HostMealBookings | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyBookingId, setBusyBookingId] = useState<number | null>(null);
  const [moderationAction, setModerationAction] =
    useState<ModerationAction | null>(null);
  const [refusalReason, setRefusalReason] = useState("");

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/connexion");
    }
  }, [isLoggedIn, loading, router]);

  const loadMealBookings = useCallback(async () => {
    try {
      setIsFetching(true);
      setError(null);
      setMealBookings(await getHostMealBookings(mealId));
    } catch (loadError) {
      setMealBookings(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger les demandes.",
      );
    } finally {
      setIsFetching(false);
    }
  }, [mealId]);

  useEffect(() => {
    if (loading || !isLoggedIn) {
      return;
    }

    void loadMealBookings();
  }, [isLoggedIn, loadMealBookings, loading]);

  const groupedBookings = useMemo(() => {
    const bookings = mealBookings?.bookings ?? [];

    return {
      confirmed: bookings.filter(
        (booking) => booking.bookingStatus === "confirmed",
      ),
      pending: bookings.filter((booking) => booking.bookingStatus === "pending"),
      refused: bookings.filter((booking) => booking.bookingStatus === "refused"),
      cancelled: bookings.filter(
        (booking) => booking.bookingStatus === "cancelled",
      ),
    };
  }, [mealBookings]);

  const replaceBooking = (nextBooking: HostBooking) => {
    setMealBookings((currentMealBookings) => {
      if (!currentMealBookings) {
        return currentMealBookings;
      }

      return {
        ...currentMealBookings,
        bookings: currentMealBookings.bookings.map((booking) =>
          booking.id === nextBooking.id ? nextBooking : booking,
        ),
      };
    });
  };

  const openAcceptModal = (booking: HostBooking) => {
    setModerationAction({ type: "accept", booking });
    setRefusalReason("");
  };

  const openRefuseModal = (booking: HostBooking) => {
    setModerationAction({ type: "refuse", booking });
    setRefusalReason(booking.refusalReason ?? "");
  };

  const confirmModerationAction = async () => {
    if (!moderationAction) {
      return;
    }

    const { booking, type } = moderationAction;

    try {
      setBusyBookingId(booking.id);
      const nextBooking =
        type === "accept"
          ? await acceptHostBooking(booking.id)
          : await refuseHostBooking(booking.id, refusalReason);

      replaceBooking(nextBooking);
      toast.success(
        type === "accept" ? "Demande acceptée." : "Demande déclinée.",
      );
      setModerationAction(null);
      setRefusalReason("");
      void loadMealBookings();
    } catch (moderationError) {
      toast.error(
        moderationError instanceof Error
          ? moderationError.message
          : type === "accept"
            ? "Impossible d'accepter cette demande."
            : "Impossible de refuser cette demande.",
      );
    } finally {
      setBusyBookingId(null);
    }
  };

  if (loading || isFetching) {
    return (
      <section className={styles.page}>
        <div className={styles.loadingState}>Chargement des demandes...</div>
      </section>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  if (error || !mealBookings) {
    return (
      <section className={styles.page}>
        <Link href="/mes-evenements" className={styles.backLink}>
          <ArrowLeft />
          Retour à mes événements
        </Link>
        <div className={styles.errorCard}>
          <CircleAlert />
          <h1>Impossible de charger les demandes</h1>
          <p>{error}</p>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => void loadMealBookings()}
          >
            Réessayer
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <Link href="/mes-evenements" className={styles.backLink}>
        <ArrowLeft />
        Retour à mes événements
      </Link>

      <header className={styles.hero}>
        <div>
          <span className={styles.statusBadge}>Publié</span>
          <h1>{mealBookings.mealTitle || "Repas sans titre"}</h1>
          <p>{formatMealDate(mealBookings.mealDateTime)}</p>
        </div>
      </header>

      <RequestSection
        title="Liste des invités"
        emptyLabel="Aucun invité confirmé pour le moment."
        bookings={groupedBookings.confirmed}
        variant="confirmed"
        busyBookingId={busyBookingId}
        onAccept={openAcceptModal}
        onRefuse={openRefuseModal}
      />

      <RequestSection
        title="En attente"
        emptyLabel="Aucune demande en attente."
        bookings={groupedBookings.pending}
        busyBookingId={busyBookingId}
        onAccept={openAcceptModal}
        onRefuse={openRefuseModal}
      />

      <RequestSection
        title="Déclinées"
        emptyLabel="Aucune demande déclinée."
        bookings={groupedBookings.refused}
        busyBookingId={busyBookingId}
        onAccept={openAcceptModal}
        onRefuse={openRefuseModal}
      />

      {groupedBookings.cancelled.length > 0 ? (
        <RequestSection
          title="Annulées"
          emptyLabel="Aucune demande annulée."
          bookings={groupedBookings.cancelled}
          busyBookingId={busyBookingId}
          onAccept={openAcceptModal}
          onRefuse={openRefuseModal}
        />
      ) : null}

      {moderationAction ? (
        <ModerationModal
          action={moderationAction}
          reason={refusalReason}
          isBusy={busyBookingId === moderationAction.booking.id}
          onReasonChange={setRefusalReason}
          onClose={() => {
            setModerationAction(null);
            setRefusalReason("");
          }}
          onConfirm={() => void confirmModerationAction()}
        />
      ) : null}
    </section>
  );
}
