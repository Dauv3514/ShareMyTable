"use client";

import { useState } from "react";
import axios from "axios";
import Link from "next/link";
import { toast } from "react-toastify";
import styles from "./mot-de-passe-oublie.module.scss";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      await axios.post(`${apiUrl}/auth/forgot-password`, { email });
      toast.success(
        "Si cet email existe, un lien de réinitialisation a été envoyé."
      );
      setEmail("");
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || "Une erreur est survenue. Réessaie plus tard."
        : "Une erreur est survenue. Réessaie plus tard.";
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
            <h2 className={styles.title}>Mot de passe oublié</h2>
            <p className={styles.subtitle}>
              Saisis l&apos;adresse email associée à ton compte.
            </p>
          </div>

          <form className={styles.form} onSubmit={onSubmit}>
            <label className={styles.field}>
              <span>Email</span>
              <input
                className={styles.input}
                type="email"
                placeholder="exemple@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            {error && <p className={styles.error}>{error}</p>}

            <button className={styles.button} type="submit" disabled={loading}>
              {loading ? "Envoi..." : "Envoyer le lien"}
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