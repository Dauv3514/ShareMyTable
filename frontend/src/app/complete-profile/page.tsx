"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import styles from "./complete-profile.module.scss";
import { useAuth } from "@/app/providers/AuthProvider";

export default function CompleteProfilePage() {
  const router = useRouter();
  const { login } = useAuth();
  const searchParams = useSearchParams();

  const pendingToken = searchParams.get("pending");
  const missingEmail = searchParams.get("missingEmail") === "1";
  const missingFirstName = searchParams.get("missingFirstName") === "1";
  const missingLastName = searchParams.get("missingLastName") === "1";
  const reason = searchParams.get("reason");
  const isPendingFlow = useMemo(
    () => Boolean(pendingToken),
    [pendingToken]
  );

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

  if (shouldRedirectToRegister) {
    return (
      <main className={styles.container}>
        <p className={styles.text}>Redirection vers l'inscription...</p>
      </main>
    );
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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

        if (formData.pseudo) payload.pseudo = formData.pseudo;
        if (formData.bio) payload.bio = formData.bio;
        if (formData.profile_photo_url) {
          payload.profile_photo_url = formData.profile_photo_url;
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
    } catch (err: any) {
      const message = err.response?.data?.message ?? "Erreur lors de la mise à jour";
      toast.error(message);
    }
  };

  return (
    <main className={styles.container}>
      <h2 className={styles.title}>Finaliser votre profil</h2>
      <form className={styles.form} onSubmit={handleSubmit}>
        {isPendingFlow && missingEmail && (
          <input
            className={styles.input}
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        )}
        {isPendingFlow && missingFirstName && (
          <input
            className={styles.input}
            type="text"
            name="first_name"
            placeholder="Prénom"
            value={formData.first_name}
            onChange={handleChange}
            required
          />
        )}
        {isPendingFlow && missingLastName && (
          <input
            className={styles.input}
            type="text"
            name="last_name"
            placeholder="Nom"
            value={formData.last_name}
            onChange={handleChange}
            required
          />
        )}
        <input
          className={styles.input}
          type="text"
          name="country"
          placeholder="Pays"
          value={formData.country}
          onChange={handleChange}
          required
        />
        <input
          className={styles.input}
          type="text"
          name="city"
          placeholder="Ville"
          value={formData.city}
          onChange={handleChange}
          required
        />
        <input
          className={styles.input}
          type="date"
          name="birth_date"
          placeholder="Date de naissance"
          value={formData.birth_date}
          onChange={handleChange}
          required
        />
        <button
          type="button"
          className={styles.optionalToggle}
          onClick={() => setShowOptional((prev) => !prev)}
        >
          {showOptional ? "Masquer les champs optionnels" : "Afficher les champs optionnels"}
          <span className={showOptional ? styles.chevronUp : styles.chevronDown}>▾</span>
        </button>

        {showOptional && (
          <div className={styles.optionalBlock}>
            <input
              className={styles.input}
              type="text"
              name="pseudo"
              placeholder="Pseudo (optionnel)"
              value={formData.pseudo}
              onChange={handleChange}
            />
            <input
              className={styles.input}
              type="url"
              name="profile_photo_url"
              placeholder="Photo de profil (URL)"
              value={formData.profile_photo_url}
              onChange={handleChange}
            />
            <textarea
              className={styles.textarea}
              name="bio"
              placeholder="Bio (optionnel)"
              value={formData.bio}
              onChange={handleChange}
              rows={4}
            />
          </div>
        )}
        <button className={styles.button} type="submit">
          Terminer
        </button>
      </form>
    </main>
  );
}
