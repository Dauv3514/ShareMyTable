"use client";

import axios from "axios";
import { Check, Clock3, ShieldCheck, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../providers/AuthProvider";
import styles from "./admin.module.scss";

type PendingHostRequest = {
  id: number;
  isActive: boolean;
  validationStatus: "pending" | "approved" | "rejected";
  hostLevel: number;
  country: string;
  city: string;
  districtLabel: string;
  address: string;
  addressVerified: boolean;
  homePhotoVerified: boolean;
  verificationScore: number;
  autoReviewNotes: string | null;
  rejectionReason: string | null;
  verificationRiskFlags: string[];
  manualReviewRequired: boolean;
  user: {
    userId: number;
    pseudo: string | null;
    email: string;
  };
};

type HostReviewHistoryItem = {
  id: number;
  decision: "approved" | "rejected";
  rejectionReason: string | null;
  reviewedAt: string;
  admin: {
    userId: number;
    pseudo: string | null;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  applicant: {
    userId: number;
    pseudo: string | null;
    email: string;
  };
  hostProfile: {
    id: number;
    country: string;
    city: string;
    districtLabel: string;
    address: string;
  };
};

export default function AdminPage() {
  const router = useRouter();
  const { isLoggedIn, loading, user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<PendingHostRequest[]>([]);
  const [history, setHistory] = useState<HostReviewHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [rejectionDrafts, setRejectionDrafts] = useState<Record<number, string>>({});

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

  const loadAdminData = useCallback(async () => {
    const token = localStorage.getItem("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!token || !apiUrl) {
      return;
    }

    try {
      setIsLoading(true);

      const [pendingResponse, historyResponse] = await Promise.all([
        axios.get<PendingHostRequest[]>(`${apiUrl}/host-profiles/pending`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        axios.get<HostReviewHistoryItem[]>(`${apiUrl}/host-profiles/history`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      setPendingRequests(pendingResponse.data);
      setHistory(historyResponse.data);
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ?? "Impossible de charger l'espace admin."
        : "Impossible de charger l'espace admin.";

      toast.error(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn || user?.role !== "ADMIN") {
      return;
    }

    void loadAdminData();
  }, [isLoggedIn, loadAdminData, user?.role]);

  const handleApprove = async (hostProfileId: number) => {
    const token = localStorage.getItem("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!token || !apiUrl) {
      return;
    }

    try {
      setActionId(hostProfileId);

      await axios.patch(
        `${apiUrl}/host-profiles/${hostProfileId}/approve`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      toast.success("Demande hote approuvee.");
      await loadAdminData();
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ?? "Impossible d'approuver la demande."
        : "Impossible d'approuver la demande.";

      toast.error(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (hostProfileId: number) => {
    const token = localStorage.getItem("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const rejectionReason = rejectionDrafts[hostProfileId]?.trim();

    if (!token || !apiUrl) {
      return;
    }

    if (!rejectionReason) {
      toast.error("Ajoute une raison de refus avant de rejeter la demande.");
      return;
    }

    try {
      setActionId(hostProfileId);

      await axios.patch(
        `${apiUrl}/host-profiles/${hostProfileId}/reject`,
        { rejectionReason },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      toast.success("Demande hote rejetee.");
      setRejectionDrafts((previousDrafts) => {
        const nextDrafts = { ...previousDrafts };
        delete nextDrafts[hostProfileId];
        return nextDrafts;
      });
      await loadAdminData();
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ?? "Impossible de rejeter la demande."
        : "Impossible de rejeter la demande.";

      toast.error(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setActionId(null);
    }
  };

  if (loading || isLoading || (!user && isLoggedIn)) {
    return (
      <section className={styles.page}>
        <div className={styles.loadingCard}>
          <p>Chargement de l&apos;administration...</p>
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
            <h1>Moderation des demandes hote</h1>
            <p>
              Valide ou refuse les candidatures en attente, puis retrouve tout
              l&apos;historique des decisions et l&apos;admin qui les a prises.
            </p>
          </div>

          <div className={styles.heroStats}>
            <article className={styles.statCard}>
              <span>Demandes en attente</span>
              <strong>{pendingRequests.length}</strong>
            </article>
            <article className={styles.statCard}>
              <span>Decisions historisees</span>
              <strong>{history.length}</strong>
            </article>
          </div>
        </header>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Demandes en attente</h2>
              <p>Ce sont les candidatures a traiter maintenant.</p>
            </div>
          </div>

          {pendingRequests.length === 0 ? (
            <div className={styles.emptyState}>
              <Clock3 />
              <p>Aucune demande en attente pour le moment.</p>
            </div>
          ) : (
            <div className={styles.requestGrid}>
              {pendingRequests.map((request) => (
                <article key={request.id} className={styles.requestCard}>
                  <div className={styles.requestHead}>
                    <div>
                      <span className={styles.requestApplicant}>
                        {request.user.pseudo || request.user.email}
                      </span>
                      <p>{request.user.email}</p>
                    </div>

                    <span
                      className={`${styles.badge} ${
                        request.addressVerified ? styles.badgeOk : styles.badgeWarn
                      }`}
                    >
                      {request.addressVerified
                        ? "Adresse verifiee"
                        : "Adresse a verifier"}
                    </span>
                  </div>

                  <dl className={styles.requestDetails}>
                    <div>
                      <dt>Adresse</dt>
                      <dd>{request.address}</dd>
                    </div>
                    <div>
                      <dt>Quartier</dt>
                      <dd>{request.districtLabel}</dd>
                    </div>
                    <div>
                      <dt>Ville</dt>
                      <dd>
                        {request.city}, {request.country}
                      </dd>
                    </div>
                    <div>
                      <dt>Score auto</dt>
                      <dd>{request.verificationScore}/100</dd>
                    </div>
                  </dl>

                  <div className={styles.flagList}>
                    {request.verificationRiskFlags.length === 0 ? (
                      <span className={`${styles.badge} ${styles.badgeSoft}`}>
                        Aucun risque detecte
                      </span>
                    ) : (
                      request.verificationRiskFlags.map((riskFlag) => (
                        <span
                          key={riskFlag}
                          className={`${styles.badge} ${styles.badgeSoft}`}
                        >
                          {riskFlag}
                        </span>
                      ))
                    )}
                  </div>

                  <div className={styles.notesBox}>
                    <strong>Notes automatiques</strong>
                    <p>{request.autoReviewNotes || "Aucune note automatique."}</p>
                  </div>

                  <label className={styles.reasonField}>
                    <span>Raison de refus</span>
                    <textarea
                      value={rejectionDrafts[request.id] ?? ""}
                      onChange={(event) =>
                        setRejectionDrafts((previousDrafts) => ({
                          ...previousDrafts,
                          [request.id]: event.target.value,
                        }))
                      }
                      rows={4}
                      placeholder="Explique clairement au candidat ce qu&apos;il doit corriger."
                    />
                  </label>

                  <div className={styles.requestActions}>
                    <button
                      type="button"
                      className={styles.rejectButton}
                      onClick={() => void handleReject(request.id)}
                      disabled={actionId === request.id}
                    >
                      <XCircle />
                      Refuser
                    </button>
                    <button
                      type="button"
                      className={styles.approveButton}
                      onClick={() => void handleApprove(request.id)}
                      disabled={actionId === request.id}
                    >
                      <Check />
                      Accepter
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Historique des decisions</h2>
              <p>Retrouve les demandes acceptees ou refusees et l&apos;admin responsable.</p>
            </div>
          </div>

          {history.length === 0 ? (
            <div className={styles.emptyState}>
              <ShieldCheck />
              <p>Aucune decision admin n&apos;a encore ete historisee.</p>
            </div>
          ) : (
            <div className={styles.historyList}>
              {history.map((entry) => (
                <article key={entry.id} className={styles.historyCard}>
                  <div className={styles.historyHead}>
                    <div>
                      <span
                        className={`${styles.badge} ${
                          entry.decision === "approved"
                            ? styles.badgeOk
                            : styles.badgeDanger
                        }`}
                      >
                        {entry.decision === "approved" ? "Acceptee" : "Refusee"}
                      </span>
                      <h3>{entry.applicant.pseudo || entry.applicant.email}</h3>
                    </div>

                    <time dateTime={entry.reviewedAt}>
                      {dateFormatter.format(new Date(entry.reviewedAt))}
                    </time>
                  </div>

                  <dl className={styles.historyDetails}>
                    <div>
                      <dt>Demandeur</dt>
                      <dd>{entry.applicant.email}</dd>
                    </div>
                    <div>
                      <dt>Adresse</dt>
                      <dd>
                        {entry.hostProfile.address}, {entry.hostProfile.city}
                      </dd>
                    </div>
                    <div>
                      <dt>Quartier</dt>
                      <dd>{entry.hostProfile.districtLabel}</dd>
                    </div>
                    <div>
                      <dt>Decision prise par</dt>
                      <dd>
                        {entry.admin
                          ? `${entry.admin.firstName} ${entry.admin.lastName} (${entry.admin.email})`
                          : "Admin introuvable"}
                      </dd>
                    </div>
                  </dl>

                  {entry.decision === "rejected" && entry.rejectionReason ? (
                    <div className={styles.historyReason}>
                      <strong>Motif de refus</strong>
                      <p>{entry.rejectionReason}</p>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
