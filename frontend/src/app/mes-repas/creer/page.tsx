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
  Sparkles,
  Users,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import DatePickerField from "@/components/DatePicker";
import { useAuth } from "../../providers/AuthProvider";
import styles from "./creer-repas.module.scss";

type WizardStep = 0 | 1 | 2 | 3 | 4 | 5;

type HostProfileSummary = {
  address: string;
  city: string;
  districtLabel: string;
  country: string;
  validationStatus: "pending" | "approved" | "rejected";
  isActive: boolean;
};

type MealDraftForm = {
  seatsTotal: number;
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
  "Date",
  "Heure",
  "Lieu",
  "Détails",
] as const;

const MEAL_TYPE_PRESETS = [
  "Brunch",
  "Déjeuner",
  "Dîner",
  "Apéro",
  "Goûter",
  "Petit-déjeuner",
] as const;

const HOUSE_RULE_PRESETS = [
  "Merci d'arriver à l'heure.",
  "Préviens-moi en cas d'allergie.",
  "Repas convivial, ambiance détendue.",
  "Apporte ta bonne humeur.",
] as const;

const TIME_OPTIONS = Array.from({ length: 24 }, (_, index) => {
  const totalMinutes = 11 * 60 + index * 30;
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
});

function formatSelectedDate(value: string) {
  if (!value) {
    return "Choisir une date";
  }

  return format(parseISO(value), "EEEE d MMMM yyyy", { locale: fr });
}

function combineDateAndTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
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

