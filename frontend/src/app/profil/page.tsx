"use client";

import axios from "axios";
import { Camera, Mail, MapPin, Phone } from "lucide-react";
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
import UserAvatar from "@/components/UserAvatar";
import DatePickerField from "@/components/DatePicker";
import { useAuth } from "../providers/AuthProvider";
import styles from "./profil.module.scss";

type ProfileFormData = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  pseudo: string;
  country: string;
  city: string;
  bio: string;
  birth_date: string;
  profile_photo_url: string;
};

function toDateInputValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.includes("T") ? value.split("T")[0] : value;
}

export default function ProfilPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { isLoggedIn, loading, user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    pseudo: "",
    country: "",
    city: "",
    bio: "",
    birth_date: "",
    profile_photo_url: "",
  });

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/connexion");
    }
  }, [isLoggedIn, loading, router]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setFormData({
      first_name: user.firstName ?? "",
      last_name: user.lastName ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      pseudo: user.pseudo ?? "",
      country: user.country ?? "",
      city: user.city ?? "",
      bio: user.bio ?? "",
      birth_date: toDateInputValue(user.birthDate),
      profile_photo_url: user.profilePhotoUrl ?? "",
    });
  }, [user]);

  const fullName = useMemo(() => {
    return [formData.first_name, formData.last_name].filter(Boolean).join(" ").trim();
  }, [formData.first_name, formData.last_name]);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectPhoto = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Choisis une image valide.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        toast.error("Impossible de lire cette image.");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        profile_photo_url: reader.result as string,
      }));
    };

    reader.onerror = () => {
      toast.error("Impossible de charger cette image.");
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({
      ...prev,
      profile_photo_url: "",
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const token = localStorage.getItem("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!token || !apiUrl) {
      toast.error("Session invalide. Reconnecte-toi.");
      router.push("/connexion");
      return;
    }

    const payload: Record<string, string> = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      country: formData.country,
      city: formData.city,
      birth_date: formData.birth_date,
    };

    if (formData.phone.trim()) payload.phone = formData.phone.trim();
    if (formData.pseudo.trim()) payload.pseudo = formData.pseudo.trim();
    if (formData.bio.trim()) payload.bio = formData.bio.trim();
    if (formData.profile_photo_url.trim()) {
      payload.profile_photo_url = formData.profile_photo_url.trim();
    }

    try {
      setSaving(true);

      await axios.patch(`${apiUrl}/users/me`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await refreshUser();
      toast.success("Profil mis à jour");
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ?? "La mise à jour du profil a échoué."
        : "La mise à jour du profil a échoué.";
      toast.error(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || (!user && isLoggedIn)) {
    return (
      <section className={styles.page}>
        <div className={styles.card}>
          <p className={styles.loading}>Chargement du profil...</p>
        </div>
      </section>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.identityBlock}>
            <div className={styles.avatarWrap}>
              <div className={styles.avatarFrame}>
                <UserAvatar
                  src={formData.profile_photo_url}
                  alt="Photo de profil"
                  size={112}
                  priority
                />
              </div>

              <button
                type="button"
                className={styles.avatarEdit}
                onClick={handleSelectPhoto}
                aria-label="Modifier la photo de profil"
              >
                <Camera />
              </button>
            </div>

            <div className={styles.identityText}>
              <h1>{fullName || "Mon profil"}</h1>
              <p>{formData.email || "Compte connecté"}</p>
              <div className={styles.badges}>
                {formData.city && (
                  <span className={styles.badge}>
                    <MapPin />
                    {formData.city}
                  </span>
                )}
                {formData.phone && (
                  <span className={styles.badge}>
                    <Phone />
                    {formData.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleSelectPhoto}
            >
              {formData.profile_photo_url ? "Changer la photo" : "Ajouter une photo"}
            </button>

            {formData.profile_photo_url && (
              <button
                type="button"
                className={styles.textButton}
                onClick={handleRemovePhoto}
              >
                Retirer la photo
              </button>
            )}
          </div>
        </div>

        <div className={styles.separator} aria-hidden="true" />

        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className={styles.hiddenInput}
            onChange={handlePhotoChange}
          />

          <div className={styles.gridTwo}>
            <label className={styles.field}>
              <span>Prénom</span>
              <input
                name="first_name"
                type="text"
                value={formData.first_name}
                onChange={handleChange}
                required
              />
            </label>

            <label className={styles.field}>
              <span>Nom</span>
              <input
                name="last_name"
                type="text"
                value={formData.last_name}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          <label className={styles.field}>
            <span>
              <Mail />
              Email
            </span>
            <input
              name="email"
              type="email"
              value={formData.email}
              readOnly
              disabled
            />
            <small>L’email se modifie via un parcours dédié.</small>
          </label>

          <div className={styles.gridTwo}>
            <label className={styles.field}>
              <span>Téléphone</span>
              <input
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Ajouter un numéro"
              />
            </label>

            <label className={styles.field}>
              <span>Pseudo</span>
              <input
                name="pseudo"
                type="text"
                value={formData.pseudo}
                onChange={handleChange}
                placeholder="Choisir un pseudo"
              />
            </label>
          </div>

          <div className={styles.gridTwo}>
            <label className={styles.field}>
              <span>Pays</span>
              <input
                name="country"
                type="text"
                value={formData.country}
                onChange={handleChange}
                required
              />
            </label>

            <label className={styles.field}>
              <span>Ville</span>
              <input
                name="city"
                type="text"
                value={formData.city}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          <label className={styles.field}>
            <span>Date de naissance</span>
            <DatePickerField
              value={formData.birth_date}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  birth_date: value,
                }))
              }
              placeholder="Date de naissance"
              variant="input"
              ariaLabel="Choisir une date de naissance"
            />
          </label>

          <label className={styles.field}>
            <span>Bio</span>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={5}
              placeholder="Parle un peu de toi, de tes goûts, de ta cuisine..."
            />
          </label>

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => router.push("/")}
            >
              Retour
            </button>
            <button type="submit" className={styles.primaryButton} disabled={saving}>
              {saving ? "Enregistrement..." : "Sauvegarder"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}