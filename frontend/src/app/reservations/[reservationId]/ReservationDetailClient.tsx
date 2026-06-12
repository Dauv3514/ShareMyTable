"use client";

import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import {
  CalendarDays,
  CircleAlert,
  ChevronLeft,
  Clock3,
  CreditCard,
  History,
  House,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  Star,
  Ticket,
  Users,
} from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  cancelGuestReservation,
  confirmReservationTip,
  createReservationReview,
  getReservationCancellationQuote,
  getReservationBadgeLabel,
  getReservationBadgeStatus,
  getGuestReservationById,
  getReservationPaymentLabel,
  updateReservationReview,
  type CreateReservationReviewResponse,
  type ReservationItem,
  type ReservationReview,
  type ReservationTip,
} from "@/lib/reservations";
import styles from "./reservation-detail.module.scss";

const ReservationExactMap = dynamic(() => import("./ReservationExactMap"), {
  ssr: false,
  loading: () => (
    <div className={styles.exactMapLoading} aria-live="polite">
      Chargement de la carte...
    </div>
  ),
});

const ADDRESS_RELEASE_DELAY_MS = 24 * 60 * 60 * 1000;
const REVIEW_STEP_LABELS = ["Avis", "Note", "Pourboire"] as const;
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

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

function isExactAddressVisible(reservation: ReservationItem) {
  if (reservation.status !== "confirmed") {
    return false;
  }

  const mealDateTime = new Date(reservation.mealDateTime).getTime();

  if (!Number.isFinite(mealDateTime)) {
    return false;
  }

  return Date.now() >= mealDateTime - ADDRESS_RELEASE_DELAY_MS;
}

function getExactMapCenter(reservation: ReservationItem): [number, number] | null {
  if (
    typeof reservation.exactLocationLat !== "number" ||
    typeof reservation.exactLocationLng !== "number"
  ) {
    return null;
  }

  if (
    !Number.isFinite(reservation.exactLocationLat) ||
    !Number.isFinite(reservation.exactLocationLng)
  ) {
    return null;
  }

  return [reservation.exactLocationLat, reservation.exactLocationLng];
}

function toCents(value: number) {
  return Math.max(0, Math.round(value * 100));
}

function buildStoredReview(
  result: CreateReservationReviewResponse,
): ReservationReview {
  return {
    ...result.review,
    tip: result.tip
      ? {
          id: result.tip.id,
          amountCents: result.tip.amountCents,
          paymentId: result.tip.paymentId,
          status: result.tip.status,
          paidAt: result.tip.paidAt,
          createdAt: result.tip.createdAt,
        }
      : null,
  };
}

function StripeTipPaymentForm({
  tip,
  onPaid,
  onError,
}: {
  tip: ReservationTip;
  onPaid: () => void;
  onError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isPayingTip, setIsPayingTip] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stripe || !elements) {
      onError("Stripe n'est pas encore prêt. Réessaie dans quelques secondes.");
      return;
    }

    try {
      setIsPayingTip(true);
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (result.error) {
        onError(result.error.message ?? "Le pourboire n'a pas pu être confirmé.");
        return;
      }

      await confirmReservationTip(tip.id);
      onPaid();
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Impossible de confirmer le pourboire pour le moment.",
      );
    } finally {
      setIsPayingTip(false);
    }
  };

  return (
    <form className={styles.tipStripeForm} onSubmit={(event) => void handleSubmit(event)}>
      <PaymentElement options={{ layout: "tabs" }} />
      <button
        type="submit"
        className={styles.primaryButton}
        disabled={!stripe || !elements || isPayingTip}
      >
        {isPayingTip ? "Paiement..." : `Payer ${formatPrice(tip.amountCents / 100)}`}
      </button>
    </form>
  );
}

