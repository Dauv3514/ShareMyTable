"use client";

import axios from "axios";
import { ArrowLeft, Home, MapPin, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "react-toastify";
import { useAuth } from "../../providers/AuthProvider";
import styles from "./devenir-hote.module.scss";

type HostProfileFormState = {
  country: string;
  city: string;
  districtLabel: string;
  address: string;
};

type HostProfileResponse = {
  id: number;
  isActive: boolean;
  homePhotoUrl: string | null;
  validationStatus: "pending" | "approved" | "rejected";
  country: string;
  city: string;
  districtLabel: string;
  address: string;
  rejectionReason: string | null;
};

const MAX_HOME_PHOTO_SIZE_MB = 5;

export default function DevenirHotePage() {
  const router = useRouter();
  const { isLoggedIn, loading, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [formData, setFormData] = useState<HostProfileFormState>({
    country: "",
    city: "",
    districtLabel: "",
    address: "",
  });
  const [hostProfile, setHostProfile] = useState<HostProfileResponse | null>(null);
  const [homePhotoPreviewUrl, setHomePhotoPreviewUrl] = useState<string | null>(null);
  const [selectedHomePhotoFile, setSelectedHomePhotoFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/connexion");
    }
  }, [isLoggedIn, loading, router]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadHostProfile = async () => {
      if (!user || !isLoggedIn) {
        if (!cancelled) {
          setIsLoading(false);
        }
        return;
      }

      const token = localStorage.getItem("token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!token || !apiUrl) {
        if (!cancelled) {
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);

        const response = await axios.get<HostProfileResponse>(
          `${apiUrl}/host-profiles/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (cancelled) {
          return;
        }

        setHostProfile(response.data);
        setFormData({
          country: response.data.country ?? user.country ?? "",
          city: response.data.city ?? user.city ?? "",
          districtLabel: response.data.districtLabel ?? "",
          address: response.data.address ?? "",
        });
        setHomePhotoPreviewUrl(response.data.homePhotoUrl);
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        if (axios.isAxiosError(error) && error.response?.status === 404) {
          setHostProfile(null);
          setFormData({
            country: user.country ?? "",
            city: user.city ?? "",
            districtLabel: "",
            address: "",
          });
          setHomePhotoPreviewUrl(null);
        } else {
          toast.error("Impossible de charger le formulaire hote pour le moment.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadHostProfile();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, user]);

  const pageMeta = useMemo(() => {
    if (!hostProfile) {
      return {
        title: "Faire ma demande hote",
        description:
          "Nous avons pre-rempli les informations deja connues. Tu peux les ajuster avant l'envoi.",
        submitLabel: "Envoyer ma demande hote",
      };
    }

    if (hostProfile.validationStatus === "rejected") {
      return {
        title: "Corriger ma demande hote",
        description:
          hostProfile.rejectionReason?.trim() ||
          "Ta demande a ete refusee. Corrige ton dossier, puis renvoie-le.",
        submitLabel: "Mettre a jour et renvoyer",
      };
    }

    if (hostProfile.validationStatus === "pending") {
      return {
        title: "Mettre a jour ma demande hote",
        description:
          "Ta demande est en attente. Tu peux encore ajuster les informations envoyees.",
        submitLabel: "Enregistrer mes modifications",
      };
    }

    return {
      title: "Profil hote deja valide",
      description:
        "Ton profil hote est deja approuve. Tu peux desormais creer des repas.",
      submitLabel: "Creer un repas",
    };
  }, [hostProfile]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  };

  const handleSelectPhoto = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("La photo du logement doit etre en PNG, JPG, JPEG ou WebP.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_HOME_PHOTO_SIZE_MB * 1024 * 1024) {
      toast.error(
        `La photo du logement ne doit pas depasser ${MAX_HOME_PHOTO_SIZE_MB} Mo.`,
      );
      event.target.value = "";
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setSelectedHomePhotoFile(file);
    setHomePhotoPreviewUrl(previewUrl);
    event.target.value = "";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting || hostProfile?.validationStatus === "approved") {
      return;
    }

    const token = localStorage.getItem("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!token || !apiUrl) {
      toast.error("Session invalide. Reconnecte-toi.");
      router.push("/connexion");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = new FormData();
      payload.append("country", formData.country.trim());
      payload.append("city", formData.city.trim());
      payload.append("districtLabel", formData.districtLabel.trim());
      payload.append("address", formData.address.trim());

      if (selectedHomePhotoFile) {
        payload.append("host_home_photo", selectedHomePhotoFile);
      }

      if (!hostProfile) {
        await axios.post(`${apiUrl}/host-profiles/request`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        toast.success("Ta demande hote a bien ete envoyee.");
      } else if (hostProfile.validationStatus === "rejected") {
        await axios.patch(`${apiUrl}/host-profiles/me`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        await axios.patch(
          `${apiUrl}/host-profiles/me/resubmit`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        toast.success("Ta demande hote a ete corrigee puis renvoyee.");
      } else {
        await axios.patch(`${apiUrl}/host-profiles/me`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        toast.success("Ta demande hote a bien ete mise a jour.");
      }

      router.push("/profil");
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ?? "Impossible d'envoyer la demande hote."
        : "Impossible d'envoyer la demande hote.";

      toast.error(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || isLoading || (!user && isLoggedIn)) {
    return (
      <section className={styles.page}>
        <div className={styles.card}>
          <p className={styles.loading}>Chargement du formulaire hote...</p>
        </div>
      </section>
    );
  }

  if (!isLoggedIn || !user) {
    return null;
  }

  if (hostProfile?.validationStatus === "approved") {
    return (
      <section className={styles.page}>
        <div className={styles.card}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => router.push("/profil")}
          >
            <ArrowLeft />
            Retour au profil
          </button>

          <div className={styles.header}>
            <span className={`${styles.statusBadge} ${styles.statusApproved}`}>
              Profil hote valide
            </span>
            <h1>{pageMeta.title}</h1>
            <p>{pageMeta.description}</p>
          </div>

          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => router.push("/mes-repas/creer")}
            >
              {pageMeta.submitLabel}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => router.push("/profil")}
        >
          <ArrowLeft />
          Retour au profil
        </button>

        <div className={styles.header}>
          {hostProfile ? (
            <span
              className={`${styles.statusBadge} ${
                hostProfile.validationStatus === "rejected"
                  ? styles.statusRejected
                  : styles.statusPending
              }`}
            >
              {hostProfile.validationStatus === "rejected"
                ? "Demande refusee"
                : "Demande en attente"}
            </span>
          ) : (
            <span className={`${styles.statusBadge} ${styles.statusNeutral}`}>
              Nouvelle demande
            </span>
          )}

          <h1>{pageMeta.title}</h1>
          <p>{pageMeta.description}</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
            className={styles.hiddenInput}
            onChange={handlePhotoChange}
          />

          <div className={styles.grid}>
            <label className={styles.field}>
              <span>
                <MapPin />
                Pays
              </span>
              <input
                name="country"
                type="text"
                value={formData.country}
                onChange={handleChange}
                required
              />
            </label>

            <label className={styles.field}>
              <span>
                <MapPin />
                Ville
              </span>
              <input
                name="city"
                type="text"
                value={formData.city}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          <div className={styles.grid}>
            <label className={styles.field}>
              <span>
                <Home />
                Quartier ou secteur
              </span>
              <input
                name="districtLabel"
                type="text"
                value={formData.districtLabel}
                onChange={handleChange}
                placeholder="Ex. Centre-ville"
                required
              />
            </label>

            <label className={styles.field}>
              <span>
                <Home />
                Adresse complete
              </span>
              <input
                name="address"
                type="text"
                value={formData.address}
                onChange={handleChange}
                placeholder="Ex. 12 rue de la Republique"
                required
              />
            </label>
          </div>

          <div className={styles.uploadCard}>
            <div className={styles.uploadCopy}>
              <h2>Photo du logement</h2>
              <p>
                Optionnelle. Formats acceptes : PNG, JPG, JPEG, WebP. Taille max
                : {MAX_HOME_PHOTO_SIZE_MB} Mo.
              </p>
            </div>

            <div className={styles.uploadActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleSelectPhoto}
              >
                <Upload />
                {homePhotoPreviewUrl
                  ? "Changer la photo"
                  : "Importer une photo"}
              </button>

              {homePhotoPreviewUrl ? (
                <div className={styles.photoPreview}>
                  <img
                    src={homePhotoPreviewUrl}
                    alt="Apercu du logement"
                    className={styles.photoPreviewImage}
                  />
                </div>
              ) : (
                <div className={styles.photoPlaceholder}>
                  Aucune photo du logement ajoutee
                </div>
              )}
            </div>
          </div>

          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.ghostButton}
              onClick={() => router.push("/profil")}
            >
              Annuler
            </button>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Envoi en cours..." : pageMeta.submitLabel}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
