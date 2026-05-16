"use client";

import axios from "axios";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CookingPot,
  MapPin,
  NotebookText,
  Users,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import DatePickerField from "@/components/DatePicker";
import TimePickerField from "@/components/TimePicker";
import { useAuth } from "../../providers/AuthProvider";
import styles from "./creer-repas.module.scss";

type WizardStep = 0 | 1 | 2 | 3 | 4;
type MealStatus = "draft" | "published" | "cancelled" | "done";

type HostProfileSummary = {
  address: string;
  city: string;
  districtLabel: string;
  country: string;
  validationStatus: "pending" | "approved" | "rejected";
  isActive: boolean;
};

type MealDetails = {
  id: number;
  title: string | null;
  mealType: string | null;
  menuDescription: string | null;
  dateTime: string;
  seatsTotal: number;
  pricePerSeatCents: number;
  houseRules: string | null;
  status: MealStatus;
};

type MealDraftForm = {
  seatsTotal: string;
  date: string;
  time: string;
  title: string;
  mealType: string;
  menuDescription: string;
  pricePerSeat: string;
  houseRules: string;
};

const STEP_LABELS = [
  "Bienvenue",
  "Convives",
  "Date et heure",
  "Lieu",
  "Details",
] as const;

const MEAL_TYPE_PRESETS = [
  "Brunch",
  "Dejeuner",
  "Diner",
  "Apero",
  "Gouter",
  "Petit-dejeuner",
] as const;

const HOUSE_RULE_PRESETS = [
  "Merci d'arriver à l'heure.",
  "Préviens-moi en cas d'allergie.",
  "Repas convivial, ambiance détendue.",
  "Apporte ta bonne humeur.",
] as const;

function formatSelectedDate(value: string) {
  if (!value) {
    return "Choisir une date";
  }

  return format(parseISO(value), "EEEE d MMMM yyyy", { locale: fr });
}

function combineDateAndTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

function parseSeatsTotal(value: string) {
  if (!value.trim()) {
    return 0;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    return 0;
  }

  return parsedValue;
}

function appendPreset(existingValue: string, preset: string) {
  const trimmedExistingValue = existingValue.trim();

  if (!trimmedExistingValue) {
    return preset;
  }

  if (trimmedExistingValue.includes(preset)) {
    return trimmedExistingValue;
  }

  return `${trimmedExistingValue} ${preset}`;
}

function formatStepQueryValue(value: string | null) {
  if (!value) {
    return 0;
  }

  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue)) {
    return 0;
  }

  return Math.min(4, Math.max(0, parsedValue));
}

