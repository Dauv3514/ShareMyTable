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
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  ShieldCheck,
  Ticket,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "@/app/providers/AuthProvider";
import type { HostProfile, MealEvent } from "@/lib/data/types";
import {
  clearReservationDraft,
  createGuestReservation,
  createReservationPaymentIntent,
  getGuestReservationById,
  getReservationPaymentLabel,
  getReservationStatusLabel,
  readReservationDraft,
  saveReservationDraft,
  type ReservationDraft,
  type ReservationItem,
  type ReservationPaymentIntent,
  type ReservationPaymentMethod,
} from "@/lib/reservations";
import { buildMealEventHref } from "@/lib/meal-data";
import styles from "./reservation-wizard.module.scss";

type ReservationWizardMode = "places" | "recap" | "payment" | "confirmation";

type ReservationWizardProps = {
  event: MealEvent;
  hostProfile: HostProfile;
  mode: ReservationWizardMode;
};

const STEP_MODES: ReservationWizardMode[] = [
  "places",
  "recap",
  "payment",
  "confirmation",
];

const STEP_LABELS = [
  "Places",
  "Récapitulatif",
  "Paiement",
  "Confirmation",
] as const;

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;
const PAYMENT_SESSION_STORAGE_PREFIX = "reservation-payment-session:";

const PAYMENT_METHODS: Array<{
  id: ReservationPaymentMethod;
  title: string;
  description: string;
}> = [
  {
    id: "card",
    title: "Carte bancaire",
    description: "Paiement sécurisé type CB / Visa / Mastercard",
  },
  {
    id: "apple-pay",
    title: "Apple Pay",
    description: "Validation rapide depuis ton appareil",
  },
  {
    id: "paypal",
    title: "PayPal",
    description: "Paiement en un clic avec ton compte",
  },
];

function getStepIndex(mode: ReservationWizardMode) {
  return STEP_MODES.indexOf(mode);
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function getDefaultDraft(maxSeats: number): ReservationDraft {
  return {
    seats: Math.max(1, Math.min(1, maxSeats || 1)),
    paymentMethod: "card",
  };
}

type ReservationPaymentSession = {
  reservationId: string;
  seats: number;
};

type StripePaymentFormProps = {
  eventId: string;
  reservationId: string;
  onError: (message: string) => void;
  onSubmittingChange: (value: boolean) => void;
};

function getPaymentSessionStorageKey(eventId: string) {
  return `${PAYMENT_SESSION_STORAGE_PREFIX}${eventId}`;
}

function readPaymentSession(eventId: string): ReservationPaymentSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(getPaymentSessionStorageKey(eventId));

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<ReservationPaymentSession>;

    if (
      typeof parsed.reservationId !== "string" ||
      typeof parsed.seats !== "number"
    ) {
      return null;
    }

    return {
      reservationId: parsed.reservationId,
      seats: parsed.seats,
    };
  } catch {
    return null;
  }
}

function savePaymentSession(eventId: string, session: ReservationPaymentSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    getPaymentSessionStorageKey(eventId),
    JSON.stringify(session),
  );
}

function clearPaymentSession(eventId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(getPaymentSessionStorageKey(eventId));
}

