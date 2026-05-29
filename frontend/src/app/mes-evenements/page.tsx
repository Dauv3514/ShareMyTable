"use client";

import axios from "axios";
import {
  CalendarDays,
  CircleAlert,
  CirclePlus,
  Clock3,
  Euro,
  FileText,
  History,
  Rocket,
  ShieldCheck,
  Ticket,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  listHostMealBookingSummaries,
  type HostMealBookingSummary,
} from "@/lib/host-bookings";
import {
  getReservationBadgeLabel,
  getReservationBadgeStatus,
  isPastReservation,
  listGuestReservations,
  type ReservationItem,
  type ReservationStatus,
} from "@/lib/reservations";
import { useAuth } from "../providers/AuthProvider";
import styles from "./mes-evenements.module.scss";

type MealStatus = "draft" | "published" | "cancelled" | "done";
type PanelMode = "attending" | "hosting";
type HostingFilter = "upcoming" | "past" | "cancelled" | "draft" | "published";
type AttendingFilter = "all" | "past" | ReservationStatus;

type MealHostSummary = {
  userId: number;
  pseudo: string | null;
  city: string;
  country: string;
};

type MealItem = {
  id: number;
  title: string | null;
  mealType: string | null;
  menuDescription: string | null;
  dateTime: string;
  seatsTotal: number;
  pricePerSeatCents: number;
  houseRules: string | null;
  selectedTagCodes?: string[];
  selectedFilterIds?: string[];
  status: MealStatus;
  createdAt: string;
  updatedAt: string;
  host: MealHostSummary;
};

const HOSTING_FILTER_OPTIONS: Array<{ key: HostingFilter; label: string }> = [
  { key: "upcoming", label: "À venir" },
  { key: "past", label: "Passés" },
  { key: "cancelled", label: "Annulés" },
  { key: "draft", label: "Brouillons" },
  { key: "published", label: "Publiés" },
];

const ATTENDING_FILTER_OPTIONS: Array<{ key: AttendingFilter; label: string }> = [
  { key: "all", label: "Toutes" },
  { key: "confirmed", label: "Confirmées" },
  { key: "pending", label: "En attente de confirmation" },
  { key: "refused", label: "Refusées" },
  { key: "past", label: "Passées" },
];

const HOUSE_RULE_TAG_LABELS: Record<string, string> = {
  arriver_a_l_heure: "Merci d'arriver à l'heure",
  prevenir_allergie: "Préviens-moi en cas d'allergie",
  non_fumeur: "Non-fumeur",
  pas_d_alcool: "Pas d'alcool",
  pas_d_animaux: "Pas d'animaux",
  retirer_ses_chaussures: "Retirer ses chaussures",
  ambiance_calme: "Ambiance calme",
  accessible_pmr: "Accessible PMR",
};

function getStatusLabel(status: MealStatus) {
  if (status === "published") return "Publié";
  if (status === "cancelled") return "Annulé";
  if (status === "done") return "Terminé";
  return "Brouillon";
}

