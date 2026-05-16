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
const MAX_HOST_HOME_PHOTO_SIZE_MB = 5;

function InscriptionPageContent() {
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hostPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const hostPhotoObjectUrlRef = useRef<string | null>(null);
  const hostRequestSectionRef = useRef<HTMLElement | null>(null);
  const [formData, setFormData] = useState<RegistrationFormState>(INITIAL_FORM_STATE);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [hostPhotoPreviewUrl, setHostPhotoPreviewUrl] = useState("");
  const [selectedHostPhotoFile, setSelectedHostPhotoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCertificationPrompt, setShowCertificationPrompt] = useState(false);
  const [skipCertificationPrompt, setSkipCertificationPrompt] = useState(false);

  useEffect(() => {
    const reason = searchParams.get("reason");
    if (reason === "not_registered") {
      toast.info("Compte introuvable. Cree un compte pour continuer.");
      localStorage.removeItem("oauth_flow");
    }

    const verify = searchParams.get("verify");
    if (verify === "1") {
      toast.info("Verifie ton email pour activer ton compte.");
      localStorage.removeItem("oauth_flow");
    }
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }

      if (hostPhotoObjectUrlRef.current) {
        URL.revokeObjectURL(hostPhotoObjectUrlRef.current);
      }
    };
  }, []);

  const isHostRequestReady = useMemo(() => {
    if (!formData.request_host) {
      return true;
    }

    return Boolean(
      formData.host_district_label.trim() && formData.host_address.trim(),
    );
  }, [
    formData.host_address,
    formData.host_district_label,
    formData.request_host,
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
    setPhotoPreviewUrl(previewUrl);
    event.target.value = "";
  };

  const handleSelectHostPhoto = () => {
    hostPhotoInputRef.current?.click();
  };

  const handleHostPhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type)
    ) {
      toast.error("La photo du logement doit etre en PNG, JPG, JPEG ou WebP.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_HOST_HOME_PHOTO_SIZE_MB * 1024 * 1024) {
      toast.error(
        `La photo du logement ne doit pas depasser ${MAX_HOST_HOME_PHOTO_SIZE_MB} Mo.`,
      );
      event.target.value = "";
      return;
    }

    if (hostPhotoObjectUrlRef.current) {
      URL.revokeObjectURL(hostPhotoObjectUrlRef.current);
    }

    const previewUrl = URL.createObjectURL(file);
    hostPhotoObjectUrlRef.current = previewUrl;
    setSelectedHostPhotoFile(file);
    setHostPhotoPreviewUrl(previewUrl);
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

  const handleRemoveHostPhoto = () => {
    if (hostPhotoObjectUrlRef.current) {
      URL.revokeObjectURL(hostPhotoObjectUrlRef.current);
      hostPhotoObjectUrlRef.current = null;
    }

    setSelectedHostPhotoFile(null);
    setHostPhotoPreviewUrl("");

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

      if (selectedHostPhotoFile) {
        payload.append("host_home_photo", selectedHostPhotoFile);
      }

      const response = await axios.post<RegistrationResponse>(
        `${apiUrl}/auth/inscription`,
        payload,
      );

      if (response.data.hostRequestCreated === false) {
        toast.warning(
          response.data.hostRequestError
            ? `Compte cree. La demande hote n'a pas pu etre envoyee automatiquement : ${response.data.hostRequestError}`
            : "Compte cree. La demande hote n'a pas pu etre envoyee automatiquement.",
        );
      } else if (formData.request_host) {
        toast.success(
          "Compte cree. Verifie ton email pour l'activer, et ta demande hote a bien ete envoyee.",
        );
      } else {
        toast.success("Compte cree. Verifie ton email pour l'activer.");
      }

      resetForm();
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

    if (hostPhotoObjectUrlRef.current) {
      URL.revokeObjectURL(hostPhotoObjectUrlRef.current);
      hostPhotoObjectUrlRef.current = null;
    }

    setSelectedPhotoFile(null);
    setPhotoPreviewUrl("");
    setSelectedHostPhotoFile(null);
    setHostPhotoPreviewUrl("");
    setShowCertificationPrompt(false);
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
        "Renseigne le quartier et l'adresse pour envoyer la demande hote.",
      );
      return;
    }

    if (!formData.request_host && !skipCertificationPrompt) {
      setShowCertificationPrompt(true);
      return;
    }

    await submitRegistration();
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
            <p className={styles.kicker}>Creation de compte</p>
            <h2 className={styles.title}>Créez votre compte</h2>
            <p className={styles.subtitle}>
              Commence par les informations indispensables, puis ajoute ce qui
              enrichit ton profil. Si tu veux devenir hôte dès maintenant, on
              peut aussi envoyer la demande au même moment.
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
              className={styles.hiddenInput}
              onChange={handleHostPhotoChange}
            />

            <section className={styles.formSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitleRow}>
                  <h3>Informations obligatoires</h3>
                  <span className={styles.sectionBadge}>Compte requis</span>
                </div>
                <p>Ces champs sont necessaires pour creer le compte utilisateur.</p>
              </div>

              <div className={styles.grid}>
                <label className={styles.field}>
                  <span>Prenom</span>
                  <input
                    className={styles.input}
                    type="text"
                    name="first_name"
                    placeholder="Votre prenom"
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
                  <h3>Informations complementaires</h3>
                  <span className={styles.sectionBadgeMuted}>Optionnel</span>
                </div>
                <p>
                  Ces champs restent optionnels pour creer le compte. Certains
                  deviennent toutefois necessaires si tu veux demander le statut
                  hote des maintenant.
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
                          : "Telecharger une image"}
                      </button>

                      <p className={styles.uploadHint}>
                        {photoPreviewUrl
                          ? "Une photo est prete a etre envoyee avec l'inscription."
                          : "PNG, JPG ou WebP depuis votre ordinateur."}
                      </p>
                    </div>

                    {photoPreviewUrl ? (
                      <div className={styles.uploadPreview}>
                        <span className={styles.uploadPreviewBadge}>Image ajoutee</span>
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
                  <h3>Demande hote a l&apos;inscription</h3>
                  <span className={styles.sectionBadgeAccent}>Candidature hote</span>
                </div>
                <p>
                  Active cette option si tu veux envoyer ta candidature hote en
                  meme temps que la creation du compte.
                </p>
              </div>

              <div className={styles.hostToggleCard}>
                <div className={styles.hostToggleCopy}>
                  <strong>Je souhaite devenir hote</strong>
                  <span>
                    Pays et ville utilises ci-dessus. Quartier et adresse seront
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
                        <em className={styles.inlineRequirement}>Obligatoire si hote</em>
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
                        Adresse complete
                        <em className={styles.inlineRequirement}>Obligatoire si hote</em>
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
                    <span>Photo du logement</span>
                    <div className={styles.uploadBox}>
                      <div className={styles.uploadMain}>
                        <button
                          type="button"
                          className={styles.uploadButton}
                          onClick={handleSelectHostPhoto}
                        >
                          {hostPhotoPreviewUrl
                            ? "Changer la photo du logement"
                            : "Importer une photo du logement"}
                        </button>

                        <p className={styles.uploadHint}>
                          Optionnel. Formats acceptes : PNG, JPG, JPEG, WebP.
                          Taille max : {MAX_HOST_HOME_PHOTO_SIZE_MB} Mo.
                        </p>
                      </div>

                      {hostPhotoPreviewUrl ? (
                        <div className={styles.uploadPreview}>
                          <span className={styles.uploadPreviewBadge}>Photo du logement ajoutee</span>
                          <button
                            type="button"
                            className={styles.uploadRemove}
                            onClick={handleRemoveHostPhoto}
                          >
                            Retirer la photo
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </label>

                  <p className={styles.hostHelp}>
                    La photo du logement reste optionnelle. En revanche, le
                    quartier et l&apos;adresse sont obligatoires si la demande hote est active.
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
                  ? "Creation du compte et envoi de la demande..."
                  : "Creer mon compte et envoyer ma demande hote"
                : isSubmitting
                  ? "Creation du compte..."
                  : "Creer mon compte"}
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
            Vous avez deja un compte ?{" "}
            <Link href="/connexion" className={styles.link}>
              Connectez-vous
            </Link>
          </p>
        </section>
      </div>

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
                  Si vous souhaitez organiser un evenement, et{" "}
                  <strong>devenir hote</strong> sur la plateforme, vous devez
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
