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
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../providers/AuthProvider";
import styles from "./mes-repas.module.scss";

type MealStatus = "draft" | "published" | "cancelled" | "done";
type MealsFilter = "upcoming" | "past" | "cancelled";

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

const FILTER_OPTIONS: Array<{ key: MealsFilter; label: string }> = [
  { key: "upcoming", label: "Prochains repas" },
  { key: "past", label: "Repas passes" },
  { key: "cancelled", label: "Repas annules" },
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

export default function MesRepasPage() {
  const router = useRouter();
  const { isLoggedIn, loading } = useAuth();
  const [meals, setMeals] = useState<MealItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [activeMealId, setActiveMealId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<MealsFilter>("upcoming");

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/connexion");
    }
  }, [isLoggedIn, loading, router]);

  useEffect(() => {
    if (loading || !isLoggedIn) {
      return;
    }

    const token = localStorage.getItem("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!token || !apiUrl) {
      setFetching(false);
      setScreenError("Impossible de charger tes repas pour le moment.");
      return;
    }

    let cancelled = false;

    const loadMeals = async () => {
      try {
        setFetching(true);
        setScreenError(null);

        const response = await axios.get<MealItem[]>(`${apiUrl}/meals/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!cancelled) {
          setMeals(response.data);
        }
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        const fallbackMessage =
          "Ton espace repas sera disponible des que ton profil hote sera approuve et actif.";

        const message = axios.isAxiosError(error)
          ? error.response?.data?.message ?? fallbackMessage
          : fallbackMessage;

        setScreenError(Array.isArray(message) ? message.join(", ") : message);
        setMeals([]);
      } finally {
        if (!cancelled) {
          setFetching(false);
        }
      }
    };

    void loadMeals();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, loading]);

  const stats = useMemo(() => {
    const draftCount = meals.filter((meal) => meal.status === "draft").length;
    const publishedCount = meals.filter((meal) => meal.status === "published").length;
    const upcomingCount = meals.filter((meal) => isUpcomingMeal(meal)).length;

    return {
      total: meals.length,
      draftCount,
      publishedCount,
      upcomingCount,
    };
  }, [meals]);

  const filteredMeals = useMemo(() => {
    const nextMeals = meals.filter((meal) => {
      if (activeFilter === "cancelled") {
        return meal.status === "cancelled";
      }

      if (activeFilter === "past") {
        return isPastMeal(meal);
      }

      return isUpcomingMeal(meal);
    });

    return nextMeals.sort((firstMeal, secondMeal) => {
      const firstTimestamp = new Date(firstMeal.dateTime).getTime();
      const secondTimestamp = new Date(secondMeal.dateTime).getTime();

      if (activeFilter === "past" || activeFilter === "cancelled") {
        return secondTimestamp - firstTimestamp;
      }

      return firstTimestamp - secondTimestamp;
    });
  }, [activeFilter, meals]);

  const updateMealInState = (nextMeal: MealItem) => {
    setMeals((previousMeals) =>
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
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Espace hote</p>
          <h1>Gere tes repas et prepare tes prochaines tablees.</h1>
          <p className={styles.description}>
            Retrouve tes brouillons, publie un repas quand tout est pret et suis
            ton activite depuis un espace pense pour l&apos;organisation.
          </p>
        </div>

        <div className={styles.heroActions}>
          <Link href="/mes-repas/creer" className={styles.primaryButton}>
            <CirclePlus />
            Creer un repas
          </Link>
          <Link href="/" className={styles.secondaryButton}>
            Voir les repas publics
          </Link>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <FileText />
          </span>
          <strong>{stats.total}</strong>
          <span>repas crees</span>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <Rocket />
          </span>
          <strong>{stats.publishedCount}</strong>
          <span>publies</span>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <Clock3 />
          </span>
          <strong>{stats.draftCount}</strong>
          <span>brouillons</span>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <CalendarDays />
          </span>
          <strong>{stats.upcomingCount}</strong>
          <span>a venir</span>
        </article>
      </div>

      {screenError ? (
        <div className={styles.hostGuardCard}>
          <div className={styles.hostGuardIcon}>
            <CircleAlert />
          </div>
          <div className={styles.hostGuardContent}>
            <h2>Ton espace hote n&apos;est pas encore completement disponible</h2>
            <p>{screenError}</p>
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
      ) : null}

      {!screenError ? (
        <div className={styles.filtersBar}>
          {FILTER_OPTIONS.map((filterOption) => (
            <button
              key={filterOption.key}
              type="button"
              className={`${styles.filterButton} ${
                activeFilter === filterOption.key ? styles["filterButton--active"] : ""
              }`}
              onClick={() => setActiveFilter(filterOption.key)}
            >
              {filterOption.label}
            </button>
          ))}
        </div>
      ) : null}

      {fetching ? (
        <div className={styles.loadingPanel}>Chargement de tes repas...</div>
      ) : filteredMeals.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyPlate}>
            <span className={styles.emptyPlateRing} />
            <span className={styles.emptyPlateDot} />
          </div>

          <div className={styles.emptyCopy}>
            <h2>
              {activeFilter === "upcoming"
                ? "Aucun prochain repas pour l&apos;instant"
                : activeFilter === "past"
                  ? "Aucun repas passe a afficher"
                  : "Aucun repas annule a afficher"}
            </h2>
            <p>
              {activeFilter === "upcoming"
                ? "Cree un brouillon, finalise-le puis publie-le quand tout est pret."
                : "Change de filtre ou retourne dans l'espace hote pour continuer l'organisation."}
            </p>
          </div>

          <Link href="/mes-repas/creer" className={styles.primaryButton}>
            <CirclePlus />
            Organiser un repas
          </Link>
        </div>
      ) : (
        <div className={styles.mealsGrid}>
          {filteredMeals.map((meal) => {
            const statusLabel = getStatusLabel(meal.status);
            const canPublish = meal.status === "draft";
            const canCancel = meal.status === "published";
            const canEdit = meal.status === "draft" || meal.status === "cancelled";
            const isBusy = activeMealId === meal.id;

            return (
              <article key={meal.id} className={styles.mealCard}>
                <div className={styles.mealCardTop}>
                  <span
                    className={`${styles.statusBadge} ${
                      styles[`statusBadge--${meal.status}`]
                    }`}
                  >
                    {statusLabel}
                  </span>

                  <span className={styles.mealTypeChip}>
                    {meal.mealType || "Repas"}
                  </span>
                </div>

                <div className={styles.mealCardBody}>
                  <h2>{meal.title || "Repas sans titre"}</h2>
                  <p>{meal.menuDescription || "Ajoute une description pour donner envie."}</p>
                </div>

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

                <div className={styles.mealActions}>
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
                      onClick={() => void handleStatusAction(meal.id, "publish")}
                      disabled={isBusy}
                    >
                      {isBusy ? "Publication..." : "Publier"}
                    </button>
                  ) : null}

                  {canCancel ? (
                    <button
                      type="button"
                      className={styles.warningButton}
                      onClick={() => void handleStatusAction(meal.id, "cancel")}
                      disabled={isBusy}
                    >
                      {isBusy ? "Annulation..." : "Annuler"}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
