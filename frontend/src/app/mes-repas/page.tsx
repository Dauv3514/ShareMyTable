"use client";

import axios from "axios";
import {
  CalendarDays,
  CircleAlert,
  CirclePlus,
  Clock3,
  Euro,
  FileText,
  Rocket,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../providers/AuthProvider";
import styles from "./mes-repas.module.scss";

type MealStatus = "draft" | "published" | "cancelled" | "done";
type PanelMode = "attending" | "hosting";
type HostingFilter = "upcoming" | "past" | "cancelled" | "draft" | "published";

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
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [hostingPage, setHostingPage] = useState(1);
  const [upcomingAttendingPage, setUpcomingAttendingPage] = useState(1);
  const [pastAttendingPage, setPastAttendingPage] = useState(1);

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
    setUpcomingAttendingPage(1);
    setPastAttendingPage(1);
  }, [activePanel, itemsPerPage]);

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

  const attendingMeals = useMemo(() => [] as MealItem[], []);

  const upcomingAttendingMeals = useMemo(
    () => sortMealsByDate(attendingMeals.filter((meal) => isUpcomingMeal(meal)), "asc"),
    [attendingMeals],
  );

  const pastAttendingMeals = useMemo(
    () => sortMealsByDate(attendingMeals.filter((meal) => isPastMeal(meal)), "desc"),
    [attendingMeals],
  );

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

  const paginatedUpcomingAttendingMeals = useMemo(
    () => paginateMeals(upcomingAttendingMeals, upcomingAttendingPage, itemsPerPage),
    [itemsPerPage, upcomingAttendingMeals, upcomingAttendingPage],
  );

  const paginatedPastAttendingMeals = useMemo(
    () => paginateMeals(pastAttendingMeals, pastAttendingPage, itemsPerPage),
    [itemsPerPage, pastAttendingMeals, pastAttendingPage],
  );

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
              {activePanel === "hosting" ? "Espace hote" : "Mes repas"}
            </p>
            <h1>
              {activePanel === "hosting"
                ? "Gere les repas que tu organises et pilote leur publication."
                : "Retrouve les repas que tu vas vivre, puis ceux auxquels tu as deja participe."}
            </h1>
            <p className={styles.description}>
              {activePanel === "hosting"
                ? "Retrouve tes repas a venir, passes, annules, brouillons et publies dans un seul espace."
                : "En tant qu'invite, tu retrouves ici ton parcours repas. Si tu es aussi hote, tu peux basculer a tout moment sur le panneau de gestion de tes creations."}
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
        <div className={styles.sectionStack}>
          <div className={styles.infoBanner}>
            <CircleAlert />
            <p>
              Cette vue est ouverte a tous les comptes connectes. Elle accueillera
              aussi le suivi complet des participations des que le module de
              reservation sera branche au backend.
            </p>
          </div>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHead}>
              <div>
                <p className={styles.sectionKicker}>En tant qu&apos;invite</p>
                <h2>Mes prochains repas</h2>
              </div>
              <span className={styles.sectionCount}>{upcomingAttendingMeals.length}</span>
            </div>

            {upcomingAttendingMeals.length === 0 ? (
              <EmptyStateCard
                title="Aucun repas a venir pour l'instant"
                description="Tes prochaines reservations apparaitront ici pour te rappeler ou tu vas manger et quand t'y rendre."
                actionLabel="Explorer les repas"
                actionHref="/"
              />
            ) : (
              <>
                <div className={styles.mealsGrid}>
                  {paginatedUpcomingAttendingMeals.items.map((meal) => (
                    <MealCard
                      key={meal.id}
                      meal={meal}
                      hostLabel={`Chez ${meal.host.pseudo || "ton hote"} - ${meal.host.city}, ${meal.host.country}`}
                    />
                  ))}
                </div>

                <Pagination
                  currentPage={paginatedUpcomingAttendingMeals.currentPage}
                  totalPages={paginatedUpcomingAttendingMeals.totalPages}
                  onPageChange={setUpcomingAttendingPage}
                />
              </>
            )}
          </section>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHead}>
              <div>
                <p className={styles.sectionKicker}>Souvenirs de table</p>
                <h2>Repas deja participes</h2>
              </div>
              <span className={styles.sectionCount}>{pastAttendingMeals.length}</span>
            </div>

            {pastAttendingMeals.length === 0 ? (
              <EmptyStateCard
                title="Aucun repas participe pour le moment"
                description="Une fois tes premieres experiences passees, tu retrouveras ici ton historique de repas partages."
              />
            ) : (
              <>
                <div className={styles.mealsGrid}>
                  {paginatedPastAttendingMeals.items.map((meal) => (
                    <MealCard
                      key={meal.id}
                      meal={meal}
                      hostLabel={`Chez ${meal.host.pseudo || "ton hote"} - ${meal.host.city}, ${meal.host.country}`}
                    />
                  ))}
                </div>

                <Pagination
                  currentPage={paginatedPastAttendingMeals.currentPage}
                  totalPages={paginatedPastAttendingMeals.totalPages}
                  onPageChange={setPastAttendingPage}
                />
              </>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
