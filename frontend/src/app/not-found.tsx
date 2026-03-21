"use client";

import Link from "next/link";
import styles from "./notfound.module.css";

export default function NotFoundPage() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>404</h1>
      <p className={styles.message}>
        Oups… la page que vous cherchez n’existe pas ! 😅
      </p>
      <Link href="/" className={styles.link}>
        Retour à l’accueil
      </Link>
    </main>
  );
}