function StripePaymentForm({
  eventId,
  reservationId,
  onError,
  onSubmittingChange,
}: StripePaymentFormProps) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();

    if (!stripe || !elements) {
      onError("Stripe n'est pas encore prêt. Réessaie dans quelques secondes.");
      return;
    }

    try {
      onSubmittingChange(true);

      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/reservation/${eventId}/confirmation?reservationId=${reservationId}`,
        },
        redirect: "if_required",
      });

      if (result.error) {
        onError(result.error.message ?? "Le paiement n'a pas pu être confirmé.");
        return;
      }

      const paymentStatus = result.paymentIntent?.status;

      if (
        paymentStatus === "succeeded" ||
        paymentStatus === "processing" ||
        paymentStatus === "requires_capture"
      ) {
        clearPaymentSession(eventId);
        router.push(`/reservation/${eventId}/confirmation?reservationId=${reservationId}`);
        return;
      }

      onError("Le paiement est en attente de confirmation. Réessaie dans quelques instants.");
    } finally {
      onSubmittingChange(false);
    }
  };

  return (
    <form className={styles.stripeForm} onSubmit={(event) => void handleSubmit(event)}>
      <div className={styles.stripeElementCard}>
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
      </div>

      <button
        type="submit"
        className={styles.inlinePrimaryButton}
        disabled={!stripe || !elements}
      >
        Confirmer le paiement
      </button>
    </form>
  );
}

export default function ReservationWizard({
  event,
  hostProfile,
  mode,
}: ReservationWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, loading } = useAuth();
  const [draft, setDraft] = useState<ReservationDraft>(() =>
    getDefaultDraft(Math.max(1, event.maxParticipants - event.currentParticipants)),
  );
  const [hasMounted, setHasMounted] = useState(false);
  const [createdReservation, setCreatedReservation] = useState<ReservationItem | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isFetchingCreatedReservation, setIsFetchingCreatedReservation] = useState(false);
  const [createdReservationError, setCreatedReservationError] = useState<string | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<ReservationPaymentIntent | null>(null);
  const [isPreparingPayment, setIsPreparingPayment] = useState(false);

  const currentStep = getStepIndex(mode);
  const progressPercent = ((currentStep + 1) / STEP_LABELS.length) * 100;
  const remainingSeats = Math.max(0, event.maxParticipants - event.currentParticipants);
  const summaryTotal = draft.seats * event.pricePerPerson;
  const reservationId = searchParams.get("reservationId");
  const usesBackendStripePayment = /^\d+$/.test(event.id);

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/connexion");
    }
  }, [isLoggedIn, loading, router]);

  useEffect(() => {
    const savedDraft = readReservationDraft(event.id);
    if (savedDraft) {
      setDraft({
        seats: Math.max(1, Math.min(savedDraft.seats, Math.max(1, remainingSeats || 1))),
        paymentMethod: savedDraft.paymentMethod,
      });
    }

    setHasMounted(true);
  }, [event.id, remainingSeats]);

  useEffect(() => {
    if (mode !== "confirmation" || !reservationId) {
      return;
    }

    let cancelled = false;

    const loadReservation = async () => {
      try {
        setIsFetchingCreatedReservation(true);
        setCreatedReservationError(null);
        const reservation = await getGuestReservationById(reservationId);

        if (!cancelled) {
          setCreatedReservation(reservation);
        }
      } catch (error) {
        if (!cancelled) {
          setCreatedReservation(null);
          setCreatedReservationError(
            error instanceof Error
              ? error.message
              : "Impossible de charger la réservation confirmée.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsFetchingCreatedReservation(false);
        }
      }
    };

    void loadReservation();

    return () => {
      cancelled = true;
    };
  }, [mode, reservationId]);

  useEffect(() => {
    if (mode !== "confirmation") {
      return;
    }

    clearPaymentSession(event.id);
  }, [event.id, mode]);

  useEffect(() => {
    if (
      mode !== "payment" ||
      !usesBackendStripePayment ||
      loading ||
      !isLoggedIn
    ) {
      return;
    }

    if (!stripePromise) {
      setCreatedReservationError(
        "La clé publique Stripe est manquante. Vérifie NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.",
      );
      return;
    }

    let cancelled = false;

    const prepareStripePayment = async () => {
      try {
        setIsPreparingPayment(true);
        setCreatedReservationError(null);

        const storedSession = readPaymentSession(event.id);
        let reservation: ReservationItem | null = null;

        if (storedSession && storedSession.seats === draft.seats) {
          reservation = await getGuestReservationById(storedSession.reservationId);
        }

        if (!reservation) {
          reservation = await createGuestReservation({
            event,
            hostProfile,
            draft,
          });
          savePaymentSession(event.id, {
            reservationId: reservation.id,
            seats: draft.seats,
          });
        } else if (!storedSession) {
          savePaymentSession(event.id, {
            reservationId: reservation.id,
            seats: draft.seats,
          });
        }

        const nextPaymentIntent = await createReservationPaymentIntent(reservation.id);

        if (!cancelled) {
          setCreatedReservation(reservation);
          setPaymentIntent(nextPaymentIntent);
        }
      } catch (error) {
        if (!cancelled) {
          setCreatedReservationError(
            error instanceof Error
              ? error.message
              : "Impossible de préparer le paiement sécurisé.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsPreparingPayment(false);
        }
      }
    };

    void prepareStripePayment();

    return () => {
      cancelled = true;
    };
  }, [
    draft,
    event,
    hostProfile,
    isLoggedIn,
    loading,
    mode,
    usesBackendStripePayment,
  ]);

  const recapRows = useMemo(
    () => [
      { label: "Événement", value: event.title },
      { label: "Hôte", value: hostProfile.name },
      { label: "Date", value: event.detailDateLabel },
      { label: "Heure", value: event.timeLabel },
      { label: "Places", value: `${draft.seats}` },
      { label: "Prix / place", value: `${event.pricePerPerson}€` },
      { label: "Total", value: `${summaryTotal}€` },
    ],
    [draft.seats, event.detailDateLabel, event.pricePerPerson, event.timeLabel, event.title, hostProfile.name, summaryTotal],
  );

  const isStepLocked = (stepIndex: number) =>
    mode === "confirmation" || stepIndex > currentStep;

  const goTo = (nextMode: Exclude<ReservationWizardMode, "confirmation">) => {
    router.push(`/reservation/${event.id}/${nextMode}`);
  };

  const goToStep = (stepIndex: number) => {
    if (mode === "confirmation" || stepIndex > currentStep) {
      return;
    }

    const nextMode = STEP_MODES[stepIndex];

    if (!nextMode || nextMode === mode || nextMode === "confirmation") {
      return;
    }

    goTo(nextMode);
  };

  const persistDraft = (nextDraft: ReservationDraft) => {
    setDraft(nextDraft);
    saveReservationDraft(event.id, nextDraft);
  };

  const updateSeats = (nextSeats: number) => {
    const safeSeats = Math.max(1, Math.min(nextSeats, Math.max(1, remainingSeats || 1)));
    persistDraft({
      ...draft,
      seats: safeSeats,
    });
  };

  const handlePayment = async () => {
    if (usesBackendStripePayment) {
      toast.info("Confirme le paiement directement dans le formulaire Stripe.");
      return;
    }

    try {
      setIsSubmittingPayment(true);
      setCreatedReservationError(null);

      const reservation = await createGuestReservation({
        event,
        hostProfile,
        draft,
      });

      setCreatedReservation(reservation);
      router.push(`/reservation/${event.id}/confirmation?reservationId=${reservation.id}`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de finaliser la réservation pour le moment.";

      toast.error(message);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const renderFooterActions = () => {
    if (mode === "places") {
      return (
        <>
          <Link href={buildMealEventHref(event.id)} className={styles.footerGhostButton}>
            <ChevronLeft />
            Retour à l&apos;événement
          </Link>
          <button
            type="button"
            className={styles.footerPrimaryButton}
            onClick={() => goTo("recap")}
          >
            Continuer
            <ChevronRight />
          </button>
        </>
      );
    }

    if (mode === "recap") {
      return (
        <>
          <button
            type="button"
            className={styles.footerGhostButton}
            onClick={() => goTo("places")}
          >
            <ChevronLeft />
            Étape précédente
          </button>
          <button
            type="button"
            className={styles.footerPrimaryButton}
            onClick={() => goTo("payment")}
          >
            Passer au paiement
            <ChevronRight />
          </button>
        </>
      );
    }

    if (mode === "payment") {
      if (usesBackendStripePayment) {
        return (
          <>
            <button
              type="button"
              className={styles.footerGhostButton}
              onClick={() => goTo("recap")}
            >
              <ChevronLeft />
              Étape précédente
            </button>
          </>
        );
      }

      return (
        <>
          <button
            type="button"
            className={styles.footerGhostButton}
            onClick={() => goTo("recap")}
          >
            <ChevronLeft />
            Étape précédente
          </button>
          <button
            type="button"
            className={styles.footerPrimaryButton}
            onClick={handlePayment}
            disabled={isSubmittingPayment}
          >
            {isSubmittingPayment ? "Paiement..." : "Payer"}
            <ShieldCheck />
          </button>
        </>
      );
    }

    if (createdReservation) {
      return (
        <>
          <Link href="/" className={styles.footerGhostButton}>
            Retour a l&apos;accueil
          </Link>
          <Link href="/mes-evenements" className={styles.footerPrimaryButton}>
            Voir mes réservations
          </Link>
        </>
      );
    }

    return (
      <>
        <button
          type="button"
          className={styles.footerGhostButton}
          onClick={() => {
            clearReservationDraft(event.id);
            goTo("places");
          }}
        >
          Recommencer
        </button>
        <Link href="/mes-evenements" className={styles.footerPrimaryButton}>
          Mes réservations
        </Link>
      </>
    );
  };

  if (
    loading ||
    !hasMounted ||
    (mode === "confirmation" && Boolean(reservationId) && isFetchingCreatedReservation)
  ) {
    return <section className={styles.loadingState}>Chargement de la réservation...</section>;
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <section className={styles.page}>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <span className={styles.kicker}>Invité</span>
            <h1>Réserver une table</h1>
            <p>
              Un parcours simple en 4 étapes pour choisir vos places, vérifier le
              récapitulatif, effectuer le paiement et confirmer votre réservation.
            </p>

            <div className={styles.progressTrack} aria-hidden="true">
              <span
                className={styles.progressFill}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className={styles.progressList}>
              {STEP_LABELS.map((label, index) => {
                const isDone = index < currentStep;
                const isCurrent = index === currentStep;
                const isLocked = isStepLocked(index);

                return (
                  <button
                    key={label}
                    type="button"
                    className={`${styles.progressItem} ${
                      isDone ? styles["progressItem--done"] : ""
                    } ${isCurrent ? styles["progressItem--current"] : ""}`}
                    onClick={() => goToStep(index)}
                    disabled={isLocked}
                  >
                    <span
                      className={`${styles.progressIndex} ${
                        isDone ? styles["progressIndex--done"] : ""
                      }`}
                    >
                      <Image
                        src={isDone ? "/poire1.svg" : "/poire2.svg"}
                        alt=""
                        width={18}
                        height={22}
                        aria-hidden="true"
                      />
                    </span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            <div className={styles.summaryCard}>
              <div className={styles.summaryMedia}>
                <Image
                  src={hostProfile.homePhotos[0] ?? "/photoRepas.png"}
                  alt={event.title}
                  fill
                  className={styles.summaryImage}
                  sizes="(max-width: 960px) 100vw, 340px"
                />
              </div>

              <div className={styles.summaryBody}>
                <strong>{event.title}</strong>
                <dl>
                  <div>
                    <dt>
                      <CalendarDays />
                      Date
                    </dt>
                    <dd>{event.detailDateLabel}</dd>
                  </div>
                  <div>
                    <dt>
                      <Users />
                      Places restantes
                    </dt>
                    <dd>{remainingSeats}</dd>
                  </div>
                  <div>
                    <dt>
                      <CreditCard />
                      Total
                    </dt>
                    <dd>{formatPrice(summaryTotal)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </aside>

        <div className={styles.contentColumn}>
          <div className={styles.stageCard}>
            <div className={styles.mobileProgress}>
              <div className={styles.mobileProgressBar}>
                <span style={{ width: `${progressPercent}%` }} />
              </div>
              <p>
                Étape {currentStep + 1} sur {STEP_LABELS.length}
              </p>
              <div className={styles.mobileSteps}>
                {STEP_LABELS.map((label, index) => {
                  const isDone = index < currentStep;

                  return (
                    <button
                      key={label}
                      type="button"
                      className={`${styles.mobileStepButton} ${
                        currentStep === index ? styles["mobileStepButton--active"] : ""
                      } ${isDone ? styles["mobileStepButton--done"] : ""}`}
                      onClick={() => goToStep(index)}
                      disabled={isStepLocked(index)}
                    >
                      <Image
                        src={isDone ? "/poire1.svg" : "/poire2.svg"}
                        alt=""
                        width={18}
                        height={22}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.stageBody}>
              {createdReservationError ? (
                <p className={styles.errorText}>{createdReservationError}</p>
              ) : null}

              {mode === "places" ? (
                <div className={`${styles.stage} ${styles.stagePlaces}`}>
                  <span className={styles.kicker}>Étape 1</span>
                  <h2>Combien de places souhaitez-vous réserver ?</h2>
                  <p className={styles.stageIntro}>
                    Ajuste le nombre de convives avant de passer au récapitulatif.
                  </p>

                  <div className={styles.bookingCard}>
                    <div className={styles.heroPanel}>
                      <div>
                        <strong>{event.title}</strong>
                        <span>
                          {event.detailDateLabel} - {event.timeLabel}
                        </span>
                        <span>{event.pricePerPerson}€ par place</span>
                      </div>
                      <span className={styles.remainingSeatsBadge}>
                        {remainingSeats} places restantes
                      </span>
                    </div>

                    <div className={styles.counterBox}>
                      <button
                        type="button"
                        className={styles.counterButton}
                        onClick={() => updateSeats(draft.seats - 1)}
                        disabled={draft.seats <= 1}
                      >
                        -
                      </button>
                      <span className={styles.counterValue}>{draft.seats}</span>
                      <button
                        type="button"
                        className={styles.counterButton}
                        onClick={() => updateSeats(draft.seats + 1)}
                        disabled={draft.seats >= Math.max(1, remainingSeats)}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <p className={styles.helperText}>
                    Total estimé : <strong>{formatPrice(summaryTotal)}</strong>
                  </p>
                </div>
              ) : null}

              {mode === "recap" ? (
                <div className={styles.stage}>
                  <span className={styles.kicker}>Étape 2</span>
                  <h2>Récapitulatif de la réservation</h2>
                  <p className={styles.stageIntro}>
                    On te rappelle l&apos;essentiel avant le paiement !
                  </p>

                  <div className={styles.recapGrid}>
                    <div className={styles.infoCard}>
                      <h3>Ce que tu réserves</h3>
                      <dl className={styles.recapList}>
                        {recapRows.map((row) => (
                          <div key={row.label}>
                            <dt>{row.label}</dt>
                            <dd>{row.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>

                    <div className={`${styles.infoCard} ${styles.infoCardHighlight}`}>
                      <h3>Infos importantes</h3>
                      <ul className={styles.noticeList}>
                        <li>Paiement bloqué jusqu&apos;à la tenue de l&apos;événement.</li>
                        <li>Adresse exacte partagée 24h avant.</li>
                        <li>Annulation gratuite jusqu&apos;à 48h avant, puis retenue partielle.</li>
                        <li>Tu pourras suivre le statut de tes réservations dans Mes événements</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : null}

              {mode === "payment" ? (
                <div className={styles.stage}>
                  <span className={styles.kicker}>Étape 3</span>
                  <h2>Paiement sécurisé</h2>
                  <p className={styles.stageIntro}>
                    {usesBackendStripePayment
                      ? "Renseigne tes informations de paiement dans le formulaire sécurisé Stripe."
                      : "Choisissez votre moyen de paiement pour finaliser la réservation."}
                  </p>

                  <div className={styles.paymentLayout}>
                    {usesBackendStripePayment ? (
                      <div className={styles.paymentMethods}>
                        {isPreparingPayment ? (
                          <div className={styles.stripeLoadingCard}>
                            Préparation du formulaire de paiement sécurisé...
                          </div>
                        ) : paymentIntent?.clientSecret && createdReservation && stripePromise ? (
                          <Elements
                            stripe={stripePromise}
                            options={{
                              clientSecret: paymentIntent.clientSecret,
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
                            <StripePaymentForm
                              eventId={event.id}
                              reservationId={createdReservation.id}
                              onError={(message) => {
                                setCreatedReservationError(message);
                                toast.error(message);
                              }}
                              onSubmittingChange={setIsSubmittingPayment}
                            />
                          </Elements>
                        ) : (
                          <div className={styles.stripeLoadingCard}>
                            Le formulaire Stripe n&apos;a pas pu être initialisé pour cette réservation.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={styles.paymentMethods}>
                        {PAYMENT_METHODS.map((method) => (
                          <button
                            key={method.id}
                            type="button"
                            className={`${styles.paymentMethod} ${
                              draft.paymentMethod === method.id
                                ? styles["paymentMethod--active"]
                                : ""
                            }`}
                            onClick={() =>
                              persistDraft({
                                ...draft,
                                paymentMethod: method.id,
                              })
                            }
                          >
                            <span className={styles.paymentMethodTitle}>{method.title}</span>
                            <span>{method.description}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    <aside className={styles.paymentSummary}>
                      <h3>Total à payer</h3>
                      <strong>{formatPrice(summaryTotal)}</strong>
                      <p>{draft.seats} place(s) pour {event.title}</p>
                      <ul className={styles.paymentNotes}>
                        <li>Autorisation immédiate du paiement</li>
                        <li>Blocage des fonds jusqu&apos;à l&apos;événement</li>
                        <li>L&apos;hôte confirme ou non votre réservation selon le mode de validation choisi</li>
                        {paymentIntent ? (
                          <li>Paiement Stripe préparé pour la réservation #{paymentIntent.bookingId}</li>
                        ) : null}
                      </ul>
                    </aside>
                  </div>
                </div>
              ) : null}

              {mode === "confirmation" ? (
                <div className={styles.stage}>
                  <span className={styles.kicker}>Étape 4</span>
                  <h2>Confirmation immédiate</h2>

                  {createdReservation ? (
                    <>
                      <div className={styles.confirmationHero}>
                        <span className={styles.confirmationIcon}>
                          {createdReservation.status === "confirmed" ? <Check /> : <Ticket />}
                        </span>
                        <div>
                          <strong>{getReservationStatusLabel(createdReservation.status)}</strong>
                          <p>
                            {createdReservation.status === "confirmed"
                              ? "Ta place est confirmée. Tu retrouveras l'adresse exacte 24h avant l'événement."
                              : "Ta demande a bien été envoyée. Le paiement reste autorisé en attendant la validation de l'hôte."}
                          </p>
                        </div>
                      </div>

                      <div className={styles.recapGrid}>
                        <div className={styles.infoCard}>
                          <h3>Réservation enregistrée</h3>
                          <dl className={styles.recapList}>
                            <div>
                              <dt>Evénement</dt>
                              <dd>{createdReservation.mealTitle}</dd>
                            </div>
                            <div>
                              <dt>Date</dt>
                              <dd>{createdReservation.detailDateLabel}</dd>
                            </div>
                            <div>
                              <dt>Heure</dt>
                              <dd>{createdReservation.timeLabel}</dd>
                            </div>
                            <div>
                              <dt>Total</dt>
                              <dd>{formatPrice(createdReservation.totalPrice)}</dd>
                            </div>
                          </dl>
                        </div>

                        <div className={`${styles.infoCard} ${styles.infoCardHighlight}`}>
                          <h3>Ce qui se passe ensuite</h3>
                          <ul className={styles.noticeList}>
                            <li>{getReservationPaymentLabel(createdReservation.paymentState)}</li>
                            <li>
                              Un espace de discussion s&apos;ouvre dans la messagerie pour
                              échanger directement avec l&apos;hôte.
                            </li>
                            <li>
                              {createdReservation.addressReleaseLabel} depuis le détail de la
                              réservation.
                            </li>
                          </ul>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className={styles.emptyState}>
                      <p>Aucune réservation n&apos;a été retrouvée pour cette confirmation.</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className={styles.footerBar}>{renderFooterActions()}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