export default function CreerRepasPage() {
  const router = useRouter();
  const { isLoggedIn, loading } = useAuth();
  const [step, setStep] = useState<WizardStep>(0);
  const [submitting, setSubmitting] = useState(false);
  const [hostProfile, setHostProfile] = useState<HostProfileSummary | null>(null);
  const [hostProfileLoading, setHostProfileLoading] = useState(true);
  const [hostProfileError, setHostProfileError] = useState<string | null>(null);
  const [form, setForm] = useState<MealDraftForm>({
    seatsTotal: 1,
    date: "",
    time: "19:30",
    title: "",
    mealType: "Dîner",
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

  const progressPercent = ((step + 1) / STEP_LABELS.length) * 100;
  const composedDateTime = useMemo(() => {
    if (!form.date || !form.time) {
      return null;
    }

    return combineDateAndTime(form.date, form.time);
  }, [form.date, form.time]);

  const locationReady = Boolean(
    hostProfile?.address &&
      hostProfile.city &&
      hostProfile.country &&
      hostProfile.validationStatus === "approved" &&
      hostProfile.isActive,
  );

  const stepCanContinue = useMemo(() => {
    if (step === 0) return true;
    if (step === 1) return form.seatsTotal > 0;
    if (step === 2) return Boolean(form.date);
    if (step === 3) return Boolean(form.time);
    if (step === 4) return locationReady;

    return (
      form.title.trim().length > 0 &&
      form.mealType.trim().length > 0 &&
      form.menuDescription.trim().length > 0 &&
      form.houseRules.trim().length > 0 &&
      Number(form.pricePerSeat.replace(",", ".")) >= 0 &&
      Boolean(composedDateTime)
    );
  }, [composedDateTime, form, locationReady, step]);

  const selectedDateLabel = formatSelectedDate(form.date);

  const handlePrevious = () => {
    setStep((previousStep) => Math.max(0, previousStep - 1) as WizardStep);
  };

  const handleNext = () => {
    if (!stepCanContinue || step === 5) {
      return;
    }

    setStep((previousStep) => Math.min(5, previousStep + 1) as WizardStep);
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

      await axios.post(
        `${apiUrl}/meals`,
        {
          title: form.title.trim(),
          mealType: form.mealType.trim(),
          menuDescription: form.menuDescription.trim(),
          dateTime: composedDateTime.toISOString(),
          seatsTotal: form.seatsTotal,
          pricePerSeatCents: Math.round(
            Number(form.pricePerSeat.replace(",", ".")) * 100,
          ),
          houseRules: form.houseRules.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      toast.success("Ton repas a été créé en brouillon.");
      router.push("/mes-repas");
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ?? "La création du repas a échoué."
        : "La création du repas a échoué.";
      toast.error(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className={styles.page}>
        <div className={styles.loadingState}>Préparation du créateur de repas...</div>
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
            <p className={styles.sidebarKicker}>Création de repas</p>
            <h1>Organiser un repas devient plus simple, étape par étape.</h1>
            <p className={styles.sidebarDescription}>
              Compose d&apos;abord l&apos;essentiel, puis ajoute les informations qui
              rassurent tes futurs invités. Le repas sera créé en brouillon pour te
              laisser la main avant publication.
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

                return (
                  <div
                    key={label}
                    className={`${styles.progressItem} ${
                      isCurrent ? styles["progressItem--current"] : ""
                    } ${isDone ? styles["progressItem--done"] : ""}`}
                  >
                    <span className={styles.progressIndex}>
                      {isDone ? <Check /> : index + 1}
                    </span>
                    <span>{label}</span>
                  </div>
                );
              })}
            </div>

            <div className={styles.summaryCard}>
              <h2>Aperçu</h2>

              <dl className={styles.summaryList}>
                <div>
                  <dt>
                    <Users />
                    Convives
                  </dt>
                  <dd>{form.seatsTotal}</dd>
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
              Étape {step + 1} sur {STEP_LABELS.length}
            </p>
          </div>

          <div className={styles.stageBody}>
            {step === 0 ? (
              <div className={styles.centerStage}>
                <div className={styles.stageIntroBadge}>
                  <Sparkles />
                  Nouveau repas
                </div>
                <h2>Organiser un repas</h2>
                <strong>*wording*</strong>
                <p>
                  Vous souhaitez cuisiner et accueillir des gens ? On construit
                  d&apos;abord l&apos;essentiel, puis on affine les détails pour rassurer
                  vos invités.
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
                      setForm((previousForm) => ({
                        ...previousForm,
                        seatsTotal: Math.max(1, previousForm.seatsTotal - 1),
                      }))
                    }
                    aria-label="Retirer une place"
                  >
                    –
                  </button>

                  <span className={styles.counterValue}>{form.seatsTotal}</span>

                  <button
                    type="button"
                    className={styles.counterButton}
                    onClick={() =>
                      setForm((previousForm) => ({
                        ...previousForm,
                        seatsTotal: previousForm.seatsTotal + 1,
                      }))
                    }
                    aria-label="Ajouter une place"
                  >
                    +
                  </button>
                </div>

                <p className={styles.helperText}>
                  Ajuste le nombre de places disponibles avant publication.
                </p>
              </div>
            ) : null}

            {step === 2 ? (
              <div className={styles.centerStage}>
                <h2>Quand souhaitez-vous organiser le repas ?</h2>

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

                <div className={styles.selectionPreview}>
                  <CalendarDays />
                  <span>{selectedDateLabel}</span>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className={styles.centerStage}>
                <h2>À quelle heure les invités doivent-ils arriver ?</h2>

                <div className={styles.selectionPreview}>
                  <Clock3 />
                  <span>{form.time}</span>
                </div>

                <div className={styles.timeGrid}>
                  {TIME_OPTIONS.map((timeOption) => (
                    <button
                      key={timeOption}
                      type="button"
                      className={`${styles.timeChip} ${
                        form.time === timeOption ? styles["timeChip--selected"] : ""
                      }`}
                      onClick={() =>
                        setForm((previousForm) => ({
                          ...previousForm,
                          time: timeOption,
                        }))
                      }
                    >
                      {timeOption}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {step === 4 ? (
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
                      <span>Numéro et nom de voie</span>
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

            {step === 5 ? (
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
                      <h3>Informations générales</h3>
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
                        placeholder="Ex. Dîner italien entre voisins"
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
                        <span>€</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className={styles.formSection}>
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
                      placeholder="Déjeuner, dîner, brunch..."
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
                    <span>Règles de la maison</span>
                    <textarea
                      rows={4}
                      value={form.houseRules}
                      onChange={(event) =>
                        setForm((previousForm) => ({
                          ...previousForm,
                          houseRules: event.target.value,
                        }))
                      }
                      placeholder="Ex. Merci d'arriver à l'heure, prévenir en cas d'allergie, ambiance conviviale."
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

            {step < 5 ? (
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
                {submitting ? "Création..." : "Créer"}
                <Check />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
