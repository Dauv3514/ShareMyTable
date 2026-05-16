"use client";

import axios from "axios";
import {
  Bell,
  CalendarDays,
  Camera,
  CreditCard,
  History,
  LockKeyhole,
  Mail,
  Plus,
  ShieldCheck,
  TriangleAlert,
  Users,
  UtensilsCrossed,
  Wallet,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "react-toastify";
import UserAvatar from "@/components/UserAvatar";
import DatePickerField from "@/components/DatePicker";
import {
  fetchMyUserPreferences,
  updateMyUserPreferences,
} from "@/lib/user-preferences";
import { useAuth } from "../providers/AuthProvider";
import styles from "./profil.module.scss";

const BIRTH_DATE_START_MONTH = new Date(1920, 0, 1);
const BIRTH_DATE_END_MONTH = new Date();
const DEFAULT_DIETARY_PREFERENCE_TAGS = ["Sans gluten"];
const DEFAULT_AMBIANCE_PREFERENCE_TAGS = ["Discussions enrichissantes"];
const DIETARY_PREFERENCE_SUGGESTIONS = [
  "Végétarien",
  "Vegan",
  "Flexitarien",
  "Sans gluten",
  "Sans lactose",
  "Halal",
  "Casher",
  "Allergie aux noix",
  "Diabétique",
  "Pas de porc",
];
const AMBIANCE_PREFERENCE_SUGGESTIONS = [
  "Discussions enrichissantes",
  "Ambiance décontractée",
  "Soirée jeux",
  "Découverte culinaire",
  "Repas calme",
  "Échange linguistique",
  "Cuisine du monde",
  "Repas en plein air",
  "Convivial et festif",
  "Sans écrans",
];

type ProfileFormData = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  pseudo: string;
  country: string;
  city: string;
  bio: string;
  birth_date: string;
};

type PasswordFormData = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

type HostProfileSummary = {
  id: number;
  isActive: boolean;
  validationStatus: "pending" | "approved" | "rejected";
  country: string;
  city: string;
  districtLabel: string;
  address: string;
  rejectionReason: string | null;
};

type PreferenceCategory = "dietary" | "ambiance";

type ExpandablePanel = "profile" | "password" | null;
type ProfileSection = "overview" | "preferences" | "activity" | "payments" | "notifications";

const PROFILE_NAVIGATE_EVENT = "profile-menu:navigate";

const toDateInputValue = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  return value.includes("T") ? value.split("T")[0] : value;
};

const getProviderLabel = (
  provider: "local" | "google" | "apple" | null | undefined
) => {
  if (provider === "google") {
    return "Google";
  }

  if (provider === "apple") {
    return "Apple";
  }

  return "Email";
};

const normalizePreferenceTag = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, " ");

