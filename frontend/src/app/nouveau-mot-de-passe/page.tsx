"use client";

import { Suspense, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import styles from "./nouveau-mot-de-passe.module.scss";

function ResetPasswordPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Token manquant.");
      toast.error("Token manquant.");
      return;
    }

    if (newPassword !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }

    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      await axios.post(`${apiUrl}/auth/reset-password`, {
        token,
        new_password: newPassword,
      });

      toast.success("Mot de passe mis à jour");
      router.push("/connexion");
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || "Token invalide ou expiré."
        : "Token invalide ou expiré.";

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.container}>
      <div className={styles.shell}>
        <section className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2 className={styles.title}>Réinitialiser le mot de passe</h2>
          </div>

          <form className={styles.form} onSubmit={onSubmit}>
            <label className={styles.field}>
              <span>Nouveau mot de passe</span>
              <input
                className={styles.input}
                type="password"
                placeholder="Choisir un nouveau mot de passe"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </label>

            <label className={styles.field}>
              <span>Confirmer le mot de passe</span>
              <input
                className={styles.input}
                type="password"
                placeholder="Confirmer le nouveau mot de passe"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </label>

            {error && <p className={styles.error}>{error}</p>}

            <button className={styles.button} type="submit" disabled={loading}>
              {loading ? "Enregistrement..." : "Confirmer"}
            </button>

            <div className={styles.formMeta}>
              <Link href="/connexion" className={styles.link}>
                Retour à la connexion
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className={styles.container}>
          <div className={styles.shell}>
            <section className={styles.formCard}>
              <p className={styles.error}>Chargement...</p>
            </section>
          </div>
        </main>
      }
    >
      <ResetPasswordPageContent />
    </Suspense>
  );
}
