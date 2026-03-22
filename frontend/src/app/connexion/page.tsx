"use client";

import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import styles from "./connexion.module.scss";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";

export default function ConnexionPage() {
  const router = useRouter();
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await axios.post(`${apiUrl}/auth/connexion`, formData);

      // 🔐 sauvegarde du token
      login(res.data.access_token);

      toast.success("Connexion réussie 🎾🔥");
      router.push("/");

    } catch (err: any) {
      let message = "Email ou mot de passe incorrect";

      if (err.response?.data?.message) {
        message = err.response.data.message;
      }

      toast.error(message);
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.logoWrapper}>
        <Image
          src="/globe.svg"
          alt="RamèneTaPoire Logo"
          width={120}
          height={120}
        />
      </div>

      <h2 className={styles.title}>Se connecter</h2>

      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <input
          className={styles.input}
          type="password"
          name="password_hash"
          placeholder="Mot de passe"
          value={formData.password_hash}
          onChange={handleChange}
          required
        />

        <Link href="/mot-de-passe-oublie" className={styles.forgotLink}>
          Mot de passe oublié ?
        </Link>

        <button className={styles.button} type="submit">
          Connexion
        </button>
      </form>

      <p className={styles.bottomText}>
        Vous n’avez pas de compte ?{" "}
        <Link href="/inscription" className={styles.link}>
          Je m’inscris !
        </Link>
      </p>
    </main>
  );
}
