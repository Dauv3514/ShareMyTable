"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import styles from "./callback.module.scss";
import { toast } from "react-toastify";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const token = searchParams.get("token");
  const profileComplete = searchParams.get("profileComplete") === "true";
  const error = searchParams.get("error");

  useEffect(() => {
    if (error) {
      toast.error("Connexion avec Google échouée ❌");
      localStorage.removeItem("oauth_flow");
      router.replace("/inscription");
      return;
    }
    if (!token) return;
    login(token);

    if (profileComplete) {
      toast.success("Connexion avec Google réussie ✅");
    } else {
      toast.success("Inscription avec Google réussie ✅");
    }

    localStorage.removeItem("oauth_flow");
    router.replace(profileComplete ? "/" : "/complete-profile");
  }, [token, profileComplete, login, router]);

  return (
    <main className={styles.container}>
      {error && <p className={styles.error}>Connexion échouée.</p>}
      {!error && !token && <p className={styles.text}>Redirection en cours...</p>}
    </main>
  );
}