function getMealQueryParams() {
  if (typeof window === "undefined") {
    return {
      mealId: null as number | null,
      step: 0 as WizardStep,
    };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const mealIdValue = searchParams.get("mealId");
  const parsedMealId = mealIdValue ? Number(mealIdValue) : Number.NaN;

  return {
    mealId: Number.isInteger(parsedMealId) && parsedMealId > 0 ? parsedMealId : null,
    step: formatStepQueryValue(searchParams.get("step")) as WizardStep,
  };
}

export default function CreerRepasPage() {
  const router = useRouter();
  const { isLoggedIn, loading } = useAuth();
  const [step, setStep] = useState<WizardStep>(0);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState<WizardStep>(0);
  const [editingMealId, setEditingMealId] = useState<number | null>(null);
  const [isEditingMeal, setIsEditingMeal] = useState(false);
  const [loadingMeal, setLoadingMeal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hostProfile, setHostProfile] = useState<HostProfileSummary | null>(null);
  const [hostProfileLoading, setHostProfileLoading] = useState(true);
  const [hostProfileError, setHostProfileError] = useState<string | null>(null);
  const [form, setForm] = useState<MealDraftForm>({
    seatsTotal: "1",
    date: "",
    time: "19:30",
    title: "",
    mealType: "Diner",
    menuDescription: "",
    pricePerSeat: "18",
    houseRules: "",
  });

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/connexion");
    }
  }, [isLoggedIn, loading, router]);

  useEffect(() => {
    const { mealId, step: initialStep } = getMealQueryParams();
    setEditingMealId(mealId);
    setIsEditingMeal(Boolean(mealId));
    setStep(mealId ? initialStep : 0);
    setMaxUnlockedStep(mealId ? 4 : 0);
  }, []);

  useEffect(() => {
    if (loading || !isLoggedIn) {
      return;
    }

    const token = localStorage.getItem("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!token || !apiUrl) {
      setHostProfileLoading(false);
      setHostProfileError("Impossible de récupérer ton profil hôte.");
      return;
    }

    let cancelled = false;

    const loadHostProfile = async () => {
      try {
        setHostProfileLoading(true);
        setHostProfileError(null);

        const response = await axios.get<HostProfileSummary>(
          `${apiUrl}/host-profiles/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!cancelled) {
          setHostProfile(response.data);
        }
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        const message = axios.isAxiosError(error)
          ? error.response?.data?.message ?? "Profil hôte introuvable."
          : "Profil hôte introuvable.";

        setHostProfileError(Array.isArray(message) ? message.join(", ") : message);
        setHostProfile(null);
      } finally {
        if (!cancelled) {
          setHostProfileLoading(false);
        }
      }
    };

    void loadHostProfile();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, loading]);

  useEffect(() => {
    if (loading || !isLoggedIn || !editingMealId) {
      return;
    }

    const token = localStorage.getItem("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!token || !apiUrl) {
      return;
    }

    let cancelled = false;

    const loadMeal = async () => {
      try {
        setLoadingMeal(true);

        const response = await axios.get<MealDetails>(
          `${apiUrl}/meals/me/${editingMealId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (cancelled) {
          return;
        }

        const meal = response.data;
        const dateObject = new Date(meal.dateTime);

        setForm({
          seatsTotal: String(meal.seatsTotal),
          date: meal.dateTime.split("T")[0] ?? "",
          time: format(dateObject, "HH:mm"),
          title: meal.title ?? "",
          mealType: meal.mealType ?? "Diner",
          menuDescription: meal.menuDescription ?? "",
          pricePerSeat: String(meal.pricePerSeatCents / 100),
          houseRules: meal.houseRules ?? "",
        });
      } catch (error: unknown) {
        const message = axios.isAxiosError(error)
          ? error.response?.data?.message ?? "Impossible de charger ce repas."
          : "Impossible de charger ce repas.";
        toast.error(Array.isArray(message) ? message.join(", ") : message);
        router.replace("/mes-repas");
      } finally {
        if (!cancelled) {
          setLoadingMeal(false);
        }
      }
    };

    void loadMeal();

    return () => {
      cancelled = true;
    };
  }, [editingMealId, isLoggedIn, loading, router]);

  const progressPercent = ((step + 1) / STEP_LABELS.length) * 100;
  const composedDateTime = useMemo(() => {
    if (!form.date || !form.time) {
      return null;
    }

    return combineDateAndTime(form.date, form.time);
  }, [form.date, form.time]);
  const seatsTotalValue = useMemo(
    () => parseSeatsTotal(form.seatsTotal),
    [form.seatsTotal],
  );

  const locationReady = Boolean(
    hostProfile?.address &&
      hostProfile.city &&
      hostProfile.country &&
      hostProfile.validationStatus === "approved" &&
      hostProfile.isActive,
  );

  const stepCanContinue = useMemo(() => {
    if (step === 0) return true;
    if (step === 1) return seatsTotalValue > 0;
    if (step === 2) {
      return Boolean(form.date && form.time);
    }
    if (step === 3) return locationReady;

    return (
      seatsTotalValue > 0 &&
      form.title.trim().length > 0 &&
      form.mealType.trim().length > 0 &&
      form.menuDescription.trim().length > 0 &&
      form.houseRules.trim().length > 0 &&
      Number(form.pricePerSeat.replace(",", ".")) >= 0 &&
      Boolean(composedDateTime)
    );
  }, [composedDateTime, form, locationReady, seatsTotalValue, step]);

  const selectedDateLabel = formatSelectedDate(form.date);

  const goToStep = (nextStep: WizardStep, options?: { force?: boolean }) => {
    if (!options?.force && !isEditingMeal && nextStep > maxUnlockedStep) {
      return;
    }

    setStep(nextStep);

    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (editingMealId) {
        searchParams.set("mealId", String(editingMealId));
      }
      searchParams.set("step", String(nextStep));
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}?${searchParams.toString()}`,
      );
    }
  };

  const handlePrevious = () => {
    goToStep(Math.max(0, step - 1) as WizardStep);
  };

  const handleNext = () => {
    if (!stepCanContinue || step === 4) {
      return;
    }

    const nextStep = Math.min(4, step + 1) as WizardStep;

    if (!isEditingMeal) {
      setMaxUnlockedStep((previousStep) =>
        (nextStep > previousStep ? nextStep : previousStep) as WizardStep,
      );
    }

    goToStep(nextStep, { force: true });
  };

  const handleSubmit = async () => {
    if (!stepCanContinue || !composedDateTime) {
      return;
    }

    const token = localStorage.getItem("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!token || !apiUrl) {
      toast.error("Session invalide. Reconnecte-toi.");
      router.push("/connexion");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        title: form.title.trim(),
        mealType: form.mealType.trim(),
        menuDescription: form.menuDescription.trim(),
        dateTime: composedDateTime.toISOString(),
        seatsTotal: seatsTotalValue,
        pricePerSeatCents: Math.round(
          Number(form.pricePerSeat.replace(",", ".")) * 100,
        ),
        houseRules: form.houseRules.trim(),
      };

      if (editingMealId) {
        await axios.patch(`${apiUrl}/meals/me/${editingMealId}`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        toast.success("Le repas a été mis à jour.");
      } else {
        await axios.post(`${apiUrl}/meals`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        toast.success("Ton repas a été créé en brouillon.");
      }

      router.push("/mes-repas");
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ?? "L'enregistrement du repas a échoué."
        : "L'enregistrement du repas a échoué.";
      toast.error(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || loadingMeal) {
    return (
      <section className={styles.page}>
        <div className={styles.loadingState}>
          {loadingMeal ? "Chargement du repas..." : "Préparation du créateur de repas..."}
        </div>
      </section>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <section className={styles.page}>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <p className={styles.sidebarKicker}>
              {isEditingMeal ? "Modification de repas" : "Création de repas"}
            </p>
            <h1>
              {isEditingMeal
                ? "Reprends ton repas et ajuste seulement ce qui compte."
                : "Organiser un repas devient plus simple, étape par étape."}
            </h1>
            <p className={styles.sidebarDescription}>
              Compose d&apos;abord l&apos;essentiel, puis ajoute les informations qui
              rassurent tes futurs invités. Le repas restera brouillon tant que tu
              ne le publies pas.
            </p>

            <div className={styles.progressTrack} aria-hidden="true">
              <span
                className={styles.progressFill}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className={styles.progressList}>
              {STEP_LABELS.map((label, index) => {
                const isCurrent = index === step;
                const isDone = index < step;
                const isLocked = !isEditingMeal && index > maxUnlockedStep;

                return (
                  <button
                    key={label}
                    type="button"
                    className={`${styles.progressItem} ${
                      isCurrent ? styles["progressItem--current"] : ""
                    } ${isDone ? styles["progressItem--done"] : ""}`}
                    onClick={() => goToStep(index as WizardStep)}
                    disabled={isLocked}
                  >
                    <span className={styles.progressIndex}>
                      {isDone ? <Check /> : index + 1}
                    </span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            <div className={styles.summaryCard}>
              <h2>Apercu</h2>

              <dl className={styles.summaryList}>
                <div>
                  <dt>
                    <Users />
                    Convives
                  </dt>
                  <dd>{seatsTotalValue > 0 ? seatsTotalValue : "À définir"}</dd>
                </div>
                <div>
                  <dt>
                    <CalendarDays />
                    Date
                  </dt>
                  <dd>{selectedDateLabel}</dd>
                </div>
                <div>
                  <dt>
                    <Clock3 />
                    Heure
                  </dt>
                  <dd>{form.time || "À définir"}</dd>
                </div>
                <div>
                  <dt>
                    <MapPin />
                    Adresse
                  </dt>
                  <dd>{hostProfile?.city || "Profil hôte requis"}</dd>
                </div>
              </dl>
            </div>
          </div>
        </aside>

        <div className={styles.stageCard}>
          <div className={styles.mobileProgress}>
            <div className={styles.mobileProgressBar}>
              <span style={{ width: `${progressPercent}%` }} />
            </div>
            <p>
              Etape {step + 1} sur {STEP_LABELS.length}
            </p>
            <div className={styles.mobileSteps}>
              {STEP_LABELS.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  className={`${styles.mobileStepButton} ${
                    step === index ? styles["mobileStepButton--active"] : ""
                  }`}
                  onClick={() => goToStep(index as WizardStep)}
                  disabled={!isEditingMeal && index > maxUnlockedStep}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>

          <div
            className={`${styles.stageBody} ${
              step === 0 ? styles.stageBodyIntro : ""
            }`}
          >
            {step === 0 ? (
              <div className={`${styles.centerStage} ${styles.introStage}`}>
                <h2 className={styles.introTitle}>
                  {isEditingMeal ? "Modifier ton repas" : "Organiser un repas"}
                </h2>
                <p className={styles.introDescription}>
                  {isEditingMeal
                    ? "Toutes les informations déjà saisies sont reprises pour que tu puisses ajuster ton repas sans recommencer."
                    : "Vous souhaitez cuisiner et accueillir des gens ? On construit d'abord l'essentiel, puis on affine les détails pour rassurer vos invités."}
                </p>
              </div>
            ) : null}

            {step === 1 ? (
              <div className={styles.centerStage}>
                <h2>Pour combien de personnes souhaitez-vous cuisiner ?</h2>

                <div className={styles.seatCounter}>
                  <button
                    type="button"
                    className={styles.counterButton}
                    onClick={() =>
                      setForm((previousForm) => {
                        const nextValue = Math.max(
                          1,
                          parseSeatsTotal(previousForm.seatsTotal) - 1,
                        );

                        return {
                          ...previousForm,
                          seatsTotal: String(nextValue),
                        };
                      })
                    }
                    aria-label="Retirer une place"
                  >
                    -
                  </button>

                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className={styles.counterInput}
                    value={form.seatsTotal}
                    onChange={(event) =>
                      setForm((previousForm) => {
                        const nextValue = event.target.value.replace(/\D+/g, "");

                        return {
                          ...previousForm,
                          seatsTotal: nextValue,
                        };
                      })
                    }
                    aria-label="Nombre de convives"
                  />

                  <button
                    type="button"
                    className={styles.counterButton}
                    onClick={() =>
                      setForm((previousForm) => ({
                        ...previousForm,
                        seatsTotal: String(parseSeatsTotal(previousForm.seatsTotal) + 1),
                      }))
                    }
                    aria-label="Ajouter une place"
                  >
                    +
                  </button>
                </div>

                <p className={styles.helperText}>
                  Utilise les boutons ou saisis directement le nombre de convives.
                </p>
              </div>
            ) : null}

            {step === 2 ? (
              <div className={styles.centerStage}>
                <h2>Quand souhaitez-vous organiser le repas ?</h2>

                <div className={styles.dateTimeGrid}>
                  <div className={styles.datePickerWrap}>
                    <DatePickerField
                      value={form.date}
                      onChange={(value) =>
                        setForm((previousForm) => ({
                          ...previousForm,
                          date: value,
                        }))
                      }
                      placeholder="Choisir une date"
                      variant="input"
                      ariaLabel="Choisir une date pour le repas"
                    />
                  </div>

                  <label className={styles.timeField}>
                    <span>Heure d&apos;arrivee</span>
                    <TimePickerField
                      value={form.time}
                      onChange={(value) =>
                        setForm((previousForm) => ({
                          ...previousForm,
                          time: value,
                        }))
                      }
                      placeholder="Choisir une horaire"
                      ariaLabel="Choisir une heure d'arrivee"
                    />
                  </label>
                </div>

                <div className={styles.selectionPreview}>
                  <CalendarDays />
                  <span>
                    {selectedDateLabel}
                    {form.time ? ` - ${form.time}` : ""}
                  </span>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className={styles.centerStage}>
                <h2>Où les invités doivent-ils se rendre ?</h2>

                {hostProfileLoading ? (
                  <p>Chargement de l&apos;adresse du profil hôte...</p>
                ) : hostProfileError ? (
                  <div className={styles.locationErrorCard}>
                    <p>{hostProfileError}</p>
                    <button
                      type="button"
                      className={styles.inlineActionButton}
                      onClick={() => router.push("/profil")}
                    >
                      Compléter mon profil
                    </button>
                  </div>
                ) : (
                  <div className={styles.locationCard}>
                    <label className={styles.field}>
                      <span>Numero et nom de voie</span>
                      <input type="text" value={hostProfile?.address || ""} readOnly />
                    </label>

                    <div className={styles.locationGrid}>
                      <label className={styles.field}>
                        <span>Quartier</span>
                        <input
                          type="text"
                          value={hostProfile?.districtLabel || ""}
                          readOnly
                        />
                      </label>

                      <label className={styles.field}>
                        <span>Ville</span>
                        <input type="text" value={hostProfile?.city || ""} readOnly />
                      </label>
                    </div>

                    <label className={styles.field}>
                      <span>Pays</span>
                      <input type="text" value={hostProfile?.country || ""} readOnly />
                    </label>

                    <button
                      type="button"
                      className={styles.inlineActionButton}
                      onClick={() => router.push("/profil")}
                    >
                      Mettre à jour mon profil hôte
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {step === 4 ? (
              <div className={styles.detailsStage}>
                <div className={styles.sectionTitle}>
                  <h2>Quelques informations supplémentaires</h2>
                  <p>
                    Afin d&apos;organiser correctement votre repas, nous avons besoin
                    de quelques détails.
                  </p>
                </div>

                <div className={styles.formSection}>
                  <div className={styles.formSectionHead}>
                    <NotebookText />
                    <div>
                      <h3>Informations generales</h3>
                      <p>Donne envie en quelques lignes claires et accueillantes.</p>
                    </div>
                  </div>

                  <div className={styles.formGrid}>
                    <label className={styles.field}>
                      <span>Titre du repas</span>
                      <input
                        type="text"
                        value={form.title}
                        onChange={(event) =>
                          setForm((previousForm) => ({
                            ...previousForm,
                            title: event.target.value,
                          }))
                        }
                        placeholder="Ex. Diner italien entre voisins"
                      />
                    </label>

                    <label className={styles.field}>
                      <span>Prix par place</span>
                      <div className={styles.priceField}>
                        <input
                          type="number"
                          min="0"
                          step="0.50"
                          value={form.pricePerSeat}
                          onChange={(event) =>
                            setForm((previousForm) => ({
                              ...previousForm,
                              pricePerSeat: event.target.value,
                            }))
                          }
                          placeholder="18"
                        />
                        <span>EUR</span>
                      </div>
                    </label>
                  </div>

                  <div className={styles.formSectionHead}>
                    <CookingPot />
                    <div>
                      <h3>Au menu</h3>
                      <p>Choisis le type de moment que tu proposes, puis décris le menu.</p>
                    </div>
                  </div>

                  <div className={styles.chipRow}>
                    {MEAL_TYPE_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={`${styles.filterChip} ${
                          form.mealType === preset ? styles["filterChip--selected"] : ""
                        }`}
                        onClick={() =>
                          setForm((previousForm) => ({
                            ...previousForm,
                            mealType: preset,
                          }))
                        }
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <label className={styles.field}>
                    <span>Type de repas</span>
                    <input
                      type="text"
                      value={form.mealType}
                      onChange={(event) =>
                        setForm((previousForm) => ({
                          ...previousForm,
                          mealType: event.target.value,
                        }))
                      }
                      placeholder="Dejeuner, diner, brunch..."
                    />
                  </label>

                  <label className={styles.field}>
                    <span>Description du menu</span>
                    <textarea
                      rows={5}
                      value={form.menuDescription}
                      onChange={(event) =>
                        setForm((previousForm) => ({
                          ...previousForm,
                          menuDescription: event.target.value,
                        }))
                      }
                      placeholder="Décris les plats, l'ambiance et ce que les invités peuvent attendre."
                    />
                  </label>
                </div>

                <div className={styles.formSection}>
                  <div className={styles.formSectionHead}>
                    <Users />
                    <div>
                      <h3>Pour bien accueillir tes hôtes</h3>
                      <p>
                        Quelques règles simples évitent les malentendus et rassurent
                        les invités dès la publication.
                      </p>
                    </div>
                  </div>

                  <div className={styles.chipRow}>
                    {HOUSE_RULE_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={styles.filterChip}
                        onClick={() =>
                          setForm((previousForm) => ({
                            ...previousForm,
                            houseRules: appendPreset(previousForm.houseRules, preset),
                          }))
                        }
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <label className={styles.field}>
                    <span>Regles de la maison</span>
                    <textarea
                      rows={4}
                      value={form.houseRules}
                      onChange={(event) =>
                        setForm((previousForm) => ({
                          ...previousForm,
                          houseRules: event.target.value,
                        }))
                      }
                      placeholder="Ex. Merci d'arriver a l'heure, prevenir en cas d'allergie, ambiance conviviale."
                    />
                  </label>
                </div>
              </div>
            ) : null}
          </div>

          <div className={styles.footerBar}>
            <button
              type="button"
              className={styles.footerGhostButton}
              onClick={step === 0 ? () => router.push("/mes-repas") : handlePrevious}
            >
              <ChevronLeft />
              {step === 0 ? "Retour en arrière" : "Étape précédente"}
            </button>

            {step < 4 ? (
              <button
                type="button"
                className={styles.footerPrimaryButton}
                onClick={handleNext}
                disabled={!stepCanContinue}
              >
                {step === 0 ? "C'est parti !" : "Suivant"}
                <ChevronRight />
              </button>
            ) : (
              <button
                type="button"
                className={styles.footerPrimaryButton}
                onClick={() => void handleSubmit()}
                disabled={!stepCanContinue || submitting}
              >
                {submitting
                  ? isEditingMeal
                    ? "Mise à jour..."
                    : "Création..."
                  : isEditingMeal
                    ? "Enregistrer"
                    : "Créer"}
                <Check />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
