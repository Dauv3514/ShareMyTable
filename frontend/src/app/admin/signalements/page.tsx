"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Flag,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "../../providers/AuthProvider";
import {
  AdminReportItem,
  fetchAdminReports,
  getReportErrorMessage,
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_TARGET_TYPE_LABELS,
} from "@/lib/reports";
import styles from "../admin.module.scss";

function getStatusClass(status: AdminReportItem["status"]) {
  if (status === "resolved") {
    return styles.badgeOk;
  }

  if (status === "dismissed") {
    return styles.badgeSoft;
  }

  if (status === "in_review") {
    return styles.badgeWarn;
  }

  return styles.badgeDanger;
}

function getTargetHref(report: AdminReportItem) {
  if (report.targetType === "user" || report.targetType === "meal") {
    return report.target.href;
  }

  return null;
}

export default function AdminReportsPage() {
  const router = useRouter();
  const { isLoggedIn, loading, user } = useAuth();
  const [reports, setReports] = useState<AdminReportItem[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/connexion");
      return;
    }

    if (!loading && isLoggedIn && user?.role !== "ADMIN") {
      router.replace("/profil");
    }
  }, [isLoggedIn, loading, router, user?.role]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [],
  );

  const loadReports = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    try {
      setIsLoadingReports(true);
      setReports(await fetchAdminReports(token));
    } catch (error: unknown) {
      toast.error(getReportErrorMessage(error));
    } finally {
      setIsLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn || user?.role !== "ADMIN") {
      return;
    }

    void loadReports();
  }, [isLoggedIn, loadReports, user?.role]);

  const pendingReports = reports.filter((report) => report.status === "pending");
  const activeReports = reports.filter((report) =>
    ["pending", "in_review"].includes(report.status),
  );
  const closedReports = reports.filter((report) =>
    ["resolved", "dismissed"].includes(report.status),
  );

  if (loading || isLoadingReports || (!user && isLoggedIn)) {
    return (
      <section className={styles.page}>
        <div className={styles.loadingCard}>
          <p>Chargement des signalements...</p>
        </div>
      </section>
    );
  }

  if (!isLoggedIn || user?.role !== "ADMIN") {
    return null;
  }

  return (
    <section className={styles.page}>
      <div className={styles.layout}>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.kicker}>Administration</span>
            <h1>Signalements utilisateurs</h1>
            <p>
              Consulte les signalements envoyés par les utilisateurs, identifie
              rapidement la cible concernée et priorise les cas à traiter.
            </p>

            <div className={styles.adminLinks}>
              <Link href="/admin">Demandes hôte</Link>
              <span aria-current="page">Signalements</span>
            </div>
          </div>

          <div className={styles.heroStats}>
            <article className={styles.statCard}>
              <span>À traiter</span>
              <strong>{pendingReports.length}</strong>
            </article>
            <article className={styles.statCard}>
              <span>Total signalements</span>
              <strong>{reports.length}</strong>
            </article>
          </div>
        </header>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Liste des signalements</h2>
              <p>
                Les plus récents apparaissent en premier. Les signalements
                clôturés restent visibles pour conserver l&apos;historique.
              </p>
            </div>
          </div>

          <div className={styles.reportStats}>
            <article>
              <Clock3 />
              <span>Ouverts</span>
              <strong>{activeReports.length}</strong>
            </article>
            <article>
              <CheckCircle2 />
              <span>Clôturés</span>
              <strong>{closedReports.length}</strong>
            </article>
            <article>
              <ShieldAlert />
              <span>Profils signalés</span>
              <strong>
                {reports.filter((report) => report.targetType === "user").length}
              </strong>
            </article>
          </div>

          {reports.length === 0 ? (
            <div className={styles.emptyState}>
              <Flag />
              <p>Aucun signalement pour le moment.</p>
            </div>
          ) : (
            <div className={styles.reportList}>
              {reports.map((report) => {
                const targetHref = getTargetHref(report);

                return (
                  <article key={report.id} className={styles.reportCard}>
                    <div className={styles.reportCardHead}>
                      <div>
                        <div className={styles.reportBadges}>
                          <span className={`${styles.badge} ${getStatusClass(report.status)}`}>
                            {REPORT_STATUS_LABELS[report.status]}
                          </span>
                          <span className={`${styles.badge} ${styles.badgeSoft}`}>
                            {REPORT_TARGET_TYPE_LABELS[report.targetType]}
                          </span>
                        </div>
                        <h3>{report.target.label}</h3>
                        {report.target.detail ? <p>{report.target.detail}</p> : null}
                      </div>

                      <time dateTime={report.createdAt}>
                        {dateFormatter.format(new Date(report.createdAt))}
                      </time>
                    </div>

                    <dl className={styles.reportDetails}>
                      <div>
                        <dt>Signalé par</dt>
                        <dd>
                          {report.reporter
                            ? `${report.reporter.displayName} (${report.reporter.email})`
                            : "Utilisateur introuvable"}
                        </dd>
                      </div>
                      <div>
                        <dt>Motif</dt>
                        <dd>{REPORT_REASON_LABELS[report.reason]}</dd>
                      </div>
                      <div>
                        <dt>Cible</dt>
                        <dd>
                          {REPORT_TARGET_TYPE_LABELS[report.targetType]} #{report.targetId}
                        </dd>
                      </div>
                      <div>
                        <dt>Dernière mise à jour</dt>
                        <dd>{dateFormatter.format(new Date(report.updatedAt))}</dd>
                      </div>
                    </dl>

                    <div className={styles.reportDescription}>
                      <strong>Description</strong>
                      <p>
                        {report.description ||
                          "Aucune description ajoutée par l'utilisateur."}
                      </p>
                    </div>

                    {report.target.conversation ? (
                      <div className={styles.reportDescription}>
                        <strong>Membres de la conversation</strong>
                        <p>
                          {report.target.conversation.members.length > 0
                            ? report.target.conversation.members
                                .map((member) => member.displayName)
                                .join(", ")
                            : "Aucun membre disponible."}
                        </p>
                      </div>
                    ) : null}

                    {targetHref ? (
                      <div className={styles.reportActions}>
                        <Link href={targetHref}>
                          Ouvrir la cible
                          <ExternalLink aria-hidden="true" />
                        </Link>
                      </div>
                    ) : (
                      <div className={styles.reportNotice}>
                        <AlertTriangle aria-hidden="true" />
                        <span>
                          Cette cible n&apos;a pas encore de page admin consultable.
                        </span>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
