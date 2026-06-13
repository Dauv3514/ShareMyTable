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
import { PWA_INSTALL_NUDGE_EVENT } from "@/components/Pwa";
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
  homePhotoUrls: string[];
  validationStatus: "pending" | "approved" | "rejected";
  country: string;
  city: string;
  districtLabel: string;
  address: string;
  rejectionReason: string | null;
};

type HomePhotoPreview = {
  id: string;
  url: string;
  file?: File;
  isObjectUrl: boolean;
};

const MIN_HOME_PHOTOS = 2;
const MAX_HOME_PHOTOS = 5;
const MAX_HOME_PHOTO_SIZE_MB = 3;
const HOME_PHOTO_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];

export default function DevenirHotePage() {
  const router = useRouter();
  const { isLoggedIn, loading, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewObjectUrlsRef = useRef<string[]>([]);
  const [formData, setFormData] = useState<HostProfileFormState>({
    country: "",
    city: "",
    districtLabel: "",
    address: "",
  });
  const [hostProfile, setHostProfile] = useState<HostProfileResponse | null>(null);
  const [homePhotoPreviews, setHomePhotoPreviews] = useState<HomePhotoPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/connexion");
    }
  }, [isLoggedIn, loading, router]);

  useEffect(() => {
    return () => {
      previewObjectUrlsRef.current.forEach((previewUrl) => {
        URL.revokeObjectURL(previewUrl);
      });
      previewObjectUrlsRef.current = [];
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
        setHomePhotoPreviews(
          (response.data.homePhotoUrls?.length
            ? response.data.homePhotoUrls
            : response.data.homePhotoUrl
              ? [response.data.homePhotoUrl]
              : []
          ).map((url, index) => ({
            id: `existing-${index}-${url}`,
            url,
            isObjectUrl: false,
          })),
        );
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
          setHomePhotoPreviews([]);
        } else {
          toast.error("Impossible de charger le formulaire hôte pour le moment.");
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
        title: "Faire ma demande hôte",
        description:
          "Nous avons pré-rempli les informations déjà connues. Tu peux les ajuster avant l'envoi.",
        submitLabel: "Envoyer ma demande hôte",
      };
    }

    if (hostProfile.validationStatus === "rejected") {
      return {
        title: "Corriger ma demande hôte",
        description:
          hostProfile.rejectionReason?.trim() ||
          "Ta demande a été refusée. Corrige ton dossier, puis renvoie-le.",
        submitLabel: "Mettre à jour et renvoyer",
      };
    }

    if (hostProfile.validationStatus === "pending") {
      return {
        title: "Mettre à jour ma demande hôte",
        description:
          "Ta demande est en attente. Tu peux encore ajuster les informations envoyées.",
        submitLabel: "Enregistrer mes modifications",
      };
    }

    return {
      title: "Profil hôte déjà valide",
      description:
        "Ton profil hôte est déjà approuvé. Tu peux créer des événements et modifier tes photos de logement depuis ton profil.",
      submitLabel: "Créer un événement",
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
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    const remainingSlots = MAX_HOME_PHOTOS - homePhotoPreviews.length;

    if (remainingSlots <= 0) {
      toast.error(`Tu peux importer au maximum ${MAX_HOME_PHOTOS} photos.`);
      event.target.value = "";
      return;
    }

    for (const file of files) {
      if (!HOME_PHOTO_MIME_TYPES.includes(file.type)) {
        toast.error("Les photos du logement doivent être en PNG, JPG, JPEG ou WebP.");
        event.target.value = "";
        return;
      }

      if (file.size > MAX_HOME_PHOTO_SIZE_MB * 1024 * 1024) {
        toast.error(
          `Chaque photo du logement ne doit pas dépasser ${MAX_HOME_PHOTO_SIZE_MB} Mo.`,
        );
        event.target.value = "";
        return;
      }
    }

    const filesToAdd = files.slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      toast.info(
        `Seules ${remainingSlots} photo${remainingSlots > 1 ? "s" : ""} ont été ajoutées pour rester dans la limite de ${MAX_HOME_PHOTOS}.`,
      );
    }

    const previewsToAdd = filesToAdd.map((file) => {
      const url = URL.createObjectURL(file);
      previewObjectUrlsRef.current.push(url);

      return {
        id: `${file.name}-${file.lastModified}-${url}`,
        url,
        file,
        isObjectUrl: true,
      };
    });

    setHomePhotoPreviews((previousPreviews) => [
      ...previousPreviews,
      ...previewsToAdd,
    ]);
    event.target.value = "";
  };

  const handleRemovePhoto = (photoIndex: number) => {
    setHomePhotoPreviews((previousPreviews) => {
      const removedPreview = previousPreviews[photoIndex];

      if (removedPreview?.isObjectUrl) {
        URL.revokeObjectURL(removedPreview.url);
        previewObjectUrlsRef.current = previewObjectUrlsRef.current.filter(
          (previewUrl) => previewUrl !== removedPreview.url,
        );
      }

      return previousPreviews.filter((_, index) => index !== photoIndex);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting || hostProfile?.validationStatus === "approved") {
      return;
    }

    if (homePhotoPreviews.length < MIN_HOME_PHOTOS) {
      toast.error(
        `Ajoute au moins ${MIN_HOME_PHOTOS} photos du logement pour envoyer la demande hôte.`,
      );
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

      const retainedPhotoUrls = homePhotoPreviews
        .filter((preview) => !preview.file)
        .map((preview) => preview.url);
      const newPhotoFiles = homePhotoPreviews
        .map((preview) => preview.file)
        .filter((file): file is File => Boolean(file));

      retainedPhotoUrls.forEach((photoUrl) => {
        payload.append("homePhotoUrls", photoUrl);
      });
      newPhotoFiles.forEach((file) => {
        payload.append("host_home_photo", file);
      });

      if (retainedPhotoUrls.length === 0 && newPhotoFiles.length === 0) {
        payload.append("homePhotoUrl", "");
      }

      if (!hostProfile) {
        await axios.post(`${apiUrl}/host-profiles/request`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        toast.success("Ta demande hôte a bien été envoyée.");
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

        toast.success("Ta demande hôte a été corrigée puis renvoyée.");
      } else {
        await axios.patch(`${apiUrl}/host-profiles/me`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        toast.success("Ta demande hôte a bien été mise à jour.");
      }

      window.dispatchEvent(new Event(PWA_INSTALL_NUDGE_EVENT));
      router.push("/profil");
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ?? "Impossible d'envoyer la demande hôte."
        : "Impossible d'envoyer la demande hôte.";

      toast.error(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || isLoading || (!user && isLoggedIn)) {
    return (
      <section className={styles.page}>
        <div className={styles.card}>
          <p className={styles.loading}>Chargement du formulaire hôte...</p>
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
              Profil hôte valide
            </span>
            <h1>{pageMeta.title}</h1>
            <p>{pageMeta.description}</p>
          </div>

          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => router.push("/mes-evenements/creer")}
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
                ? "Demande refusée"
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
            multiple
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
                Adresse complète
              </span>
              <input
                name="address"
                type="text"
                value={formData.address}
                onChange={handleChange}
                placeholder="Ex. 12 rue de la République"
                required
              />
            </label>
          </div>

          <div className={styles.uploadCard}>
            <div className={styles.uploadCopy}>
              <h2>Photos du logement</h2>
              <p>
                Ajoute entre {MIN_HOME_PHOTOS} et {MAX_HOME_PHOTOS} photos du logement.
                Elles serviront par défaut dans la section Chez l&apos;hôte de ton profil
                si ta demande est acceptée. Tu pourras les changer plus tard depuis ton profil.
                Formats acceptés : PNG, JPG, JPEG, WebP. Taille max :
                {" "}{MAX_HOME_PHOTO_SIZE_MB} Mo par photo.
              </p>
            </div>

            <div className={styles.uploadActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleSelectPhoto}
              >
                <Upload />
                {homePhotoPreviews.length > 0
                  ? "Ajouter des photos"
                  : "Importer des photos"}
              </button>

              {homePhotoPreviews.length > 0 ? (
                <div className={styles.photoGrid}>
                  {homePhotoPreviews.map((preview, index) => (
                    <div key={preview.id} className={styles.photoPreview}>
                      <span
                        className={styles.photoPreviewImage}
                        style={{ backgroundImage: `url("${preview.url}")` }}
                        aria-label={`Photo du logement ${index + 1}`}
                        role="img"
                      />
                      <button
                        type="button"
                        className={styles.photoRemoveButton}
                        onClick={() => handleRemovePhoto(index)}
                      >
                        Retirer
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.photoPlaceholder}>
                  Aucune photo du logement ajoutée
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
              disabled={isSubmitting || homePhotoPreviews.length < MIN_HOME_PHOTOS}
            >
              {isSubmitting ? "Envoi en cours..." : pageMeta.submitLabel}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
