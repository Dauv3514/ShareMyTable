"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import axios from "axios";
import styles from "./inscription.module.scss";
import Image from "next/image";
import Link from "next/link";

export default function InscriptionPage() {
  const [formData, setFormData] = useState({
    email: "",
    password_hash: "",
    first_name: "",
    last_name: "",
    pseudo: "",
    country: "",
    city: "",
    birth_date: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidEmail(formData.email)) {
      toast.error("Adresse email invalide 😅");
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      await axios.post(`${apiUrl}/auth/inscription`, formData);

      toast.success("Compte créé avec succès 🎉");

      setFormData({
        email: "",
        password_hash: "",
        first_name: "",
        last_name: "",
        pseudo: "",
        country: "",
        city: "",
        birth_date: "",
      });

    } catch (err: any) {
      let message = "Erreur inconnue 😅";

      if (err.response?.data?.message) {
        if (Array.isArray(err.response.data.message)) {
          message = err.response.data.message.join(", ");
        } else if (typeof err.response.data.message === "string") {
          message = err.response.data.message;
        }
      }

      toast.error(message);
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.logoWrapper}>
        <Image src="./globe.svg" alt="RamèneTaPoire Logo" width={120} height={120} />
      </div>

      <h2 className={styles.title}>Créez votre compte</h2>

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
        <input
          className={styles.input}
          type="text"
          name="first_name"
          placeholder="Prénom"
          value={formData.first_name}
          onChange={handleChange}
          required
        />
        <input
          className={styles.input}
          type="text"
          name="last_name"
          placeholder="Nom"
          value={formData.last_name}
          onChange={handleChange}
          required
        />
        <input
          className={styles.input}
          type="text"
          name="pseudo"
          placeholder="Pseudo"
          value={formData.pseudo}
          onChange={handleChange}
        />
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

        <button className={styles.button} type="submit">
          Inscription
        </button>
      </form>

      <p className={styles.bottomText}>
        Vous avez déjà un compte ?{" "}
        <Link href="/connexion" className={styles.link}>
          Connectez-vous !
        </Link>
      </p>
    </main>
  );
}