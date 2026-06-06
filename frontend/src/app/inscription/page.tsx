"use client";

import axios from "axios";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChangeEvent,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "react-toastify";
import { PWA_INSTALL_NUDGE_EVENT } from "@/components/Pwa";
import DatePickerField from "@/components/DatePicker";
import styles from "./inscription.module.scss";

type RegistrationResponse = {
  success: boolean;
  message: string;
  username?: string;
  userId: number;
  hostRequestCreated?: boolean;
  hostRequestError?: string;
};

type RegistrationFormState = {
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  country: string;
  city: string;
  birth_date: string;
  pseudo: string;
  bio: string;
  request_host: boolean;
  host_district_label: string;
  host_address: string;
};

const INITIAL_FORM_STATE: RegistrationFormState = {
  email: "",
  password_hash: "",
  first_name: "",
  last_name: "",
  country: "",
  city: "",
  birth_date: "",
  pseudo: "",
  bio: "",
  request_host: false,
  host_district_label: "",
  host_address: "",
};

const BIRTH_DATE_START_MONTH = new Date(1920, 0, 1);
const BIRTH_DATE_END_MONTH = new Date();
const MAX_PROFILE_PHOTO_SIZE_MB = 3;
const PROFILE_PHOTO_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const RECOMMENDED_HOST_HOME_PHOTOS = 2;
const MAX_HOST_HOME_PHOTOS = 5;
const MAX_HOST_HOME_PHOTO_SIZE_MB = 3;
const HOST_HOME_PHOTO_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];

