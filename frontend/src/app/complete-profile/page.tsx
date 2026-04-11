"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import DatePickerField from "@/components/DatePicker";
import styles from "./complete-profile.module.scss";
import { useAuth } from "@/app/providers/AuthProvider";

export default function CompleteProfilePage() {
  const router = useRouter();
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const pendingToken = searchParams.get("pending");
  const missingEmail = searchParams.get("missingEmail") === "1";
  const missingFirstName = searchParams.get("missingFirstName") === "1";
  const missingLastName = searchParams.get("missingLastName") === "1";
  const reason = searchParams.get("reason");
  const isPendingFlow = useMemo(() => Boolean(pendingToken), [pendingToken]);

  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    country: "",
    city: "",
    birth_date: "",
    pseudo: "",
    bio: "",
    profile_photo_url: "",
  });
  const [showOptional, setShowOptional] = useState(false);
  const [oauthFlow] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("oauth_flow");
  });

  const shouldRedirectToRegister =
    isPendingFlow && oauthFlow === "login" && reason === "not_registered";

  useEffect(() => {
    if (!shouldRedirectToRegister) return;
    toast.info("Compte introuvable. Inscris-toi pour continuer.");
    localStorage.removeItem("oauth_flow");
    router.replace("/inscription");
  }, [shouldRedirectToRegister, router]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        toast.error("Impossible de lire cette image.");
        return;
      }

      const imageDataUrl = reader.result;

      setFormData((prev) => ({
        ...prev,
        profile_photo_url: imageDataUrl,
      }));
    };

    reader.onerror = () => {
      toast.error("Impossible de charger cette image.");
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({
      ...prev,
      profile_photo_url: "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        toast.error("API_URL manquante");
        return;
      }

      if (isPendingFlow) {
        const payload: Record<string, string> = {
          pending_token: pendingToken as string,
          country: formData.country,
          city: formData.city,
          birth_date: formData.birth_date,
        };

        if (missingEmail) payload.email = formData.email;
        if (missingFirstName) payload.first_name = formData.first_name;
        if (missingLastName) payload.last_name = formData.last_name;
        if (formData.pseudo.trim()) payload.pseudo = formData.pseudo.trim();
        if (formData.bio.trim()) payload.bio = formData.bio.trim();
        if (formData.profile_photo_url.trim()) {
          payload.profile_photo_url = formData.profile_photo_url.trim();
        }

        const res = await axios.post(`${apiUrl}/auth/oauth/complete`, payload);

        if (res.data?.verification_required) {
          localStorage.removeItem("oauth_flow");
          toast.info("Vérifie ton email pour activer ton compte.");
          router.push("/connexion?verify=1");
          return;
        }

        const token = res.data.access_token;
        if (!token) {
          toast.error("Token manquant");
          return;
        }

        login(token);
        localStorage.removeItem("oauth_flow");
        toast.success("Profil complété 🎉");
        router.push("/");
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/connexion");
        return;
      }

      await axios.patch(`${apiUrl}/users/me/complete-profile`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      localStorage.removeItem("oauth_flow");
      toast.success("Profil complété 🎉");
      router.push("/");
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? "Erreur lors de la mise à jour"
        : "Erreur lors de la mise à jour";

      toast.error(Array.isArray(message) ? message.join(", ") : message);
    }
  };

  if (shouldRedirectToRegister) {
    return (
      <main className={styles.container}>
        <div className={styles.shell}>
          <section className={styles.formCard}>
            <p className={styles.text}>Redirection vers l&apos;inscription...</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <div className={styles.shell}>
        <section className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2 className={styles.title}>Finaliser votre profil</h2>
            <p className={styles.subtitle}>
              Quelques informations supplémentaires sont nécessaires pour terminer votre inscription.
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

            <div className={styles.grid}>
              {isPendingFlow && missingEmail && (
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
              )}

              {isPendingFlow && missingFirstName && (
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
              )}

              {isPendingFlow && missingLastName && (
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
              )}

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
                          {formData.profile_photo_url
                            ? "Changer la photo"
                            : "Télécharger une image"}
                        </button>

                        <p className={styles.uploadHint}>
                          {formData.profile_photo_url
                            ? "Une photo est prête à être envoyée avec votre profil."
                            : "PNG, JPG ou WebP depuis votre ordinateur."}
                        </p>
                      </div>

                      {formData.profile_photo_url && (
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
              Terminer
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}