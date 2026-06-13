"use client";

import { FormEvent, useMemo, useState } from "react";
import { Flag, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  getReportErrorMessage,
  REPORT_REASON_OPTIONS,
  ReportReason,
  submitReport,
} from "@/lib/reports";
import styles from "./public-profile.module.scss";

type ReportProfileButtonProps = {
  targetUserId: string;
  profileName: string;
};

export default function ReportProfileButton({
  targetUserId,
  profileName,
}: ReportProfileButtonProps) {
  const router = useRouter();
  const { isLoggedIn, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("inappropriate_behavior");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const numericTargetUserId = useMemo(
    () => Number.parseInt(targetUserId, 10),
    [targetUserId],
  );
  const isOwnProfile =
    isLoggedIn &&
    user?.id !== undefined &&
    user.id === numericTargetUserId;

  const openReportModal = () => {
    if (!isLoggedIn) {
      toast.info("Connecte-toi pour signaler ce profil.");
      router.push("/connexion");
      return;
    }

    if (isOwnProfile) {
      toast.info("Tu ne peux pas signaler ton propre profil.");
      return;
    }

    setIsOpen(true);
  };

  const closeReportModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const token = window.localStorage.getItem("token");

    if (!token) {
      toast.info("Connecte-toi pour signaler ce profil.");
      router.push("/connexion");
      return;
    }

    if (!Number.isInteger(numericTargetUserId) || numericTargetUserId < 1) {
      toast.error("Profil impossible à signaler.");
      return;
    }

    try {
      setIsSubmitting(true);
      await submitReport(token, {
        targetType: "user",
        targetId: numericTargetUserId,
        reason,
        description,
      });

      toast.success("Signalement envoyé. Merci pour ton retour.");
      setIsOpen(false);
      setReason("inappropriate_behavior");
      setDescription("");
    } catch (error) {
      toast.error(getReportErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={styles.reportButton}
        onClick={openReportModal}
      >
        <Flag aria-hidden="true" />
        <span>Signaler ce profil</span>
      </button>

      {isOpen && (
        <div
          className={styles.reportModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-profile-title"
        >
          <button
            type="button"
            className={styles.reportBackdrop}
            aria-label="Fermer le signalement"
            onClick={closeReportModal}
          />

          <form className={styles.reportSheet} onSubmit={handleSubmit}>
            <header className={styles.reportHeader}>
              <div>
                <p>Signalement</p>
                <h2 id="report-profile-title">Signaler {profileName}</h2>
              </div>

              <button
                type="button"
                className={styles.reportClose}
                onClick={closeReportModal}
                disabled={isSubmitting}
                aria-label="Fermer"
              >
                <X aria-hidden="true" />
              </button>
            </header>

            <div className={styles.reportContent}>
              <label className={styles.reportField}>
                <span>Raison du signalement</span>
                <select
                  value={reason}
                  onChange={(event) => setReason(event.target.value as ReportReason)}
                  disabled={isSubmitting}
                >
                  {REPORT_REASON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.reportField}>
                <span>Détails</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={isSubmitting}
                  maxLength={2000}
                  placeholder="Explique brièvement ce qui pose problème."
                />
              </label>

              <p className={styles.reportHint}>
                Le signalement est privé et sera consulté par l&apos;équipe de modération.
              </p>
            </div>

            <footer className={styles.reportFooter}>
              <button
                type="button"
                className={styles.reportSecondary}
                onClick={closeReportModal}
                disabled={isSubmitting}
              >
                Annuler
              </button>

              <button
                type="submit"
                className={styles.reportSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Envoi..." : "Envoyer le signalement"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </>
  );
}
