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
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Une erreur est survenue. Réessaie plus tard.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.container}>
      <h2 className={styles.title}>Mot de passe oublié</h2>

      <form className={styles.form} onSubmit={onSubmit}>
        <input
          className={styles.input}
          type="email"
          placeholder="Ton email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {error && <p className={styles.error}>{error}</p>}
        <button className={styles.button} type="submit" disabled={loading}>
          {loading ? "Envoi..." : "Envoyer"}
        </button>
        <Link href="/connexion" className={styles.link}>
          Retour à la connexion
        </Link>
      </form>
    </main>
  );
}