function InscriptionPageContent() {
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hostPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const hostPhotoObjectUrlsRef = useRef<string[]>([]);
  const hostRequestSectionRef = useRef<HTMLElement | null>(null);
  const [formData, setFormData] = useState<RegistrationFormState>(INITIAL_FORM_STATE);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [hostPhotoPreviewUrls, setHostPhotoPreviewUrls] = useState<string[]>([]);
  const [selectedHostPhotoFiles, setSelectedHostPhotoFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [termsCheckboxChecked, setTermsCheckboxChecked] = useState(false);
  const [showCertificationPrompt, setShowCertificationPrompt] = useState(false);
  const [skipCertificationPrompt, setSkipCertificationPrompt] = useState(false);

  useEffect(() => {
    const reason = searchParams.get("reason");
    if (reason === "not_registered") {
      toast.info("Compte introuvable. Crée un compte pour continuer.");
      localStorage.removeItem("oauth_flow");
    }

    const verify = searchParams.get("verify");
    if (verify === "1") {
      toast.info("Vérifie ton email pour activer ton compte.");
      localStorage.removeItem("oauth_flow");
    }
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }

      hostPhotoObjectUrlsRef.current.forEach((previewUrl) => {
        URL.revokeObjectURL(previewUrl);
      });
      hostPhotoObjectUrlsRef.current = [];
    };
  }, []);

  const isHostRequestReady = useMemo(() => {
    if (!formData.request_host) {
      return true;
    }

    return Boolean(
      formData.host_district_label.trim() &&
        formData.host_address.trim() &&
        selectedHostPhotoFiles.length > 0,
    );
  }, [
    formData.host_address,
    formData.host_district_label,
    formData.request_host,
    selectedHostPhotoFiles.length,
  ]);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData((previousForm) => ({
      ...previousForm,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSelectPhoto = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!PROFILE_PHOTO_MIME_TYPES.includes(file.type)) {
      toast.error("La photo de profil doit être en PNG, JPG, JPEG ou WebP.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_PROFILE_PHOTO_SIZE_MB * 1024 * 1024) {
      toast.error(
        `La photo de profil ne doit pas dépasser ${MAX_PROFILE_PHOTO_SIZE_MB} Mo.`,
      );
      event.target.value = "";
      return;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const previewUrl = URL.createObjectURL(file);
    objectUrlRef.current = previewUrl;
    setSelectedPhotoFile(file);
    setPhotoPreviewUrl(previewUrl);
    event.target.value = "";
  };

  const handleSelectHostPhoto = () => {
    hostPhotoInputRef.current?.click();
  };

  const handleHostPhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    const remainingSlots = MAX_HOST_HOME_PHOTOS - selectedHostPhotoFiles.length;

    if (remainingSlots <= 0) {
      toast.error(
        `Tu peux importer au maximum ${MAX_HOST_HOME_PHOTOS} photos du logement.`,
      );
      event.target.value = "";
      return;
    }

    for (const file of files) {
      if (!HOST_HOME_PHOTO_MIME_TYPES.includes(file.type)) {
        toast.error("Les photos du logement doivent être en PNG, JPG, JPEG ou WebP.");
        event.target.value = "";
        return;
      }

      if (file.size > MAX_HOST_HOME_PHOTO_SIZE_MB * 1024 * 1024) {
        toast.error(
          `Chaque photo du logement ne doit pas dépasser ${MAX_HOST_HOME_PHOTO_SIZE_MB} Mo.`,
        );
        event.target.value = "";
        return;
      }
    }

    const filesToAdd = files.slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      toast.info(
        `Seules ${remainingSlots} photo${remainingSlots > 1 ? "s" : ""} ont été ajoutées pour rester dans la limite de ${MAX_HOST_HOME_PHOTOS}.`,
      );
    }

    const previewUrls = filesToAdd.map((file) => URL.createObjectURL(file));
    hostPhotoObjectUrlsRef.current = [
      ...hostPhotoObjectUrlsRef.current,
      ...previewUrls,
    ];
    setSelectedHostPhotoFiles((previousFiles) => [
      ...previousFiles,
      ...filesToAdd,
    ]);
    setHostPhotoPreviewUrls((previousUrls) => [
      ...previousUrls,
      ...previewUrls,
    ]);
    event.target.value = "";
  };

  const handleRemovePhoto = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setSelectedPhotoFile(null);
    setPhotoPreviewUrl("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveHostPhoto = (photoIndex: number) => {
    setSelectedHostPhotoFiles((previousFiles) =>
      previousFiles.filter((_, index) => index !== photoIndex),
    );

    setHostPhotoPreviewUrls((previousUrls) => {
      const removedPreviewUrl = previousUrls[photoIndex];

      if (removedPreviewUrl) {
        URL.revokeObjectURL(removedPreviewUrl);
        hostPhotoObjectUrlsRef.current = hostPhotoObjectUrlsRef.current.filter(
          (previewUrl) => previewUrl !== removedPreviewUrl,
        );
      }

      return previousUrls.filter((_, index) => index !== photoIndex);
    });

    if (hostPhotoInputRef.current) {
      hostPhotoInputRef.current.value = "";
    }
  };

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const submitRegistration = async () => {
    try {
      setIsSubmitting(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const payload = new FormData();

      payload.append("email", formData.email);
      payload.append("password_hash", formData.password_hash);
      payload.append("first_name", formData.first_name);
      payload.append("last_name", formData.last_name);
      payload.append("country", formData.country);
      payload.append("city", formData.city);
      payload.append("birth_date", formData.birth_date);
      payload.append("pseudo", formData.pseudo.trim());
      payload.append("bio", formData.bio.trim());
      payload.append("request_host", String(formData.request_host));
      payload.append("host_district_label", formData.host_district_label.trim());
      payload.append("host_address", formData.host_address.trim());
      if (selectedPhotoFile) {
        payload.append("profile_photo", selectedPhotoFile);
      }

      selectedHostPhotoFiles.forEach((file) => {
        payload.append("host_home_photo", file);
      });

      const response = await axios.post<RegistrationResponse>(
        `${apiUrl}/auth/inscription`,
        payload,
      );

      if (response.data.hostRequestCreated === false) {
        toast.warning(
          response.data.hostRequestError
            ? `Compte créé. La demande hôte n'a pas pu être envoyée automatiquement : ${response.data.hostRequestError}`
            : "Compte créé. La demande hôte n'a pas pu être envoyée automatiquement.",
        );
      } else if (formData.request_host) {
        toast.success(
          "Compte créé. Vérifie ton email pour l'activer, et ta demande hôte a bien été envoyée.",
        );
      } else {
        toast.success("Compte créé. Vérifie ton email pour l'activer.");
      }

      window.dispatchEvent(new Event(PWA_INSTALL_NUDGE_EVENT));
      resetForm();
      setHasAcceptedTerms(false);
      setTermsCheckboxChecked(false);
      setSkipCertificationPrompt(false);
    } catch (error: unknown) {
      let message = "Erreur inconnue.";

      if (axios.isAxiosError(error) && error.response?.data?.message) {
        if (Array.isArray(error.response.data.message)) {
          message = error.response.data.message.join(", ");
        } else if (typeof error.response.data.message === "string") {
          message = error.response.data.message;
        }
      }

      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_STATE);

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    hostPhotoObjectUrlsRef.current.forEach((previewUrl) => {
      URL.revokeObjectURL(previewUrl);
    });
    hostPhotoObjectUrlsRef.current = [];

    setSelectedPhotoFile(null);
    setPhotoPreviewUrl("");
    setSelectedHostPhotoFiles([]);
    setHostPhotoPreviewUrls([]);
    setShowTermsModal(false);
    setShowCertificationPrompt(false);
  };

  const continueRegistrationFlow = async ({
    acceptedTerms = hasAcceptedTerms,
    skipCertification = skipCertificationPrompt,
  } = {}) => {
    if (!acceptedTerms) {
      setTermsCheckboxChecked(false);
      setShowTermsModal(true);
      return;
    }

    if (!formData.request_host && !skipCertification) {
      setShowCertificationPrompt(true);
      return;
    }

    await submitRegistration();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (!isValidEmail(formData.email)) {
      toast.error("Adresse email invalide.");
      return;
    }

    if (formData.request_host && !isHostRequestReady) {
      toast.error(
        "Renseigne le quartier, l'adresse et au moins une photo du logement pour envoyer la demande hôte.",
      );
      return;
    }

    await continueRegistrationFlow();
  };

  const handleAcceptTerms = async () => {
    if (!termsCheckboxChecked) {
      toast.error("Accepte les conditions d'utilisation pour continuer.");
      return;
    }

    setHasAcceptedTerms(true);
    setShowTermsModal(false);
    await continueRegistrationFlow({ acceptedTerms: true });
  };

  const handleContinueWithoutCertification = async () => {
    setShowCertificationPrompt(false);
    setSkipCertificationPrompt(true);
    await submitRegistration();
  };

  const handleStartCertification = () => {
    setShowCertificationPrompt(false);
    setSkipCertificationPrompt(false);
    setFormData((previousForm) => ({
      ...previousForm,
      request_host: true,
    }));

    window.requestAnimationFrame(() => {
      hostRequestSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleOAuth = (provider: "google" | "apple") => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!apiUrl) {
      toast.error("API_URL manquante");
      return;
    }

    localStorage.setItem("oauth_flow", "register");
    window.location.href = `${apiUrl}/auth/${provider}?flow=register`;
  };

  return (
    <main className={styles.container}>
      <div className={styles.shell}>
        <section className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2 className={styles.title}>Créez votre compte</h2>
            <p className={styles.subtitle}>
              Commence par les informations indispensables, puis ajoute ce qui
              enrichit ton profil. Si tu veux devenir hôte dès maintenant, tu
              peux aussi envoyer la demande au même moment.
            </p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className={styles.hiddenInput}
              onChange={handlePhotoChange}
            />
            <input
              ref={hostPhotoInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
              multiple
              className={styles.hiddenInput}
              onChange={handleHostPhotoChange}
            />

            <section className={styles.formSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitleRow}>
                  <h3>Informations obligatoires</h3>
                  <span className={styles.sectionBadge}>Compte requis</span>
                </div>
                <p>Ces champs sont nécessaires pour créer le compte utilisateur.</p>
              </div>

              <div className={styles.grid}>
                <label className={styles.field}>
                  <span>Prénom</span>
                  <input
                    className={styles.input}
                    type="text"
                    name="first_name"
                    placeholder="Votre prénom"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className={styles.field}>
                  <span>Nom</span>
                  <input
                    className={styles.input}
                    type="text"
                    name="last_name"
                    placeholder="Votre nom"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className={styles.field}>
                  <span>Email</span>
                  <input
                    className={styles.input}
                    type="email"
                    name="email"
                    placeholder="exemple@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className={styles.field}>
                  <span>Mot de passe</span>
                  <input
                    className={styles.input}
                    type="password"
                    name="password_hash"
                    placeholder="Choisir un mot de passe"
                    value={formData.password_hash}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className={styles.field}>
                  <span>Pays</span>
                  <input
                    className={styles.input}
                    type="text"
                    name="country"
                    placeholder="France"
                    value={formData.country}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className={styles.field}>
                  <span>Ville</span>
                  <input
                    className={styles.input}
                    type="text"
                    name="city"
                    placeholder="Rennes"
                    value={formData.city}
                    onChange={handleChange}
                    required
                  />
                </label>
              </div>

              <label className={`${styles.field} ${styles.dateField}`}>
                <span>Date de naissance</span>
                <DatePickerField
                  value={formData.birth_date}
                  onChange={(value) =>
                    setFormData((previousForm) => ({
                      ...previousForm,
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
            </section>

            <section className={styles.formSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitleRow}>
                  <h3>Informations complémentaires</h3>
                  <span className={styles.sectionBadgeMuted}>Optionnel</span>
                </div>
                <p>
                  Ces champs restent optionnels pour créer le compte. Certains
                  deviennent toutefois nécessaires si tu veux demander le statut
                  hôte dès maintenant.
                </p>
              </div>

              <div className={styles.grid}>
                <label className={styles.field}>
                  <span>Pseudo</span>
                  <input
                    className={styles.input}
                    type="text"
                    name="pseudo"
                    placeholder="Choisir un pseudo"
                    value={formData.pseudo}
                    onChange={handleChange}
                  />
                </label>

                <label className={`${styles.field} ${styles.uploadField}`}>
                  <span>Photo de profil</span>
                  <div className={styles.uploadBox}>
                    <div className={styles.uploadMain}>
                      <button
                        type="button"
                        className={styles.uploadButton}
                        onClick={handleSelectPhoto}
                      >
                        {photoPreviewUrl
                          ? "Changer la photo"
                          : "Télécharger une image"}
                      </button>

                      <p className={styles.uploadHint}>
                        {photoPreviewUrl
                          ? "Une photo est prête à être envoyée avec l'inscription."
                          : `PNG, JPG ou WebP. Taille max : ${MAX_PROFILE_PHOTO_SIZE_MB} Mo.`}
                      </p>
                    </div>

                    {photoPreviewUrl ? (
                      <div className={styles.uploadPreview}>
                        <span className={styles.uploadPreviewBadge}>Image ajoutée</span>
                        <button
                          type="button"
                          className={styles.uploadRemove}
                          onClick={handleRemovePhoto}
                        >
                          Retirer la photo
                        </button>
                      </div>
                    ) : null}
                  </div>
                </label>
              </div>

              <label className={`${styles.field} ${styles.bioField}`}>
                <span>Biographie</span>
                <textarea
                  className={styles.textarea}
                  name="bio"
                  placeholder="Quelques mots sur vous, votre cuisine, vos envies..."
                  value={formData.bio}
                  onChange={handleChange}
                  rows={4}
                />
              </label>
            </section>

            <section ref={hostRequestSectionRef} className={styles.formSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitleRow}>
                  <h3>Demande hôte à l&apos;inscription</h3>
                  <span className={styles.sectionBadgeAccent}>Candidature hôte</span>
                </div>
                <p>
                  Active cette option si tu veux envoyer ta candidature hôte en
                  même temps que la création du compte.
                </p>
              </div>

              <div className={styles.hostToggleCard}>
                <div className={styles.hostToggleCopy}>
                  <strong>Je souhaite devenir hôte</strong>
                  <span>
                    Pays et ville utilisés ci-dessus. Quartier et adresse seront
                    alors requis.
                  </span>
                </div>

                <button
                  type="button"
                  className={`${styles.hostToggleButton} ${
                    formData.request_host ? styles["hostToggleButton--active"] : ""
                  }`}
                  onClick={() =>
                    setFormData((previousForm) => ({
                      ...previousForm,
                      request_host: !previousForm.request_host,
                    }))
                  }
                  aria-pressed={formData.request_host}
                >
                  <span className={styles.hostToggleThumb} />
                </button>
              </div>

              {formData.request_host ? (
                <div className={styles.hostRequestBlock}>
                  <div className={styles.grid}>
                    <label className={styles.field}>
                      <span>
                        Quartier ou secteur
                        <em className={styles.inlineRequirement}>Obligatoire si hôte</em>
                      </span>
                      <input
                        className={styles.input}
                        type="text"
                        name="host_district_label"
                        placeholder="Ex. Centre-ville"
                        value={formData.host_district_label}
                        onChange={handleChange}
                        required={formData.request_host}
                      />
                    </label>

                    <label className={styles.field}>
                      <span>
                        Adresse complète
                        <em className={styles.inlineRequirement}>Obligatoire si hôte</em>
                      </span>
                      <input
                        className={styles.input}
                        type="text"
                        name="host_address"
                        placeholder="Ex. 12 rue de la Republique"
                        value={formData.host_address}
                        onChange={handleChange}
                        required={formData.request_host}
                      />
                    </label>
                  </div>

                  <label className={`${styles.field} ${styles.uploadField}`}>
                    <span>
                      Photos du logement
                      <em className={styles.inlineRequirement}>Obligatoire si hôte</em>
                    </span>
                    <div className={styles.uploadBox}>
                      <div className={styles.uploadMain}>
                        <button
                          type="button"
                          className={styles.uploadButton}
                          onClick={handleSelectHostPhoto}
                        >
                          {hostPhotoPreviewUrls.length > 0
                            ? "Ajouter des photos du logement"
                            : "Importer des photos du logement"}
                        </button>

                        <p className={styles.uploadHint}>
                          Au moins 1 photo obligatoire. {RECOMMENDED_HOST_HOME_PHOTOS} photos
                          conseillées, jusqu&apos;à {MAX_HOST_HOME_PHOTOS}.
                          Formats acceptés : PNG, JPG, JPEG, WebP. Taille max :
                          {" "}{MAX_HOST_HOME_PHOTO_SIZE_MB} Mo par photo.
                        </p>
                      </div>

                      {hostPhotoPreviewUrls.length > 0 ? (
                        <div className={styles.uploadPreviewList}>
                          <span className={styles.uploadPreviewBadge}>
                            {hostPhotoPreviewUrls.length}/{MAX_HOST_HOME_PHOTOS} photos ajoutées
                          </span>

                          <div className={styles.uploadThumbGrid}>
                            {hostPhotoPreviewUrls.map((previewUrl, index) => (
                              <div key={previewUrl} className={styles.uploadThumb}>
                                <span
                                  className={styles.uploadThumbImage}
                                  style={{ backgroundImage: `url("${previewUrl}")` }}
                                  aria-label={`Photo du logement ${index + 1}`}
                                  role="img"
                                />
                                <button
                                  type="button"
                                  className={styles.uploadRemove}
                                  onClick={() => handleRemoveHostPhoto(index)}
                                >
                                  Retirer
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </label>

                  <p className={styles.hostHelp}>
                    Une photo du logement, le quartier et l&apos;adresse sont
                    obligatoires si la demande hôte est active.
                  </p>
                </div>
              ) : null}
            </section>

            <button
              className={styles.button}
              type="submit"
              disabled={!isHostRequestReady || isSubmitting}
            >
              {formData.request_host
                ? isSubmitting
                  ? "Création du compte et envoi de la demande..."
                  : "Créer mon compte et envoyer ma demande hôte"
                : isSubmitting
                  ? "Création du compte..."
                  : "Créer mon compte"}
            </button>
          </form>

          <div className={styles.oauthDivider}>ou</div>

          <div className={styles.oauthGroup}>
            <button
              className={styles.oauthButton}
              type="button"
              onClick={() => handleOAuth("google")}
            >
              Continuer avec Google
            </button>
            <button
              className={styles.oauthButton}
              type="button"
              disabled
              title="Apple a configurer cote backend"
            >
              Continuer avec Apple
            </button>
          </div>

          <p className={styles.bottomText}>
            Vous avez déjà un compte ?{" "}
            <Link href="/connexion" className={styles.link}>
              Connectez-vous
            </Link>
          </p>
        </section>
      </div>

      {showTermsModal ? (
        <div className={styles.modalOverlay} role="presentation">
          <section
            className={styles.termsModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="terms-modal-title"
          >
            <div className={styles.termsText}>
              <h2 id="terms-modal-title">Conditions générales d&apos;utilisation</h2>

              <div className={styles.termsScrollArea}>
                <div className={styles.termsContent}>
                  <section className={styles.termsSection}>
                    <h3>CGU</h3>
                    <p>Obligations des utilisateurs</p>
                    <ul>
                      <li>Créer un profil vérifié avec des informations exactes et à jour</li>
                      <li>Respecter les règles de sécurité de la plateforme</li>
                      <li>{"Accepter la politique d'annulation de la plateforme"}</li>
                      <li>{"Accepter la publication d'avis après chaque événement"}</li>
                      <li>Ne pas utiliser la plateforme à des fins commerciales ou frauduleuses</li>
                    </ul>

                    <p>Rôle et limites de la plateforme</p>
                    <ul>
                      <li>Ramène Ta Poire agit comme intermédiaire technique entre hôtes et invités</li>
                      <li>La plateforme ne garantit pas la qualité des événements proposés</li>
                      <li>La plateforme sécurise les paiements et les données personnelles</li>
                      <li>{"La plateforme se réserve le droit de suspendre tout compte en cas d'abus"}</li>
                    </ul>
                  </section>

                  <section className={styles.termsSection}>
                    <h3>CGV</h3>
                    <ul>
                      <li>{"Paiement sécurisé exclusivement via l'application (Stripe, Apple Pay, PayPal, Samsung Pay)"}</li>
                      <li>{"Paiement bloqué jusqu'à l'événement - libéré 24-48h après l'événement"}</li>
                      <li>{"Remboursement selon la politique d'annulation (délai, conditions) - à préciser"}</li>
                      <li>{"Commission Ramène Ta Poire déduite automatiquement avant virement à l'hôte"}</li>
                      <li>Prix affichés toutes taxes comprises</li>
                    </ul>
                  </section>
                </div>
              </div>
            </div>

            <label className={styles.termsAcceptance}>
              <input
                type="checkbox"
                checked={termsCheckboxChecked}
                onChange={(event) => setTermsCheckboxChecked(event.target.checked)}
              />
              <span className={styles.termsCheckbox} aria-hidden="true" />
              <span>
                {"J’ai lu et j’accepte les "}
                <strong>Conditions d&apos;utilisation</strong>
                {" de l’application."}
              </span>
            </label>

            <button
              type="button"
              className={styles.termsSubmitButton}
              onClick={handleAcceptTerms}
              disabled={!termsCheckboxChecked || isSubmitting}
            >
              Créer un compte
            </button>
          </section>
        </div>
      ) : null}

      {showCertificationPrompt ? (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowCertificationPrompt(false);
            }
          }}
        >
          <section
            className={styles.certificationModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="certification-modal-title"
          >
            <div className={styles.certificationText}>
              <h2 id="certification-modal-title">Certifiez votre compte</h2>
              <div className={styles.certificationCopy}>
                <p>
                  Si vous souhaitez organiser un événement, et{" "}
                  <strong>devenir hôte</strong> sur la plateforme, vous devez
                  d&apos;abord <strong>valider votre compte</strong>.
                </p>
                <p>
                  Pas de panique, vous pourrez vous{" "}
                  <strong>certifier</strong> plus tard !
                </p>
              </div>
            </div>

            <div className={styles.certificationActions}>
              <button
                type="button"
                className={styles.certificationSecondaryButton}
                onClick={handleContinueWithoutCertification}
                disabled={isSubmitting}
              >
                Valider plus tard
              </button>
              <button
                type="button"
                className={styles.certificationPrimaryButton}
                onClick={handleStartCertification}
                disabled={isSubmitting}
              >
                Je me certifie !
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

export default function InscriptionPage() {
  return (
    <Suspense
      fallback={
        <main className={styles.container}>
          <div className={styles.shell}>
            <section className={styles.formCard}>
              <p className={styles.bottomText}>Chargement...</p>
            </section>
          </div>
        </main>
      }
    >
      <InscriptionPageContent />
    </Suspense>
  );
}