function formatMealDate(dateTime: string) {
  return format(new Date(dateTime), "EEEE d MMMM yyyy 'a' HH:mm", {
    locale: fr,
  });
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function formatReservationPrice(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function isUpcomingMeal(meal: MealItem) {
  return meal.status !== "cancelled" && new Date(meal.dateTime).getTime() >= Date.now();
}

function isPastMeal(meal: MealItem) {
  return meal.status !== "cancelled" && new Date(meal.dateTime).getTime() < Date.now();
}

function sortMealsByDate(meals: MealItem[], direction: "asc" | "desc") {
  return [...meals].sort((firstMeal, secondMeal) => {
    const firstTimestamp = new Date(firstMeal.dateTime).getTime();
    const secondTimestamp = new Date(secondMeal.dateTime).getTime();

    return direction === "asc"
      ? firstTimestamp - secondTimestamp
      : secondTimestamp - firstTimestamp;
  });
}

function paginateMeals(meals: MealItem[], currentPage: number, itemsPerPage: number) {
  const totalPages = Math.max(1, Math.ceil(meals.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;

  return {
    totalPages,
    currentPage: safePage,
    items: meals.slice(startIndex, startIndex + itemsPerPage),
  };
}

function getReservationStatusIcon(status: ReturnType<typeof getReservationBadgeStatus>) {
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

function getHouseRuleLabels(meal: MealItem) {
  const selectedTagCodes = meal.selectedTagCodes ?? [];

  return selectedTagCodes
    .map((tagCode) => HOUSE_RULE_TAG_LABELS[tagCode])
    .filter((label): label is string => Boolean(label));
}

type MealCardProps = {
  meal: MealItem;
  footer?: React.ReactNode;
  hostLabel?: string;
  bookingSummary?: HostMealBookingSummary | null;
};

function MealCard({ meal, footer, hostLabel, bookingSummary }: MealCardProps) {
  const houseRuleLabels = getHouseRuleLabels(meal);

  return (
    <article className={styles.mealCard}>
      <div className={styles.mealCardMedia}>
        <Image
          src="/photoRepas.png"
          alt={meal.title || "Repas"}
          fill
          className={styles.mealCardImage}
          sizes="(max-width: 960px) 100vw, 520px"
        />
        <div className={styles.mealCardOverlay}>
          <span
            className={`${styles.statusBadge} ${
              styles[`statusBadge--${meal.status}`]
            }`}
          >
            {getStatusLabel(meal.status)}
          </span>

          <span className={styles.mealTypeChip}>{meal.mealType || "Repas"}</span>
        </div>
      </div>

      <div className={styles.mealCardContent}>
        <div className={styles.mealCardBody}>
          <h2>{meal.title || "Repas sans titre"}</h2>
          <p>{meal.menuDescription || "Ajoute une description pour donner envie."}</p>
        </div>

        {hostLabel ? <p className={styles.hostHint}>{hostLabel}</p> : null}

        {bookingSummary ? (
          <div className={styles.bookingSummaryBox}>
            <div>
              <strong>{bookingSummary.confirmedSeatsCount}</strong>
              <span>participant(s)</span>
            </div>
            <div>
              <strong>{bookingSummary.pendingBookingsCount}</strong>
              <span>demande(s) en attente</span>
            </div>
          </div>
        ) : null}

        <dl className={styles.mealMetaList}>
          <div>
            <dt>
              <CalendarDays />
              Date
            </dt>
            <dd>{formatMealDate(meal.dateTime)}</dd>
          </div>

          <div>
            <dt>
              <Users />
              Places
            </dt>
            <dd>{meal.seatsTotal} convives</dd>
          </div>

          <div>
            <dt>
              <Euro />
              Prix
            </dt>
            <dd>{formatPrice(meal.pricePerSeatCents)} / place</dd>
          </div>
        </dl>

        {houseRuleLabels.length > 0 ? (
          <div className={styles.rulesBlock}>
            <span>Règles de la maison</span>
            <p>{houseRuleLabels.join(", ")}</p>
          </div>
        ) : null}

        {footer ? <div className={styles.mealActions}>{footer}</div> : null}
      </div>
    </article>
  );
}

type ReservationCardProps = {
  reservation: ReservationItem;
};

function ReservationCard({ reservation }: ReservationCardProps) {
  const badgeStatus = getReservationBadgeStatus(reservation);

  return (
    <article className={styles.reservationCard}>
      <div className={styles.reservationMedia}>
        <Image
          src={reservation.coverImageUrl}
          alt={reservation.mealTitle}
          fill
          className={styles.reservationImage}
          sizes="(max-width: 1100px) 100vw, 520px"
        />
      </div>

      <div className={styles.reservationBody}>
        <div className={styles.reservationTop}>
          <span
            className={`${styles.statusBadge} ${styles.reservationStatusBadge} ${
              styles[`statusBadge--${badgeStatus}`]
            }`}
          >
            {getReservationStatusIcon(badgeStatus)}
            {getReservationBadgeLabel(badgeStatus)}
          </span>
        </div>

        <div className={styles.reservationCopy}>
          <h2>{reservation.mealTitle}</h2>
          <p>Chez {reservation.hostName}</p>
        </div>

        <dl className={styles.reservationMetaList}>
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
              <Euro />
              Total
            </dt>
            <dd>{formatReservationPrice(reservation.totalPrice)}</dd>
          </div>
        </dl>

        <div className={styles.reservationFooter}>
          <span>{reservation.seats} place(s)</span>
          <Link
            href={`/reservations/${reservation.id}`}
            className={`${styles.secondaryButton} ${styles.reservationDetailButton}`}
          >
            Voir le détail
          </Link>
        </div>
      </div>
    </article>
  );
}

type EmptyStateCardProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

function EmptyStateCard({
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateCardProps) {
  return (
    <div className={`${styles.emptyState} ${styles.emptyStateCompact}`}>
      <div className={styles.emptyPlate}>
        <Image
          src="/ramenetapoire.svg"
          alt="RameneTaPoire"
          width={88}
          height={88}
          className={styles.emptyPlateLogo}
        />
      </div>

      <div className={styles.emptyCopy}>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      {actionLabel && actionHref ? (
        <Link href={actionHref} className={styles.primaryButton}>
          <CirclePlus />
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={styles.pagination}>
      <button
        type="button"
        className={styles.paginationButton}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Précédent
      </button>

      <div className={styles.paginationPages}>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
          <button
            key={page}
            type="button"
            className={`${styles.paginationPage} ${
              page === currentPage ? styles["paginationPage--active"] : ""
            }`}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        type="button"
        className={styles.paginationButton}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Suivant
      </button>
    </div>
  );
}

export default function MesRepasPage() {
  const router = useRouter();
  const { isLoggedIn, loading, user } = useAuth();
  const [hostedMeals, setHostedMeals] = useState<MealItem[]>([]);
  const [fetchingHostedMeals, setFetchingHostedMeals] = useState(true);
  const [hostingError, setHostingError] = useState<string | null>(null);
  const [hostBookingSummaries, setHostBookingSummaries] = useState<
    HostMealBookingSummary[]
  >([]);
  const [fetchingHostBookingSummaries, setFetchingHostBookingSummaries] =
    useState(false);
  const [activeMealId, setActiveMealId] = useState<number | null>(null);
  const [activePanel, setActivePanel] = useState<PanelMode>("attending");
  const [attendingReservations, setAttendingReservations] = useState<ReservationItem[]>([]);
  const [fetchingAttendingReservations, setFetchingAttendingReservations] = useState(true);
  const [attendingError, setAttendingError] = useState<string | null>(null);
  const [hostingFilter, setHostingFilter] = useState<HostingFilter>("upcoming");
  const [attendingFilter, setAttendingFilter] = useState<AttendingFilter>("all");
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [hostingPage, setHostingPage] = useState(1);
  const [attendingPage, setAttendingPage] = useState(1);

  const isHostUser = user?.role?.toUpperCase() === "HOST";

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/connexion");
    }
  }, [isLoggedIn, loading, router]);

  useEffect(() => {
    if (!isHostUser && activePanel === "hosting") {
      setActivePanel("attending");
    }
  }, [activePanel, isHostUser]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateItemsPerPage = () => {
      setItemsPerPage(window.innerWidth >= 1100 ? 6 : 4);
    };

    updateItemsPerPage();
    window.addEventListener("resize", updateItemsPerPage);

    return () => {
      window.removeEventListener("resize", updateItemsPerPage);
    };
  }, []);

  useEffect(() => {
    setHostingPage(1);
  }, [activePanel, hostingFilter, itemsPerPage]);

  useEffect(() => {
    setAttendingPage(1);
  }, [activePanel, attendingFilter, itemsPerPage]);

  useEffect(() => {
    if (loading || !isLoggedIn) {
      return;
    }

    if (!isHostUser) {
      setHostedMeals([]);
      setFetchingHostedMeals(false);
      setHostingError(null);
      return;
    }

    const token = localStorage.getItem("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!token || !apiUrl) {
      setFetchingHostedMeals(false);
      setHostingError("Impossible de charger tes repas organisés pour le moment.");
      return;
    }

    let cancelled = false;

    const loadHostedMeals = async () => {
      try {
        setFetchingHostedMeals(true);
        setHostingError(null);

        const response = await axios.get<MealItem[]>(`${apiUrl}/meals/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!cancelled) {
          setHostedMeals(response.data);
        }
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        const fallbackMessage =
          "Ton espace hôte sera disponible dès que ton profil hôte sera approuvé et actif.";

        const message = axios.isAxiosError(error)
          ? error.response?.data?.message ?? fallbackMessage
          : fallbackMessage;

        setHostingError(Array.isArray(message) ? message.join(", ") : message);
        setHostedMeals([]);
      } finally {
        if (!cancelled) {
          setFetchingHostedMeals(false);
        }
      }
    };

    void loadHostedMeals();

    return () => {
      cancelled = true;
    };
  }, [isHostUser, isLoggedIn, loading]);

  useEffect(() => {
    if (loading || !isLoggedIn || !isHostUser) {
      return;
    }

    let cancelled = false;

    const loadHostBookingSummaries = async () => {
      try {
        setFetchingHostBookingSummaries(true);
        const summaries = await listHostMealBookingSummaries();

        if (!cancelled) {
          setHostBookingSummaries(summaries);
        }
      } catch {
        if (!cancelled) {
          setHostBookingSummaries([]);
        }
      } finally {
        if (!cancelled) {
          setFetchingHostBookingSummaries(false);
        }
      }
    };

    void loadHostBookingSummaries();

    return () => {
      cancelled = true;
    };
  }, [isHostUser, isLoggedIn, loading]);

  const hostedStats = useMemo(() => {
    const draftCount = hostedMeals.filter((meal) => meal.status === "draft").length;
    const publishedCount = hostedMeals.filter(
      (meal) => meal.status === "published",
    ).length;
    const upcomingCount = hostedMeals.filter((meal) => isUpcomingMeal(meal)).length;

    return {
      total: hostedMeals.length,
      draftCount,
      publishedCount,
      upcomingCount,
    };
  }, [hostedMeals]);

  const loadAttendingReservations = useCallback(async () => {
    try {
      setFetchingAttendingReservations(true);
      setAttendingError(null);

      const nextReservations = await listGuestReservations();
      setAttendingReservations(nextReservations);
    } catch (error) {
      setAttendingReservations([]);
      setAttendingError(
        error instanceof Error
          ? error.message
          : "Impossible de charger tes réservations pour le moment.",
      );
    } finally {
      setFetchingAttendingReservations(false);
    }
  }, []);

  useEffect(() => {
    if (loading || !isLoggedIn) {
      return;
    }

    void loadAttendingReservations();
  }, [isLoggedIn, loadAttendingReservations, loading]);

  const attendingStats = useMemo(
    () => ({
      total: attendingReservations.length,
      confirmed: attendingReservations.filter((reservation) => reservation.status === "confirmed")
        .length,
      pending: attendingReservations.filter((reservation) => reservation.status === "pending")
        .length,
      refused: attendingReservations.filter((reservation) => reservation.status === "refused")
        .length,
    }),
    [attendingReservations],
  );

  const filteredAttendingReservations = useMemo(() => {
    if (attendingFilter === "all") {
      return attendingReservations;
    }

    if (attendingFilter === "past") {
      return attendingReservations.filter(
        (reservation) =>
          reservation.status === "confirmed" && isPastReservation(reservation),
      );
    }

    return attendingReservations.filter(
      (reservation) => reservation.status === attendingFilter,
    );
  }, [attendingFilter, attendingReservations]);

  const filteredHostedMeals = useMemo(() => {
    if (hostingFilter === "draft") {
      return [...hostedMeals]
        .filter((meal) => meal.status === "draft")
        .sort(
          (firstMeal, secondMeal) =>
            new Date(secondMeal.updatedAt).getTime() -
            new Date(firstMeal.updatedAt).getTime(),
        );
    }

    if (hostingFilter === "published") {
      return sortMealsByDate(
        hostedMeals.filter((meal) => meal.status === "published"),
        "asc",
      );
    }

    if (hostingFilter === "cancelled") {
      return sortMealsByDate(
        hostedMeals.filter((meal) => meal.status === "cancelled"),
        "desc",
      );
    }

    if (hostingFilter === "past") {
      return sortMealsByDate(
        hostedMeals.filter(
          (meal) =>
            meal.status !== "draft" &&
            meal.status !== "cancelled" &&
            isPastMeal(meal),
        ),
        "desc",
      );
    }

    return sortMealsByDate(
      hostedMeals.filter(
        (meal) =>
          meal.status !== "draft" &&
          meal.status !== "cancelled" &&
          isUpcomingMeal(meal),
      ),
      "asc",
    );
  }, [hostedMeals, hostingFilter]);

  const paginatedHostedMeals = useMemo(
    () => paginateMeals(filteredHostedMeals, hostingPage, itemsPerPage),
    [filteredHostedMeals, hostingPage, itemsPerPage],
  );

  const hostBookingSummariesByMealId = useMemo(
    () =>
      new Map(
        hostBookingSummaries.map((summary) => [summary.mealId, summary]),
      ),
    [hostBookingSummaries],
  );

  const paginatedAttendingReservations = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(filteredAttendingReservations.length / itemsPerPage));
    const safePage = Math.min(attendingPage, totalPages);
    const startIndex = (safePage - 1) * itemsPerPage;

    return {
      totalPages,
      currentPage: safePage,
      items: filteredAttendingReservations.slice(startIndex, startIndex + itemsPerPage),
    };
  }, [attendingPage, filteredAttendingReservations, itemsPerPage]);

  const updateMealInState = (nextMeal: MealItem) => {
    setHostedMeals((previousMeals) =>
      previousMeals.map((meal) => (meal.id === nextMeal.id ? nextMeal : meal)),
    );
  };

  const handleStatusAction = async (
    mealId: number,
    action: "publish" | "cancel",
  ) => {
    const token = localStorage.getItem("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!token || !apiUrl) {
      toast.error("Session invalide. Reconnecte-toi.");
      router.push("/connexion");
      return;
    }

    try {
      setActiveMealId(mealId);

      const response = await axios.patch<MealItem>(
        `${apiUrl}/meals/me/${mealId}/${action}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      updateMealInState(response.data);
      toast.success(
        action === "publish"
          ? "Le repas est maintenant publié."
          : "Le repas a bien été annulé.",
      );
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ?? "L'action n'a pas pu être effectuée."
        : "L'action n'a pas pu être effectuée.";
      toast.error(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setActiveMealId(null);
    }
  };

  if (loading) {
    return (
      <section className={styles.page}>
        <div className={styles.loadingState}>Chargement de ton espace repas...</div>
      </section>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroHeader}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>
              {activePanel === "hosting" ? "Espace hôte" : "Espace invité"}
            </p>
            <h1>
              {activePanel === "hosting"
                ? "Gère les repas que tu organises et pilote leur publication."
                : "Consulte facilement toutes tes réservations au même endroit."}
            </h1>
            <p className={styles.description}>
              {activePanel === "hosting"
                ? "Retrouve tes repas à venir, passés et annulés dans un même espace."
                : "Retrouve tes réservations confirmées, en attente, refusées et passées dans un seul espace."}
            </p>
          </div>

          {isHostUser ? (
            <div className={styles.panelSwitch}>
              <button
                type="button"
                className={`${styles.panelSwitchButton} ${
                  activePanel === "attending"
                    ? styles["panelSwitchButton--active"]
                    : ""
                }`}
                onClick={() => setActivePanel("attending")}
              >
                Je participe
              </button>
              <button
                type="button"
                className={`${styles.panelSwitchButton} ${
                  activePanel === "hosting"
                    ? styles["panelSwitchButton--active"]
                    : ""
                }`}
                onClick={() => setActivePanel("hosting")}
              >
                J&apos;organise
              </button>
            </div>
          ) : null}
        </div>

        <div className={styles.heroActions}>
          {activePanel === "hosting" ? (
            <>
              <Link href="/mes-evenements/creer" className={styles.primaryButton}>
                <CirclePlus />
                Créer un repas
              </Link>
              <Link href="/" className={styles.secondaryButton}>
                Voir les repas publics
              </Link>
            </>
          ) : (
            <Link href="/" className={`${styles.primaryButton} ${styles.discoverButton}`}>
              <Rocket />
              Découvrir les repas
            </Link>
          )}
        </div>
      </div>

      {activePanel === "hosting" ? (
        <>
          <div className={styles.statsGrid}>
            <article className={styles.statCard}>
              <span className={styles.statIcon}>
                <FileText />
              </span>
              <strong>{hostedStats.total}</strong>
              <span>repas créés</span>
            </article>

            <article className={styles.statCard}>
              <span className={styles.statIcon}>
                <Rocket />
              </span>
              <strong>{hostedStats.publishedCount}</strong>
              <span>publiés</span>
            </article>

            <article className={styles.statCard}>
              <span className={styles.statIcon}>
                <Clock3 />
              </span>
              <strong>{hostedStats.draftCount}</strong>
              <span>brouillons</span>
            </article>

            <article className={styles.statCard}>
              <span className={styles.statIcon}>
                <CalendarDays />
              </span>
              <strong>{hostedStats.upcomingCount}</strong>
              <span>à venir</span>
            </article>
          </div>

          {hostingError ? (
            <div className={styles.hostGuardCard}>
              <div className={styles.hostGuardIcon}>
                <CircleAlert />
              </div>
              <div className={styles.hostGuardContent}>
                <h2>Ton panneau hôte n&apos;est pas encore disponible</h2>
                <p>{hostingError}</p>
              </div>
              <div className={styles.hostGuardActions}>
                <Link href="/profil" className={styles.secondaryButton}>
                  Voir mon profil
                </Link>
                <Link href="/mes-evenements/creer" className={styles.primaryButton}>
                  Ouvrir la création
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.filtersBar}>
                {HOSTING_FILTER_OPTIONS.map((filterOption) => (
                  <button
                    key={filterOption.key}
                    type="button"
                    className={`${styles.filterButton} ${
                      hostingFilter === filterOption.key
                        ? styles["filterButton--active"]
                        : ""
                    }`}
                    onClick={() => setHostingFilter(filterOption.key)}
                  >
                    {filterOption.label}
                  </button>
                ))}
              </div>

              {fetchingHostedMeals ? (
                <div className={styles.loadingPanel}>
                  Chargement de tes repas organisés...
                </div>
              ) : filteredHostedMeals.length === 0 ? (
                <EmptyStateCard
                  title="Aucun repas dans cette vue"
                  description="Change de filtre ou crée un nouveau repas pour commencer à remplir ton espace hôte."
                  actionLabel="Organiser un repas"
                  actionHref="/mes-evenements/creer"
                />
              ) : (
                <>
                  <div className={styles.mealsGrid}>
                    {paginatedHostedMeals.items.map((meal) => {
                      const canPublish = meal.status === "draft";
                      const canCancel = meal.status === "published";
                      const canEdit =
                        meal.status === "draft" || meal.status === "cancelled";
                      const isBusy = activeMealId === meal.id;

                      return (
                        <MealCard
                          key={meal.id}
                          meal={meal}
                          bookingSummary={hostBookingSummariesByMealId.get(meal.id) ?? null}
                          footer={
                            <>
                              {meal.status === "published" || meal.status === "done" ? (
                                <Link
                                  href={`/mes-evenements/${meal.id}/demandes`}
                                  className={styles.secondaryButton}
                                >
                                  Voir les demandes
                                </Link>
                              ) : null}

                              {canEdit ? (
                                <Link
                                  href={`/mes-evenements/creer?mealId=${meal.id}&step=4`}
                                  className={styles.secondaryButton}
                                >
                                  Modifier
                                </Link>
                              ) : null}

                              {canPublish ? (
                                <button
                                  type="button"
                                  className={styles.primaryButton}
                                  onClick={() =>
                                    void handleStatusAction(meal.id, "publish")
                                  }
                                  disabled={isBusy}
                                >
                                  {isBusy ? "Publication..." : "Publier"}
                                </button>
                              ) : null}

                              {canCancel ? (
                                <button
                                  type="button"
                                  className={styles.warningButton}
                                  onClick={() =>
                                    void handleStatusAction(meal.id, "cancel")
                                  }
                                  disabled={isBusy}
                                >
                                  {isBusy ? "Annulation..." : "Annuler"}
                                </button>
                              ) : null}
                            </>
                          }
                        />
                      );
                    })}
                  </div>

                  <Pagination
                    currentPage={paginatedHostedMeals.currentPage}
                    totalPages={paginatedHostedMeals.totalPages}
                    onPageChange={setHostingPage}
                  />
                </>
              )}

              {fetchingHostBookingSummaries ? (
                <div className={styles.loadingPanel}>
                  Mise à jour des demandes en cours...
                </div>
              ) : null}
            </>
          )}
        </>
      ) : (
        <>
          <div className={styles.statsGrid}>
            <article className={styles.statCard}>
              <span className={styles.statIcon}>
                <Ticket />
              </span>
              <strong>{attendingStats.total}</strong>
              <span>réservations</span>
            </article>

            <article className={styles.statCard}>
              <span className={styles.statIcon}>
                <ShieldCheck />
              </span>
              <strong>{attendingStats.confirmed}</strong>
              <span>confirmées</span>
            </article>

            <article className={styles.statCard}>
              <span className={styles.statIcon}>
                <Clock3 />
              </span>
              <strong>{attendingStats.pending}</strong>
              <span>en attente de confirmation</span>
            </article>

            <article className={styles.statCard}>
              <span className={styles.statIcon}>
                <CircleAlert />
              </span>
              <strong>{attendingStats.refused}</strong>
              <span>refusées</span>
            </article>
          </div>

          <div className={styles.filtersBar}>
            {ATTENDING_FILTER_OPTIONS.map((filterOption) => (
              <button
                key={filterOption.key}
                type="button"
                className={`${styles.filterButton} ${
                  attendingFilter === filterOption.key
                    ? styles["filterButton--active"]
                    : ""
                }`}
                onClick={() => setAttendingFilter(filterOption.key)}
              >
                {filterOption.label}
              </button>
            ))}
          </div>

          {fetchingAttendingReservations ? (
            <div className={styles.loadingPanel}>
              Chargement de tes réservations...
            </div>
          ) : attendingError ? (
            <div className={styles.hostGuardCard}>
              <div className={styles.hostGuardIcon}>
                <CircleAlert />
              </div>
              <div className={styles.hostGuardContent}>
                <h2>Impossible de charger tes réservations</h2>
                <p>{attendingError}</p>
              </div>
              <div className={styles.hostGuardActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => void loadAttendingReservations()}
                >
                  Réessayer
                </button>
                <Link href="/" className={styles.primaryButton}>
                  Explorer les repas
                </Link>
              </div>
            </div>
          ) : filteredAttendingReservations.length === 0 ? (
            <EmptyStateCard
              title="Aucune réservation dans cette vue"
              description="Explore les repas publics pour réserver une nouvelle place."
              actionLabel="Explorer les repas"
              actionHref="/"
            />
          ) : (
            <>
              <div className={styles.reservationsGrid}>
                {paginatedAttendingReservations.items.map((reservation) => (
                  <ReservationCard key={reservation.id} reservation={reservation} />
                ))}
              </div>

              <Pagination
                currentPage={paginatedAttendingReservations.currentPage}
                totalPages={paginatedAttendingReservations.totalPages}
                onPageChange={setAttendingPage}
              />
            </>
          )}
        </>
      )}
    </section>
  );
}