const toPreferenceKey = (value: string) =>
  normalizePreferenceTag(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const StatCard = ({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) => {
  return (
    <article className={styles.statCard}>
      <span className={styles.statLabel}>{label}</span>
      <strong className={`${styles.statValue} ${valueClassName ?? ""}`}>{value}</strong>
    </article>
  );
};

const PreferenceEditor = ({
  items,
  addLabel,
  onOpenModal,
  onRemoveItem,
}: {
  items: string[];
  addLabel: string;
  onOpenModal: () => void;
  onRemoveItem: (item: string) => void;
}) => {
  return (
    <div className={styles.preferenceEditor}>
      <div className={styles.preferenceBox}>
        <div className={styles.chipList}>
          {items.map((item) => (
            <span key={item} className={styles.chip}>
              <span>{item}</span>
              <button
                type="button"
                className={styles.chipRemoveButton}
                aria-label={`Retirer ${item}`}
                onClick={() => onRemoveItem(item)}
              >
                <X className={styles.chipRemove} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>

        <button
          type="button"
          className={styles.addChipButton}
          aria-haspopup="dialog"
          aria-label={addLabel}
          onClick={onOpenModal}
        >
          <Plus />
        </button>
      </div>
    </div>
  );
};

const PreferenceTagModal = ({
  open,
  title,
  suggestedText,
  inputPlaceholder,
  suggestions,
  draftValue,
  onDraftChange,
  onAddItem,
  onClose,
}: {
  open: boolean;
  title: string;
  suggestedText: string;
  inputPlaceholder: string;
  suggestions: string[];
  draftValue: string;
  onDraftChange: (value: string) => void;
  onAddItem: (item: string) => void;
  onClose: () => void;
}) => {
  if (!open) {
    return null;
  }

  const normalizedDraft = normalizePreferenceTag(draftValue);

  return (
    <div
      className={styles.preferenceModal}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        className={styles.preferenceModalBackdrop}
        type="button"
        aria-label="Fermer la fenêtre"
        onClick={onClose}
      />

      <section className={styles.preferenceModalSheet}>
        <div className={styles.preferenceModalHeader}>
          <div>
            <p className={styles.preferenceModalEyebrow}>Préférences</p>
            <h3>Ajouter un tag</h3>
          </div>
          <button
            type="button"
            className={styles.preferenceModalClose}
            aria-label="Fermer la fenêtre"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <div className={styles.preferenceModalContent}>
          <section className={styles.preferenceModalGroup}>
            <div className={styles.preferenceModalGroupHeader}>
              <h4>Tags suggérés</h4>
              <p>{suggestedText}</p>
            </div>

            <div className={styles.preferenceModalChips}>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className={styles.preferenceModalChip}
                  onClick={() => onAddItem(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.preferenceModalGroup}>
            <div className={styles.preferenceModalGroupHeader}>
              <h4>Tag personnalisé</h4>
              <p>Visible uniquement dans tes préférences de profil.</p>
            </div>

            <label className={styles.preferenceModalField}>
              <input
                type="text"
                value={draftValue}
                onChange={(event) => onDraftChange(event.target.value)}
                placeholder={inputPlaceholder}
              />
            </label>
          </section>
        </div>

        <div className={styles.preferenceModalFooter}>
          <button
            type="button"
            className={styles.preferenceModalResult}
            disabled={!normalizedDraft}
            onClick={() => onAddItem(draftValue)}
          >
            Ajouter le tag
          </button>
          <button type="button" className={styles.preferenceModalClear} onClick={onClose}>
            Annuler
          </button>
        </div>
      </section>
    </div>
  );
};

const ActionRow = ({
  icon: Icon,
  label,
  value,
  expanded = false,
  interactive = true,
  onClick,
}: {
  icon: typeof Bell;
  label: string;
  value?: string;
  expanded?: boolean;
  interactive?: boolean;
  onClick?: () => void;
}) => {
  const content = (
    <>
      <span className={styles.actionLeft}>
        <span className={styles.actionIconWrap}>
          <Icon className={styles.actionIcon} />
        </span>
        <span className={styles.actionLabel}>{label}</span>
      </span>

      <span className={styles.actionRight}>
        {value ? <span className={styles.actionValue}>{value}</span> : null}
        {interactive ? <span className={styles.sectionLink} aria-hidden="true" /> : null}
      </span>
    </>
  );

  if (!interactive) {
    return <div className={`${styles.actionRow} ${styles.actionRowStatic}`}>{content}</div>;
  }

  return (
    <button
      type="button"
      className={`${styles.actionRow} ${expanded ? styles.actionRowExpanded : ""}`}
      onClick={onClick}
    >
      {content}
    </button>
  );
};

const ProfileEditForm = ({
  user,
  onClose,
}: {
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
  onClose: () => void;
}) => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const { refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [removeProfilePhoto, setRemoveProfilePhoto] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    pseudo: "",
    country: "",
    city: "",
    bio: "",
    birth_date: "",
  });

  useEffect(() => {
    setFormData({
      first_name: user.firstName ?? "",
      last_name: user.lastName ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      pseudo: user.pseudo ?? "",
      country: user.country ?? "",
      city: user.city ?? "",
      bio: user.bio ?? "",
      birth_date: toDateInputValue(user.birthDate),
    });
    setPhotoPreviewUrl(user.profilePhotoUrl ?? "");
    setSelectedPhotoFile(null);
    setRemoveProfilePhoto(false);
  }, [user]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectPhoto = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Choisis une image valide.");
      event.target.value = "";
      return;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const previewUrl = URL.createObjectURL(file);
    objectUrlRef.current = previewUrl;
    setSelectedPhotoFile(file);
    setRemoveProfilePhoto(false);
    setPhotoPreviewUrl(previewUrl);
    event.target.value = "";
  };

  const handleRemovePhoto = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setSelectedPhotoFile(null);
    setRemoveProfilePhoto(true);
    setPhotoPreviewUrl("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const token = localStorage.getItem("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!token || !apiUrl) {
      toast.error("Session invalide. Reconnecte-toi.");
      router.push("/connexion");
      return;
    }

    const payload = new FormData();
    payload.append("first_name", formData.first_name);
    payload.append("last_name", formData.last_name);
    payload.append("phone", formData.phone.trim());
    payload.append("pseudo", formData.pseudo.trim());
    payload.append("country", formData.country);
    payload.append("city", formData.city);
    payload.append("bio", formData.bio.trim());
    payload.append("birth_date", formData.birth_date);

    if (selectedPhotoFile) {
      payload.append("profile_photo", selectedPhotoFile);
    } else if (removeProfilePhoto) {
      payload.append("remove_profile_photo", "true");
    }

    try {
      setSaving(true);

      await axios.patch(`${apiUrl}/users/me`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await refreshUser();
      toast.success("Profil mis à jour");
      onClose();
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ?? "La mise à jour du profil a échoué."
        : "La mise à jour du profil a échoué.";
      toast.error(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={styles.formPanel} onSubmit={handleSubmit}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className={styles.hiddenInput}
        onChange={handlePhotoChange}
      />

      <div className={styles.formPanelHead}>
        <div>
          <p className={styles.panelEyebrow}>Profil</p>
          <h3>Modifier mon profil</h3>
        </div>

        <div className={styles.formAvatarBlock}>
          <div className={styles.formAvatarFrame}>
            <UserAvatar
              src={photoPreviewUrl}
              alt="Photo de profil"
              size={84}
              priority
            />
          </div>

          <div className={styles.formAvatarActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleSelectPhoto}
            >
              {photoPreviewUrl ? "Changer la photo" : "Ajouter une photo"}
            </button>

            {photoPreviewUrl ? (
              <button
                type="button"
                className={styles.ghostButton}
                onClick={handleRemovePhoto}
              >
                Retirer la photo
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Prénom</span>
          <input
            name="first_name"
            type="text"
            value={formData.first_name}
            onChange={handleChange}
            required
          />
        </label>

        <label className={styles.field}>
          <span>Nom</span>
          <input
            name="last_name"
            type="text"
            value={formData.last_name}
            onChange={handleChange}
            required
          />
        </label>
      </div>

      <label className={styles.field}>
        <span>
          <Mail />
          Email
        </span>
        <input name="email" type="email" value={formData.email} readOnly disabled />
        <small>L&apos;email se modifie via un parcours dédié.</small>
      </label>

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Téléphone</span>
          <input
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Ajouter un numéro"
          />
        </label>

        <label className={styles.field}>
          <span>Pseudo</span>
          <input
            name="pseudo"
            type="text"
            value={formData.pseudo}
            onChange={handleChange}
            placeholder="Choisir un pseudo"
          />
        </label>
      </div>

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Pays</span>
          <input
            name="country"
            type="text"
            value={formData.country}
            onChange={handleChange}
            required
          />
        </label>

        <label className={styles.field}>
          <span>Ville</span>
          <input
            name="city"
            type="text"
            value={formData.city}
            onChange={handleChange}
            required
          />
        </label>
      </div>

      <label className={styles.field}>
        <span>Date de naissance</span>
        <DatePickerField
          value={formData.birth_date}
          onChange={(value) =>
            setFormData((prev) => ({
              ...prev,
              birth_date: value,
            }))
          }
          placeholder="Date de naissance"
          variant="input"
          ariaLabel="Choisir une date de naissance"
          startMonth={BIRTH_DATE_START_MONTH}
          endMonth={BIRTH_DATE_END_MONTH}
        />
      </label>

      <label className={styles.field}>
        <span>Bio</span>
        <textarea
          name="bio"
          value={formData.bio}
          onChange={handleChange}
          rows={5}
          placeholder="Parle un peu de toi, de tes goûts, de ta cuisine..."
        />
      </label>

      <div className={styles.formActions}>
        <button type="button" className={styles.ghostButton} onClick={onClose}>
          Fermer
        </button>
        <button type="submit" className={styles.primaryButton} disabled={saving}>
          {saving ? "Enregistrement..." : "Sauvegarder"}
        </button>
      </div>
    </form>
  );
};

const PasswordEditForm = ({
  user,
  onClose,
}: {
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
  onClose: () => void;
}) => {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<PasswordFormData>({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const isLocalAccount = user.authProvider === "local";
  const providerLabel = useMemo(
    () => getProviderLabel(user.authProvider),
    [user.authProvider]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isLocalAccount) {
      return;
    }

    if (formData.new_password !== formData.confirm_password) {
      toast.error("Les mots de passe ne correspondent pas.");
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
      setSaving(true);

      const response = await axios.patch(
        `${apiUrl}/auth/change-password`,
        {
          current_password: formData.current_password,
          new_password: formData.new_password,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success(response.data?.message ?? "Mot de passe mis à jour");
      setFormData({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      onClose();
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ?? "La mise à jour du mot de passe a échoué."
        : "La mise à jour du mot de passe a échoué.";
      toast.error(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.formPanel}>
      <div className={styles.formPanelHead}>
        <div>
          <p className={styles.panelEyebrow}>Sécurité</p>
          <h3>Modifier mon mot de passe</h3>
        </div>

        <div className={styles.providerPill}>
          <ShieldCheck />
          <span>Connexion via {providerLabel}</span>
        </div>
      </div>

      {isLocalAccount ? (
        <form className={styles.passwordForm} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>Mot de passe actuel</span>
            <input
              type="password"
              value={formData.current_password}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  current_password: event.target.value,
                }))
              }
              required
            />
          </label>

          <label className={styles.field}>
            <span>Nouveau mot de passe</span>
            <input
              type="password"
              value={formData.new_password}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  new_password: event.target.value,
                }))
              }
              minLength={8}
              required
            />
          </label>

          <label className={styles.field}>
            <span>Confirmer le nouveau mot de passe</span>
            <input
              type="password"
              value={formData.confirm_password}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  confirm_password: event.target.value,
                }))
              }
              minLength={8}
              required
            />
          </label>

          <div className={styles.formActions}>
            <p className={styles.helperText}>
              Minimum 8 caractères.
            </p>
            <div className={styles.formButtons}>
              <button type="button" className={styles.ghostButton} onClick={onClose}>
                Fermer
              </button>
              <button type="submit" className={styles.primaryButton} disabled={saving}>
                {saving ? "Enregistrement..." : "Mettre à jour"}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className={styles.infoBox}>
          <LockKeyhole />
          <p>
            Ton compte est connecté via {providerLabel}. Le mot de passe se gère
            directement auprès de ce fournisseur.
          </p>
        </div>
      )}
    </div>
  );
};

const ProfilPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, loading, user } = useAuth();
  const [expandedPanel, setExpandedPanel] = useState<ExpandablePanel>(null);
  const [hostProfile, setHostProfile] = useState<HostProfileSummary | null>(null);
  const [hostProfileLoading, setHostProfileLoading] = useState(true);
  const [dietaryPreferenceTags, setDietaryPreferenceTags] = useState<string[]>(
    DEFAULT_DIETARY_PREFERENCE_TAGS
  );
  const [ambiancePreferenceTags, setAmbiancePreferenceTags] = useState<string[]>(
    DEFAULT_AMBIANCE_PREFERENCE_TAGS
  );
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [preferenceDraft, setPreferenceDraft] = useState("");
  const [activePreferenceModal, setActivePreferenceModal] =
    useState<PreferenceCategory | null>(null);
  const overviewSectionRef = useRef<HTMLElement | null>(null);
  const preferencesSectionRef = useRef<HTMLElement | null>(null);
  const activitySectionRef = useRef<HTMLElement | null>(null);
  const paymentsSectionRef = useRef<HTMLElement | null>(null);
  const notificationsSectionRef = useRef<HTMLDivElement | null>(null);
  const profilePanelRef = useRef<HTMLDivElement | null>(null);
  const passwordPanelRef = useRef<HTMLDivElement | null>(null);
  const skipPreferenceSyncRef = useRef(true);

  const getSectionTarget = (section: string | null) => {
    switch (section) {
      case "overview":
        return overviewSectionRef.current;
      case "preferences":
        return preferencesSectionRef.current;
      case "activity":
        return activitySectionRef.current;
      case "payments":
        return paymentsSectionRef.current;
      case "notifications":
        return notificationsSectionRef.current;
      default:
        return null;
    }
  };

  const scrollToPanel = (
    panel: Exclude<ExpandablePanel, null>,
    attempt = 0
  ) => {
    window.requestAnimationFrame(() => {
      const target =
        panel === "profile" ? profilePanelRef.current : passwordPanelRef.current;

      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return;
      }

      if (attempt < 8) {
        scrollToPanel(panel, attempt + 1);
      }
    });
  };

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/connexion");
    }
  }, [isLoggedIn, loading, router]);

  useEffect(() => {
    let cancelled = false;

    const fetchHostProfile = async () => {
      if (!isLoggedIn || !user) {
        if (!cancelled) {
          setHostProfile(null);
          setHostProfileLoading(false);
        }
        return;
      }

      const token = localStorage.getItem("token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!token || !apiUrl) {
        if (!cancelled) {
          setHostProfile(null);
          setHostProfileLoading(false);
        }
        return;
      }

      try {
        setHostProfileLoading(true);

        const response = await axios.get(`${apiUrl}/host-profiles/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (cancelled) {
          return;
        }

        setHostProfile({
          id: response.data.id,
          isActive: Boolean(response.data.isActive),
          validationStatus: response.data.validationStatus,
          country: response.data.country ?? "",
          city: response.data.city ?? "",
          districtLabel: response.data.districtLabel ?? "",
          address: response.data.address ?? "",
          rejectionReason: response.data.rejectionReason ?? null,
        });
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        if (axios.isAxiosError(error) && error.response?.status === 404) {
          setHostProfile(null);
        } else {
          setHostProfile(null);
        }
      } finally {
        if (!cancelled) {
          setHostProfileLoading(false);
        }
      }
    };

    void fetchHostProfile();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, user, user?.id]);

  useEffect(() => {
    const panel = searchParams.get("panel");

    if (panel === "profile" || panel === "password") {
      setExpandedPanel(panel);
      return;
    }

    setExpandedPanel(null);
  }, [searchParams]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const panel = searchParams.get("panel");
    if (panel === "profile" || panel === "password") {
      return;
    }

    const section = searchParams.get("section");
    const target = getSectionTarget(section);

    if (!target) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [searchParams, user]);

  useEffect(() => {
    if (!expandedPanel || !user) {
      return;
    }

    scrollToPanel(expandedPanel);
  }, [expandedPanel, user]);

  useEffect(() => {
    const handleProfileNavigate = (event: Event) => {
      const detail = (event as CustomEvent<{
        panel?: Exclude<ExpandablePanel, null>;
        section?: ProfileSection;
      }>).detail;

      if (!detail) {
        return;
      }

      if (detail.panel) {
        setExpandedPanel(detail.panel);
      }

      window.requestAnimationFrame(() => {
        if (detail.panel) {
          scrollToPanel(detail.panel);
          return;
        }

        getSectionTarget(detail.section ?? null)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    };

    window.addEventListener(PROFILE_NAVIGATE_EVENT, handleProfileNavigate);

    return () => {
      window.removeEventListener(PROFILE_NAVIGATE_EVENT, handleProfileNavigate);
    };
  }, []);

  const displayName = useMemo(() => {
    if (!user) {
      return "Mon profil";
    }

    return (
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      user.pseudo ||
      "Mon profil"
    );
  }, [user]);

  const overviewContact = useMemo(() => {
    if (!user) {
      return "Coordonnées à renseigner";
    }

    return user.email || user.phone || user.pseudo || "Coordonnées à renseigner";
  }, [user]);

  const hostStatusMeta = useMemo(() => {
    if (!hostProfile) {
      return {
        label: "Aucune demande envoyée",
        toneClassName: styles.hostStatusNeutral,
        description:
          "Tu peux envoyer une demande hôte pour proposer tes repas sur la plateforme.",
        actionLabel: "Faire ma demande hôte",
        actionHref: "/profil/devenir-hote",
      };
    }

    if (hostProfile.validationStatus === "pending") {
      return {
        label: "Demande en attente",
        toneClassName: styles.hostStatusPending,
        description:
          "Ta demande hôte est en cours de vérification. Tu peux encore ajuster les informations déjà envoyées.",
        actionLabel: "Modifier ma demande",
        actionHref: "/profil/devenir-hote",
      };
    }

    if (hostProfile.validationStatus === "rejected") {
      return {
        label: "Demande refusée",
        toneClassName: styles.hostStatusRejected,
        description:
          hostProfile.rejectionReason?.trim() ||
          "Ta demande a été refusée. Tu peux la corriger puis la renvoyer.",
        actionLabel: "Corriger et renvoyer",
        actionHref: "/profil/devenir-hote",
      };
    }

    return {
      label: "Profil hôte valide",
      toneClassName: styles.hostStatusApproved,
      description:
        "Ton profil hôte est approuvé. Tu peux maintenant organiser des repas.",
      actionLabel: "Créer un repas",
      actionHref: "/mes-repas/creer",
    };
  }, [hostProfile]);

  const availableDietarySuggestions = useMemo(
    () =>
      DIETARY_PREFERENCE_SUGGESTIONS.filter(
        (tag) =>
          !dietaryPreferenceTags.some(
            (selectedTag) => toPreferenceKey(selectedTag) === toPreferenceKey(tag)
          )
      ),
    [dietaryPreferenceTags]
  );

  const availableAmbianceSuggestions = useMemo(
    () =>
      AMBIANCE_PREFERENCE_SUGGESTIONS.filter(
        (tag) =>
          !ambiancePreferenceTags.some(
            (selectedTag) => toPreferenceKey(selectedTag) === toPreferenceKey(tag)
          )
      ),
    [ambiancePreferenceTags]
  );

  useEffect(() => {
    let cancelled = false;

    if (!user?.id) {
      setPreferencesReady(false);
      skipPreferenceSyncRef.current = true;
      return;
    }

    const loadPreferences = async () => {
      const token = localStorage.getItem("token");

      skipPreferenceSyncRef.current = true;

      if (!token) {
        if (!cancelled) {
          setDietaryPreferenceTags(DEFAULT_DIETARY_PREFERENCE_TAGS);
          setAmbiancePreferenceTags(DEFAULT_AMBIANCE_PREFERENCE_TAGS);
          setPreferencesReady(true);
        }
        return;
      }

      const preferences = await fetchMyUserPreferences(token);

      if (cancelled) {
        return;
      }

      if (preferences) {
        setDietaryPreferenceTags(preferences.dietaryTags);
        setAmbiancePreferenceTags(preferences.ambianceTags);
      } else {
        setDietaryPreferenceTags(DEFAULT_DIETARY_PREFERENCE_TAGS);
        setAmbiancePreferenceTags(DEFAULT_AMBIANCE_PREFERENCE_TAGS);
      }

      setPreferencesReady(true);
    };

    void loadPreferences();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;

    if (!user?.id || !preferencesReady) {
      return;
    }

    if (skipPreferenceSyncRef.current) {
      skipPreferenceSyncRef.current = false;
      return;
    }

    const syncPreferences = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        return;
      }

      const updatedPreferences = await updateMyUserPreferences(token, {
        dietaryTags: dietaryPreferenceTags,
        ambianceTags: ambiancePreferenceTags,
      });

      if (!updatedPreferences || cancelled) {
        if (!cancelled) {
          toast.error("Impossible d'enregistrer les préférences pour le moment.");
        }
        return;
      }
    };

    void syncPreferences();

    return () => {
      cancelled = true;
    };
  }, [ambiancePreferenceTags, dietaryPreferenceTags, preferencesReady, user?.id]);

  const updatePanelQuery = (nextPanel: ExpandablePanel) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextPanel) {
      params.delete("section");
      params.set("panel", nextPanel);
    } else {
      params.delete("panel");
    }

    const nextQuery = params.toString();
    router.replace(nextQuery ? `/profil?${nextQuery}` : "/profil", {
      scroll: false,
    });
  };

  const handlePanelToggle = (panel: Exclude<ExpandablePanel, null>) => {
    const nextPanel = expandedPanel === panel ? null : panel;
    setExpandedPanel(nextPanel);
    updatePanelQuery(nextPanel);
  };

  const handlePanelOpen = (panel: Exclude<ExpandablePanel, null>) => {
    setExpandedPanel(panel);
    updatePanelQuery(panel);
    scrollToPanel(panel);
  };

  const handlePlaceholderClick = (label: string) => {
    toast.info(`${label} sera ajouté plus tard.`);
  };

  const handleAddPreferenceTag = (rawValue: string) => {
    const nextTag = normalizePreferenceTag(rawValue);
    const targetCategory = activePreferenceModal;

    if (!targetCategory || !nextTag) {
      toast.info("Saisis un tag ou choisis une suggestion.");
      return;
    }

    const selectedTags =
      targetCategory === "dietary" ? dietaryPreferenceTags : ambiancePreferenceTags;

    const alreadyExists = selectedTags.some((tag) => toPreferenceKey(tag) === toPreferenceKey(nextTag));

    if (alreadyExists) {
      toast.info("Ce tag est déjà présent.");
      return;
    }

    if (targetCategory === "dietary") {
      setDietaryPreferenceTags((prev) => [...prev, nextTag]);
    } else {
      setAmbiancePreferenceTags((prev) => [...prev, nextTag]);
    }

    setPreferenceDraft("");
    setActivePreferenceModal(null);
  };

  const handleRemovePreferenceTag = (
    category: PreferenceCategory,
    tagToRemove: string
  ) => {
    if (category === "dietary") {
      setDietaryPreferenceTags((prev) => prev.filter((tag) => tag !== tagToRemove));
      return;
    }

    setAmbiancePreferenceTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  };

  if (loading || (!user && isLoggedIn)) {
    return (
      <section className={styles.page}>
        <div className={styles.loadingCard}>
          <p className={styles.loading}>Chargement du profil...</p>
        </div>
      </section>
    );
  }

  if (!isLoggedIn || !user) {
    return null;
  }

  return (
    <section className={styles.page}>
      <div className={styles.layout}>
        <div className={styles.contentColumn}>
          <section ref={overviewSectionRef} className={styles.sectionCard}>
            <div className={styles.sectionHead}>
              <div>
                <p className={styles.sectionEyebrow}>Vue d&apos;ensemble</p>
              </div>
            </div>

            <div className={styles.overviewIdentityCard}>
              <div className={styles.overviewIdentityText}>
                <h3>{displayName}</h3>
                <p>{overviewContact}</p>
              </div>

              <div className={styles.overviewAvatarStack}>
                <div className={styles.overviewAvatarFrame}>
                  <UserAvatar
                    src={user.profilePhotoUrl}
                    alt="Photo de profil"
                    size={78}
                    priority
                  />
                </div>

                <button
                  type="button"
                  className={`${styles.avatarEdit} ${styles.overviewAvatarEdit}`}
                  aria-label="Modifier le profil"
                  onClick={() => handlePanelOpen("profile")}
                >
                  <Camera />
                </button>
              </div>
            </div>

            <div className={styles.statsGrid}>
              <StatCard label="Repas organisés" value="0" />
              <StatCard label="Repas participés" value="0" />
              <StatCard label="Note" value="-" />
              <StatCard
                label="Profil vérifié"
                value={
                  user.isProfileComplete ? (
                    <ShieldCheck aria-hidden="true" />
                  ) : (
                    "En cours"
                  )
                }
                valueClassName={user.isProfileComplete ? styles.statValueIcon : undefined}
              />
            </div>
          </section>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHead}>
              <div>
                <h2>Statut hôte</h2>
                <p className={styles.sectionHint}>
                  Suis ta candidature et avance vers la création de repas.
                </p>
              </div>
            </div>

            {hostProfileLoading ? (
              <p className={styles.sectionHint}>Chargement de la demande hôte...</p>
            ) : (
              <div className={styles.hostStatusCard}>
                <div className={styles.hostStatusTop}>
                  <span
                    className={`${styles.hostStatusBadge} ${hostStatusMeta.toneClassName}`}
                  >
                    {hostStatusMeta.label}
                  </span>

                  {hostProfile ? (
                    <span className={styles.hostStatusLocation}>
                      {hostProfile.city}, {hostProfile.country}
                    </span>
                  ) : null}
                </div>

                <p className={styles.hostStatusDescription}>
                  {hostStatusMeta.description}
                </p>

                {hostProfile ? (
                  <dl className={styles.hostStatusDetails}>
                    <div>
                      <dt>Quartier</dt>
                      <dd>{hostProfile.districtLabel || "-"}</dd>
                    </div>
                    <div>
                      <dt>Adresse</dt>
                      <dd>{hostProfile.address || "-"}</dd>
                    </div>
                  </dl>
                ) : null}

                <div className={styles.hostStatusActions}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => router.push(hostStatusMeta.actionHref)}
                  >
                    {hostStatusMeta.actionLabel}
                  </button>
                </div>
              </div>
            )}
          </section>

          <section ref={preferencesSectionRef} className={styles.sectionCard}>
            <div className={styles.sectionHead}>
              <div>
                <h2>Régime & préférences alimentaires</h2>
                <p className={styles.sectionHint}>
                  Regroupe ici tes contraintes, habitudes et tags alimentaires personnels.
                </p>
              </div>
            </div>

            <PreferenceEditor
              items={dietaryPreferenceTags}
              addLabel="Ajouter une préférence alimentaire"
              onOpenModal={() => setActivePreferenceModal("dietary")}
              onRemoveItem={(item) => handleRemovePreferenceTag("dietary", item)}
            />
          </section>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHead}>
              <div>
                <h2>Ambiance & style de repas</h2>
                <p className={styles.sectionHint}>
                  Regroupe ici les ambiances et expériences de table que tu apprécies.
                </p>
              </div>
            </div>

            <PreferenceEditor
              items={ambiancePreferenceTags}
              addLabel="Ajouter une préférence d'ambiance"
              onOpenModal={() => setActivePreferenceModal("ambiance")}
              onRemoveItem={(item) => handleRemovePreferenceTag("ambiance", item)}
            />
          </section>

          <section ref={activitySectionRef} className={styles.sectionCard}>
            <div className={styles.sectionHead}>
              <h2>Activité</h2>
            </div>

            <div className={styles.activityGroup}>
              <h3 className={styles.activitySubtitle}>Invité</h3>
              <div className={styles.sectionList}>
                <ActionRow
                  icon={CalendarDays}
                  label="Réservations à venir"
                  value="0"
                  interactive={false}
                />
                <ActionRow
                  icon={History}
                  label="Historique de repas"
                  onClick={() => handlePlaceholderClick("Historique de repas invité")}
                />
              </div>
            </div>

            <div className={styles.activityGroup}>
              <h3 className={styles.activitySubtitle}>Hôte</h3>
              <div className={styles.sectionList}>
                <ActionRow
                  icon={UtensilsCrossed}
                  label="Repas organisés"
                  value="0"
                  interactive={false}
                />
                <ActionRow
                  icon={Users}
                  label="Nombre de participants"
                  value="0"
                  interactive={false}
                />
                <ActionRow
                  icon={History}
                  label="Historique de repas"
                  onClick={() => handlePlaceholderClick("Historique de repas hôte")}
                />
              </div>
            </div>
          </section>

          <section ref={paymentsSectionRef} className={styles.sectionCard}>
            <div className={styles.sectionHead}>
              <h2>Paiements & Portefeuille</h2>
            </div>

            <div className={styles.sectionList}>
              <ActionRow
                icon={CreditCard}
                label="Moyens de paiement"
                onClick={() => handlePlaceholderClick("Moyens de paiement")}
              />
              <ActionRow
                icon={History}
                label="Historique des paiements"
                onClick={() => handlePlaceholderClick("Historique des paiements")}
              />
              <ActionRow
                icon={Wallet}
                label="Portefeuille"
                onClick={() => handlePlaceholderClick("Portefeuille")}
              />
              <ActionRow
                icon={TriangleAlert}
                label="Remboursements"
                onClick={() => handlePlaceholderClick("Remboursements")}
              />
            </div>
          </section>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHead}>
              <h2>Paramètres & sécurité</h2>
            </div>

            <div className={styles.sectionList}>
              <ActionRow
                icon={ShieldCheck}
                label="Modifier mon profil"
                expanded={expandedPanel === "profile"}
                onClick={() => handlePanelToggle("profile")}
              />

              {expandedPanel === "profile" ? (
                <div ref={profilePanelRef} className={styles.expandedPanel}>
                  <ProfileEditForm user={user} onClose={() => handlePanelToggle("profile")} />
                </div>
              ) : null}

              <ActionRow
                icon={LockKeyhole}
                label="Modifier le mot de passe"
                expanded={expandedPanel === "password"}
                onClick={() => handlePanelToggle("password")}
              />

              {expandedPanel === "password" ? (
                <div ref={passwordPanelRef} className={styles.expandedPanel}>
                  <PasswordEditForm
                    user={user}
                    onClose={() => handlePanelToggle("password")}
                  />
                </div>
              ) : null}

              <div ref={notificationsSectionRef}>
                <ActionRow
                  icon={Bell}
                  label="Notifications"
                  onClick={() => handlePlaceholderClick("Notifications")}
                />
              </div>
            </div>

            <button
              type="button"
              className={styles.deleteButton}
              onClick={() => handlePlaceholderClick("Suppression du compte")}
            >
              Supprimer le compte
            </button>
          </section>
        </div>
      </div>

      <PreferenceTagModal
        open={activePreferenceModal !== null}
        title={
          activePreferenceModal === "ambiance"
            ? "Ajouter une préférence d'ambiance"
            : "Ajouter une préférence alimentaire"
        }
        suggestedText={
          activePreferenceModal === "ambiance"
            ? "Tu peux reprendre les ambiances et styles déjà proposés sur la plateforme."
            : "Tu peux reprendre les tags déjà proposés sur la plateforme."
        }
        inputPlaceholder={
          activePreferenceModal === "ambiance"
            ? "Ex. repas convivial, soirée calme, table sans écrans..."
            : "Ex. sans piment, allergie au kiwi..."
        }
        suggestions={
          activePreferenceModal === "ambiance"
            ? availableAmbianceSuggestions
            : availableDietarySuggestions
        }
        draftValue={preferenceDraft}
        onDraftChange={setPreferenceDraft}
        onAddItem={handleAddPreferenceTag}
        onClose={() => {
          setActivePreferenceModal(null);
          setPreferenceDraft("");
        }}
      />
    </section>
  );
};

export default ProfilPage;
