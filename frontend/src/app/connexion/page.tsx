"use client";

import { Suspense, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import styles from "./connexion.module.scss";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import { buildPublicApiUrl } from "@/lib/api-url";

function ConnexionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password_hash: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const authUrl = buildPublicApiUrl("/auth/connexion");
      if (!authUrl) {
        toast.error("API_URL manquante");
        return;
      }

      const res = await axios.post(authUrl, formData);

      // 🔐 sauvegarde du token
      login(res.data.access_token);

      toast.success("Connexion réussie !");
      router.push("/");

    } catch (err: unknown) {
      let message = "Email ou mot de passe incorrect";

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

  useEffect(() => {
    const verify = searchParams.get("verify");
    const verified = searchParams.get("verified");
    const verifyError = searchParams.get("verifyError");

    if (verify === "1") {
      toast.info("Vérifie ton email pour activer ton compte.");
      localStorage.removeItem("oauth_flow");
    }

    if (verified === "1") {
      toast.success("Email vérifié, tu peux maintenant te connecter.");
      localStorage.removeItem("oauth_flow");
    }

    if (verifyError === "1") {
      toast.error("Lien de vérification invalide ou expiré.");
      localStorage.removeItem("oauth_flow");
    }
  }, [searchParams]);

  const handleOAuth = (provider: "google" | "apple") => {
    const authUrl = buildPublicApiUrl(`/auth/${provider}?flow=login`);
    if (!authUrl) {
      toast.error("API_URL manquante");
      return;
    }
    localStorage.setItem("oauth_flow", "login");
    window.location.href = authUrl;
  };

  return (
    <main className={styles.container}>
      <div className={styles.shell}>
        <section className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2 className={styles.title}>Se connecter</h2>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
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
                placeholder="Votre mot de passe"
                value={formData.password_hash}
                onChange={handleChange}
                required
              />
            </label>

            <div className={styles.formMeta}>
              <Link href="/mot-de-passe-oublie" className={styles.forgotLink}>
                Mot de passe oublié ?
              </Link>
            </div>

            <button className={styles.button} type="submit">
              Connexion
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
            Vous n’avez pas de compte ?{" "}
            <Link href="/inscription" className={styles.link}>
              Je m’inscris !
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

export default function ConnexionPage() {
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
      <ConnexionPageContent />
    </Suspense>
  );
}