export default function ReservationDetailClient({
  reservationId,
}: {
  reservationId: string;
}) {
  const router = useRouter();
  const { isLoggedIn, loading } = useAuth();
  const [reservation, setReservation] = useState<ReservationItem | null>(null);
  const [isFetchingReservation, setIsFetchingReservation] = useState(true);
  const [isCancellingReservation, setIsCancellingReservation] = useState(false);
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [reviewStep, setReviewStep] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [tipAmount, setTipAmount] = useState(1);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewResult, setReviewResult] =
    useState<CreateReservationReviewResponse | null>(null);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [editReviewComment, setEditReviewComment] = useState("");
  const [editReviewRating, setEditReviewRating] = useState(5);
  const [isSavingReviewEdit, setIsSavingReviewEdit] = useState(false);

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/connexion");
    }
  }, [isLoggedIn, loading, router]);

  useEffect(() => {
    if (loading || !isLoggedIn) {
      return;
    }

    let cancelled = false;

    const loadReservation = async () => {
      try {
        setIsFetchingReservation(true);
        setReservationError(null);
        const nextReservation = await getGuestReservationById(reservationId);

        if (!cancelled) {
          setReservation(nextReservation);
        }
      } catch (error) {
        if (!cancelled) {
          setReservation(null);
          setReservationError(
            error instanceof Error
              ? error.message
              : "Impossible de charger cette réservation pour le moment.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsFetchingReservation(false);
        }
      }
    };

    void loadReservation();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, loading, reservationId]);

  useEffect(() => {
    if (!reservation?.review) {
      return;
    }

    setEditReviewComment(reservation.review.comment ?? "");
    setEditReviewRating(reservation.review.rating);
  }, [reservation?.review]);

  if (loading || isFetchingReservation) {
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
          <h1>{reservationError ? "Impossible de charger la réservation" : "Réservation introuvable"}</h1>
          <p>
            {reservationError
              ? reservationError
              : "Cette réservation n'existe pas ou n'est plus disponible."}
          </p>
          <Link href="/mes-evenements" className={styles.primaryButton}>
            Retour à mes réservations
          </Link>
        </div>
      </section>
    );
  }

  const addressVisible = isExactAddressVisible(reservation);
  const exactMapCenter = addressVisible ? getExactMapCenter(reservation) : null;
  const badgeStatus = getReservationBadgeStatus(reservation);
  const cancellationQuote = getReservationCancellationQuote(reservation);
  const canShowReviewFlow = reservation.canReview && !reservation.hasReview;
  const pendingTip = reviewResult?.tip?.clientSecret ? reviewResult.tip : null;
  const pendingTipClientSecret = pendingTip?.clientSecret ?? null;

  const handleCancelReservation = async () => {
    if (!cancellationQuote.canCancel) {
      toast.error(cancellationQuote.label);
      return;
    }

    const confirmed = window.confirm(
      `Confirmer l'annulation ?\n\n${cancellationQuote.label}\nMontant remboursé estimé : ${formatPrice(
        cancellationQuote.refundAmount,
      )}\nMontant retenu estimé : ${formatPrice(cancellationQuote.retainedAmount)}`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsCancellingReservation(true);
      const cancelledReservation = await cancelGuestReservation(reservation.id);

      if (cancelledReservation) {
        setReservation(cancelledReservation);
      }

      toast.success("Ta réservation a bien été annulée.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible d'annuler cette réservation pour le moment.",
      );
    } finally {
      setIsCancellingReservation(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reservation) {
      return;
    }

    try {
      setIsSubmittingReview(true);
      const result = await createReservationReview({
        reservationId: reservation.id,
        rating: reviewRating,
        comment: reviewComment,
        tipAmountCents: toCents(tipAmount),
      });

      setReviewResult(result);

      if (!result.tip?.clientSecret) {
        setReservation({
          ...reservation,
          canReview: false,
          hasReview: true,
          review: buildStoredReview(result),
        });
        toast.success("Merci, ton avis a bien été enregistré.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer ton avis pour le moment.",
      );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const completeReviewWithPaidTip = () => {
    if (!reviewResult) {
      return;
    }

    setReservation({
      ...reservation,
      canReview: false,
      hasReview: true,
      review: {
        ...buildStoredReview(reviewResult),
        tip: reviewResult.tip
          ? {
              id: reviewResult.tip.id,
              amountCents: reviewResult.tip.amountCents,
              paymentId: reviewResult.tip.paymentId,
              status: "succeeded",
              paidAt: new Date().toISOString(),
              createdAt: reviewResult.tip.createdAt,
            }
          : null,
      },
    });
    toast.success("Merci, ton avis et ton pourboire ont bien été envoyés.");
  };

  const beginReviewEdit = () => {
    setEditReviewComment(reservation.review?.comment ?? "");
    setEditReviewRating(reservation.review?.rating ?? 5);
    setIsEditingReview(true);
  };

  const handleSaveReviewEdit = async () => {
    try {
      setIsSavingReviewEdit(true);
      const updatedReview = await updateReservationReview({
        reservationId: reservation.id,
        rating: editReviewRating,
        comment: editReviewComment,
      });

      setReservation({
        ...reservation,
        review: {
          ...updatedReview,
          tip: reservation.review?.tip ?? null,
        },
      });
      setIsEditingReview(false);
      toast.success("Ton avis a bien été modifié.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de modifier ton avis pour le moment.",
      );
    } finally {
      setIsSavingReviewEdit(false);
    }
  };

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
            <Link href="/mes-evenements" className={styles.backLink}>
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

            {addressVisible && (
              <div className={styles.exactMap}>
                <div className={styles.exactMapHeader}>
                  <div>
                    <h2>Adresse exacte</h2>
                    <p>Le point indique l&apos;adresse de l'événement.</p>
                  </div>
                </div>
                <ReservationExactMap
                  center={exactMapCenter}
                  addressLabel={reservation.exactAddressLabel}
                />
              </div>
            )}
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

              <div className={styles.cancellationPreview}>
                <strong>{cancellationQuote.label}</strong>
                <span>
                  Montant remboursé estimé : {formatPrice(cancellationQuote.refundAmount)}
                </span>
                <span>
                  Montant retenu estimé : {formatPrice(cancellationQuote.retainedAmount)}
                </span>
              </div>

              <div className={styles.actions}>
                <Link
                  href={`/profil/${reservation.hostId}`}
                  className={`${styles.secondaryButton} ${styles.hostButton}`}
                >
                  Voir l&apos;hôte
                </Link>
                <button
                  type="button"
                  className={styles.warningButton}
                  disabled={!cancellationQuote.canCancel || isCancellingReservation}
                  onClick={() => void handleCancelReservation()}
                >
                  {isCancellingReservation ? "Annulation..." : "Annuler la réservation"}
                </button>
              </div>
            </article>
          </section>

          {canShowReviewFlow ? (
            <section className={`${styles.panel} ${styles.reviewPanel}`}>
              <div className={styles.reviewHeader}>
                <div>
                  <h2>Donner mon avis</h2>
                  <p>
                    Partage ton ressenti sur cet événement et ajoute un pourboire si tu le souhaites.
                  </p>
                </div>
                <div className={styles.reviewSteps}>
                  {REVIEW_STEP_LABELS.map((label, index) => (
                    <button
                      key={label}
                      type="button"
                      className={`${styles.reviewStep} ${
                        reviewStep === index ? styles["reviewStep--active"] : ""
                      } ${index < reviewStep ? styles["reviewStep--done"] : ""}`}
                      onClick={() => setReviewStep(index)}
                      disabled={Boolean(pendingTip)}
                    >
                      <span
                        className={
                          index < reviewStep ? styles["reviewStepIcon--done"] : ""
                        }
                      >
                        <Image
                          src={index < reviewStep ? "/poire1.svg" : "/poire2.svg"}
                          alt=""
                          width={18}
                          height={22}
                          aria-hidden="true"
                        />
                      </span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {!pendingTip ? (
                <>
                  {reviewStep === 0 ? (
                    <div className={styles.reviewStage}>
                      <label htmlFor="review-comment">Un avis ?</label>
                      <textarea
                        id="review-comment"
                        value={reviewComment}
                        onChange={(event) => setReviewComment(event.target.value)}
                        maxLength={1000}
                        placeholder="Écris quelques mots sur ton expérience chez l'hôte."
                      />
                    </div>
                  ) : null}

                  {reviewStep === 1 ? (
                    <div className={styles.reviewStage}>
                      <span className={styles.reviewLabel}>Une note ?</span>
                      <div className={styles.ratingButtons} aria-label="Note de l'événement">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            key={value}
                            type="button"
                            className={`${styles.ratingButton} ${
                              value <= reviewRating ? styles["ratingButton--active"] : ""
                            }`}
                            onClick={() => setReviewRating(value)}
                            aria-label={`${value} étoile${value > 1 ? "s" : ""}`}
                          >
                            <Star />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {reviewStep === 2 ? (
                    <div className={styles.reviewStage}>
                      <span className={styles.reviewLabel}>Un pourboire ?</span>
                      <p className={styles.reviewHelper}>
                        Montre que vous avez apprécié l'événement en laissant un pourboire.
                      </p>
                      <div className={styles.tipCounter}>
                        <button
                          type="button"
                          className={styles.tipCounterButton}
                          onClick={() => setTipAmount((value) => Math.max(0, value - 0.5))}
                          aria-label="Diminuer le pourboire"
                        >
                          <Minus />
                        </button>
                        <strong>{formatPrice(tipAmount)}</strong>
                        <button
                          type="button"
                          className={styles.tipCounterButton}
                          onClick={() => setTipAmount((value) => Math.min(100, value + 0.5))}
                          aria-label="Augmenter le pourboire"
                        >
                          <Plus />
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className={styles.reviewActions}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => setReviewStep((value) => Math.max(0, value - 1))}
                      disabled={reviewStep === 0 || isSubmittingReview}
                    >
                      Étape précédente
                    </button>
                    {reviewStep < REVIEW_STEP_LABELS.length - 1 ? (
                      <button
                        type="button"
                        className={styles.primaryButton}
                        onClick={() => setReviewStep((value) => Math.min(2, value + 1))}
                      >
                        Continuer
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.primaryButton}
                        onClick={() => void handleSubmitReview()}
                        disabled={isSubmittingReview}
                      >
                        {isSubmittingReview ? "Envoi..." : "Envoyer mon avis"}
                      </button>
                    )}
                  </div>
                </>
              ) : pendingTipClientSecret ? (
                <div className={styles.reviewStage}>
                  <span className={styles.reviewLabel}>Paiement du pourboire</span>
                  {stripePromise ? (
                    <Elements
                      stripe={stripePromise}
                      options={{
                        clientSecret: pendingTipClientSecret,
                        appearance: {
                          theme: "stripe",
                          variables: {
                            colorPrimary: "#8f8448",
                            colorText: "#17120d",
                            colorBackground: "#fffdf7",
                            borderRadius: "18px",
                          },
                        },
                      }}
                    >
                      <StripeTipPaymentForm
                        tip={pendingTip}
                        onPaid={completeReviewWithPaidTip}
                        onError={(message) => toast.error(message)}
                      />
                    </Elements>
                  ) : (
                    <p className={styles.errorText}>
                      La clé publique Stripe est manquante. Vérifie NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.
                    </p>
                  )}
                </div>
              ) : null}
            </section>
          ) : null}

          {reservation.hasReview && reservation.review ? (
            <section className={`${styles.panel} ${styles.reviewDonePanel}`}>
              <div className={styles.reviewSummaryHeader}>
                <div>
                  <h2>Mon avis</h2>
                  <p>Tu peux modifier la note et le commentaire laissés sur cette événement.</p>
                </div>
                {!isEditingReview ? (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={beginReviewEdit}
                  >
                    Modifier
                  </button>
                ) : null}
              </div>

              {!isEditingReview ? (
                <>
                  <div className={styles.reviewSummaryGrid}>
                    <article className={styles.reviewSummaryItem}>
                      <span>Ma note</span>
                      <div className={styles.summaryRating}>
                        {[1, 2, 3, 4, 5].map((value) => (
                          <Star
                            key={value}
                            className={
                              value <= reservation.review!.rating
                                ? styles.summaryStarActive
                                : styles.summaryStar
                            }
                          />
                        ))}
                      </div>
                    </article>
                    <article className={styles.reviewSummaryItem}>
                      <span>Pourboire</span>
                      <strong>
                        {formatPrice((reservation.review.tip?.amountCents ?? 0) / 100)}
                      </strong>
                      <small>
                        {reservation.review.tip
                          ? reservation.review.tip.status === "succeeded"
                            ? "Payé"
                            : "En attente"
                          : "Aucun pourboire"}
                      </small>
                    </article>
                  </div>

                  <article className={styles.reviewCommentBox}>
                    <span>Mon avis</span>
                    <p>
                      {reservation.review.comment?.trim() ||
                        "Aucun commentaire laissé pour cette événement."}
                    </p>
                  </article>
                </>
              ) : (
                <div className={styles.reviewEditForm}>
                  <span className={styles.reviewLabel}>Modifier mon avis</span>
                  <div className={styles.ratingButtons} aria-label="Modifier la note de l'événement">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`${styles.ratingButton} ${
                          value <= editReviewRating ? styles["ratingButton--active"] : ""
                        }`}
                        onClick={() => setEditReviewRating(value)}
                        aria-label={`${value} étoile${value > 1 ? "s" : ""}`}
                      >
                        <Star />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={editReviewComment}
                    onChange={(event) => setEditReviewComment(event.target.value)}
                    maxLength={1000}
                    placeholder="Modifie ton commentaire."
                  />
                  <div className={styles.reviewActions}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => setIsEditingReview(false)}
                      disabled={isSavingReviewEdit}
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={() => void handleSaveReviewEdit()}
                      disabled={isSavingReviewEdit}
                    >
                      {isSavingReviewEdit ? "Enregistrement..." : "Enregistrer"}
                    </button>
                  </div>
                </div>
              )}
            </section>
          ) : null}

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
