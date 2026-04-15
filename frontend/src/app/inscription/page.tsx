"use client";

import { ChangeEvent, Suspense, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import axios from "axios";
import styles from "./inscription.module.scss";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import DatePickerField from "@/components/DatePicker";

function InscriptionPageContent() {
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password_hash: "",
    first_name: "",
    last_name: "",
    country: "",
    city: "",
    birth_date: "",
    pseudo: "",
    bio: "",
  });
  const [showOptional, setShowOptional] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);

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
    };
  }, []);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
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

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidEmail(formData.email)) {
      toast.error("Adresse email invalide 😅");
      return;
    }

    try {
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

      if (selectedPhotoFile) {
        payload.append("profile_photo", selectedPhotoFile);
      }

      await axios.post(`${apiUrl}/auth/inscription`, payload);

      toast.success("Compte créé. Vérifie ton email pour l'activer ✅");

      setFormData({
        email: "",
        password_hash: "",
        first_name: "",
        last_name: "",
        country: "",
        city: "",
        birth_date: "",
        pseudo: "",
        bio: "",
      });
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setSelectedPhotoFile(null);
      setPhotoPreviewUrl("");
      setShowOptional(false);

    } catch (err: unknown) {
      let message = "Erreur inconnue 😅";

      if (axios.isAxiosError(err) && err.response?.data?.message) {
        if (Array.isArray(err.response.data.message)) {
          message = err.response.data.message.join(", ");
        } else if (typeof err.response.data.message === "string") {
          message = err.response.data.message;
        }
      }

      toast.error(message);
    }
  };

  const handleOAuth = (provider: "google" | "apple") => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      toast.error("API_URL manquante");
      return;
    }
    localStorage.setItem("oauth_flow", "register");
    const flow = "register";
    window.location.href = `${apiUrl}/auth/${provider}?flow=${flow}`;
  };

  return (
    <main className={styles.container}>
      <div className={styles.shell}>
        <section className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2 className={styles.title}>Créez votre compte</h2>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className={styles.hiddenInput}
              onChange={handlePhotoChange}
            />

            <div className={styles.grid}>
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
                  setFormData((prev) => ({
                    ...prev,
                    birth_date: value,
                  }))
                }
                placeholder="Date de naissance"
                variant="input"
                ariaLabel="Choisir une date de naissance"
              />
            </label>

            <button
              type="button"
              className={styles.optionalToggle}
              onClick={() => setShowOptional((prev) => !prev)}
            >
              <span>
                {showOptional
                  ? "Masquer les champs optionnels"
                  : "Afficher les champs optionnels"}
              </span>
              <span className={showOptional ? styles.chevronUp : styles.chevronDown}>
                ▾
              </span>
            </button>

            {showOptional && (
              <div className={styles.optionalBlock}>
                <div className={styles.grid}>
                  <label className={styles.field}>
                    <span>Pseudo</span>
                    <input
                      className={`${styles.input} ${styles.optionalInput}`}
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
                            ? "Une photo est prête à être envoyée avec l’inscription."
                            : "PNG, JPG ou WebP depuis votre ordinateur."}
                        </p>
                      </div>

                      {photoPreviewUrl && (
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
                      )}
                    </div>
                  </label>
                </div>

                <label className={`${styles.field} ${styles.bioField}`}>
                  <span>Bio</span>
                  <textarea
                    className={styles.textarea}
                    name="bio"
                    placeholder="Quelques mots sur vous, votre cuisine, vos envies..."
                    value={formData.bio}
                    onChange={handleChange}
                    rows={4}
                  />
                </label>
              </div>
            )}

            <button className={styles.button} type="submit">
              S&apos;inscrire
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
              title="Apple à configurer côté backend"
            >
              Continuer avec Apple
            </button>
          </div>

          <p className={styles.bottomText}>
            Vous avez déjà un compte ?{" "}
            <Link href="/connexion" className={styles.link}>
              Connectez-vous !
            </Link>
          </p>
        </section>
      </div>
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
