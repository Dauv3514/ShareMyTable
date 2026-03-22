"use client";

import { useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import styles from "./nouveau-mot-de-passe.module.scss";

export default function ResetPasswordPage() {
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
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Token invalide ou expiré.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.resetContainer}>
      <h2 className={styles.resetTitle}>Réinitialiser le mot de passe</h2>

      <form className={styles.resetForm} onSubmit={onSubmit}>
        <input
          className={styles.resetInput}
          type="password"
          placeholder="Nouveau mot de passe"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <input
          className={styles.resetInput}
          type="password"
          placeholder="Confirmer le mot de passe"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        {error && <p className={styles.resetError}>{error}</p>}
        <button className={styles.resetButton} type="submit" disabled={loading}>
          {loading ? "Envoi..." : "Confirmer"}
        </button>
        <Link href="/connexion" className={styles.resetLink}>
          Retour à la connexion
        </Link>
      </form>
    </main>
  );
}