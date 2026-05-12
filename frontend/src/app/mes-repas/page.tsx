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
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  getReservationBadgeLabel,
  getReservationBadgeStatus,
  isPastReservation,
  listGuestReservations,
  type ReservationItem,
  type ReservationStatus,
} from "@/lib/reservations";
import { useAuth } from "../providers/AuthProvider";
import styles from "./mes-repas.module.scss";

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
  status: MealStatus;
  createdAt: string;
  updatedAt: string;
  host: MealHostSummary;
};

const HOSTING_FILTER_OPTIONS: Array<{ key: HostingFilter; label: string }> = [
  { key: "upcoming", label: "A venir" },
  { key: "past", label: "Passes" },
  { key: "cancelled", label: "Annules" },
  { key: "draft", label: "Brouillons" },
  { key: "published", label: "Publies" },
];

const ATTENDING_FILTER_OPTIONS: Array<{ key: AttendingFilter; label: string }> = [
  { key: "all", label: "Toutes" },
  { key: "confirmed", label: "Confirmées" },
  { key: "pending", label: "En attente de confirmation" },
  { key: "refused", label: "Refusées" },
  { key: "past", label: "Passées" },
];

function getStatusLabel(status: MealStatus) {
  if (status === "published") return "Publie";
  if (status === "cancelled") return "Annule";
  if (status === "done") return "Termine";
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

type MealCardProps = {
  meal: MealItem;
  footer?: React.ReactNode;
  hostLabel?: string;
};

function MealCard({ meal, footer, hostLabel }: MealCardProps) {
  return (
    <article className={styles.mealCard}>
      <div className={styles.mealCardTop}>
        <span
          className={`${styles.statusBadge} ${
            styles[`statusBadge--${meal.status}`]
          }`}
        >
          {getStatusLabel(meal.status)}
        </span>

        <span className={styles.mealTypeChip}>{meal.mealType || "Repas"}</span>
      </div>

      <div className={styles.mealCardBody}>
        <h2>{meal.title || "Repas sans titre"}</h2>
        <p>{meal.menuDescription || "Ajoute une description pour donner envie."}</p>
      </div>

      {hostLabel ? <p className={styles.hostHint}>{hostLabel}</p> : null}

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

      {meal.houseRules ? (
        <div className={styles.rulesBlock}>
          <span>Regles de la maison</span>
          <p>{meal.houseRules}</p>
        </div>
      ) : null}

      {footer ? <div className={styles.mealActions}>{footer}</div> : null}
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
          <Link href={`/reservations/${reservation.id}`} className={styles.secondaryButton}>
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
        Precedent
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
  const [activeMealId, setActiveMealId] = useState<number | null>(null);
  const [activePanel, setActivePanel] = useState<PanelMode>("attending");
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
      setHostingError("Impossible de charger tes repas organises pour le moment.");
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
          "Ton espace hote sera disponible des que ton profil hote sera approuve et actif.";

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

  const attendingReservations = useMemo(() => listGuestReservations(), []);

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
          ? "Le repas est maintenant publie."
          : "Le repas a bien ete annule.",
      );
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ?? "L'action n'a pas pu etre effectuee."
        : "L'action n'a pas pu etre effectuee.";
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
                ? "Retrouve tes repas à venir, passés, annulés, brouillons et publiés dans un seul espace."
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
              <Link href="/mes-repas/creer" className={styles.primaryButton}>
                <CirclePlus />
                Creer un repas
              </Link>
              <Link href="/" className={styles.secondaryButton}>
                Voir les repas publics
              </Link>
            </>
          ) : (
            <Link href="/" className={styles.primaryButton}>
              <Rocket />
              Decouvrir les repas
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
              <span>repas crees</span>
            </article>

            <article className={styles.statCard}>
              <span className={styles.statIcon}>
                <Rocket />
              </span>
              <strong>{hostedStats.publishedCount}</strong>
              <span>publies</span>
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
              <span>a venir</span>
            </article>
          </div>

          {hostingError ? (
            <div className={styles.hostGuardCard}>
              <div className={styles.hostGuardIcon}>
                <CircleAlert />
              </div>
              <div className={styles.hostGuardContent}>
                <h2>Ton panneau hote n&apos;est pas encore disponible</h2>
                <p>{hostingError}</p>
              </div>
              <div className={styles.hostGuardActions}>
                <Link href="/profil" className={styles.secondaryButton}>
                  Voir mon profil
                </Link>
                <Link href="/mes-repas/creer" className={styles.primaryButton}>
                  Ouvrir la creation
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
                  Chargement de tes repas organises...
                </div>
              ) : filteredHostedMeals.length === 0 ? (
                <EmptyStateCard
                  title="Aucun repas dans cette vue"
                  description="Change de filtre ou cree un nouveau repas pour commencer a remplir ton espace hote."
                  actionLabel="Organiser un repas"
                  actionHref="/mes-repas/creer"
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
                          footer={
                            <>
                              {canEdit ? (
                                <Link
                                  href={`/mes-repas/creer?mealId=${meal.id}&step=4`}
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

          {filteredAttendingReservations.length === 0 ? (
            <EmptyStateCard
              title="Aucune réservation dans cette vue"
              description="Explore les repas publics pour réserver une nouvelle place ou change de filtre pour retrouver une réservation existante."
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