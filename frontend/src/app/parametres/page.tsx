"use client";

import axios from "axios";
import { KeyRound, Lock, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../providers/AuthProvider";
import styles from "./parametres.module.scss";

type PasswordFormData = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

function getProviderLabel(provider: "local" | "google" | "apple" | null | undefined) {
  if (provider === "google") {
    return "Google";
  }

  if (provider === "apple") {
    return "Apple";
  }

  return "local";
}

export default function ParametresPage() {
  const router = useRouter();
  const { isLoggedIn, loading, user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<PasswordFormData>({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/connexion");
    }
  }, [isLoggedIn, loading, router]);

  const isLocalAccount = user?.authProvider === "local";
  const providerLabel = useMemo(() => getProviderLabel(user?.authProvider), [user?.authProvider]);

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
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ?? "La mise à jour du mot de passe a échoué."
        : "La mise à jour du mot de passe a échoué.";
      toast.error(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || (!user && isLoggedIn)) {
    return (
      <section className={styles.page}>
        <div className={styles.wrapper}>
          <p className={styles.loading}>Chargement des paramètres...</p>
        </div>
      </section>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <section className={styles.page}>
      <div className={styles.wrapper}>
        <div className={styles.heading}>
          <p className={styles.kicker}>Paramètres</p>
          <h1>Sécurité du compte</h1>
          <p className={styles.description}>
            Gère ici ton accès au compte et la méthode de connexion associée.
          </p>
        </div>

        <div className={styles.grid}>
          <aside className={styles.summaryCard}>
            <div className={styles.summaryIcon}>
              <ShieldCheck />
            </div>
            <h2>Connexion</h2>
            <p>
              Fournisseur actuel : <strong>{providerLabel}</strong>
            </p>
            <p>{user?.email ?? ""}</p>
          </aside>

          <div className={styles.panel}>
            {isLocalAccount ? (
              <>
                <div className={styles.panelHead}>
                  <div className={styles.panelBadge}>
                    <KeyRound />
                  </div>
                  <div>
                    <h2>Changer le mot de passe</h2>
                    <p>
                      Renseigne ton mot de passe actuel, puis choisis-en un nouveau.
                    </p>
                  </div>
                </div>

                <form className={styles.form} onSubmit={handleSubmit}>
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

                  <div className={styles.formFooter}>
                    <p className={styles.hint}>
                      Minimum 8 caractères. Choisis un mot de passe différent de l’ancien.
                    </p>
                    <button
                      type="submit"
                      className={styles.primaryButton}
                      disabled={saving}
                    >
                      {saving ? "Enregistrement..." : "Mettre à jour"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className={styles.oauthState}>
                <div className={styles.panelHead}>
                  <div className={styles.panelBadge}>
                    <Lock />
                  </div>
                  <div>
                    <h2>Mot de passe géré par {providerLabel}</h2>
                    <p>
                      Ton compte est connecté via {providerLabel}. Le mot de passe se
                      gère auprès de ce fournisseur.
                    </p>
                  </div>
                </div>

                <div className={styles.infoCard}>
                  <p>
                    Si tu veux modifier ton accès, fais-le directement depuis ton compte{" "}
                    {providerLabel}.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}