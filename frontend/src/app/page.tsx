"use client";

import Link from "next/link";
import { useAuth } from "./providers/AuthProvider";
import SearchBar from "../components/SearchBar";
import styles from "./page.module.scss";

export default function Home() {
  const { isLoggedIn } = useAuth();

  return (
    <div className={styles.page}>
      {!isLoggedIn && (
        <section className={styles.heroCard}>
          <div className={styles.heroContent}>
            <h1>Ramène ta poire !</h1>
            <p>On passe à table</p>
            <div className={styles.heroActions}>
              <Link className={styles.btnGhost} href="/connexion">
                Connexion
              </Link>
              <Link className={styles.btnPrimary} href="/inscription">
                S'inscrire
              </Link>
            </div>
          </div>
        </section>
      )}

      <SearchBar />
    </div>
  );
}
