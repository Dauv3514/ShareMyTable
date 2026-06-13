"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./public-profile.module.scss";

type HomePhotoGalleryProps = {
  homeTitle: string;
  photos: string[];
};

export default function HomePhotoGallery({
  homeTitle,
  photos,
}: HomePhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activePhoto = activeIndex === null ? null : photos[activeIndex];
  const hasMultiplePhotos = photos.length > 1;

  const closeLightbox = () => {
    setActiveIndex(null);
  };

  const showPreviousPhoto = () => {
    setActiveIndex((currentIndex) => {
      if (currentIndex === null) {
        return currentIndex;
      }

      return currentIndex === 0 ? photos.length - 1 : currentIndex - 1;
    });
  };

  const showNextPhoto = () => {
    setActiveIndex((currentIndex) => {
      if (currentIndex === null) {
        return currentIndex;
      }

      return currentIndex === photos.length - 1 ? 0 : currentIndex + 1;
    });
  };

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveIndex(null);
      }

      if (event.key === "ArrowLeft") {
        setActiveIndex((currentIndex) => {
          if (currentIndex === null) {
            return currentIndex;
          }

          return currentIndex === 0 ? photos.length - 1 : currentIndex - 1;
        });
      }

      if (event.key === "ArrowRight") {
        setActiveIndex((currentIndex) => {
          if (currentIndex === null) {
            return currentIndex;
          }

          return currentIndex === photos.length - 1 ? 0 : currentIndex + 1;
        });
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, photos.length]);

  return (
    <>
      <div className={styles.homeGallery} aria-label={homeTitle}>
        {photos.map((photoSrc, index) => (
          <span
            key={`${photoSrc}-${index}`}
            role="button"
            tabIndex={0}
            className={styles.homePhotoButton}
            onClick={() => setActiveIndex(index)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setActiveIndex(index);
              }
            }}
            aria-label={`Ouvrir ${homeTitle} ${index + 1} en grand`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoSrc}
              alt={`${homeTitle} ${index + 1}`}
              className={styles.homePhoto}
            />
          </span>
        ))}
      </div>

      {activePhoto ? (
        <div
          className={styles.photoLightbox}
          role="dialog"
          aria-modal="true"
          aria-label={`${homeTitle} en grand`}
        >
          <button
            type="button"
            className={styles.photoLightboxBackdrop}
            aria-label="Fermer l'image"
            onClick={closeLightbox}
          />

          <div className={styles.photoLightboxContent}>
            <button
              type="button"
              className={styles.photoLightboxClose}
              onClick={closeLightbox}
              aria-label="Fermer"
            >
              <X aria-hidden="true" />
            </button>

            {hasMultiplePhotos ? (
              <button
                type="button"
                className={`${styles.photoLightboxNav} ${styles.photoLightboxPrev}`}
                onClick={showPreviousPhoto}
                aria-label="Photo précédente"
              >
                <ChevronLeft aria-hidden="true" />
              </button>
            ) : null}

            <figure className={styles.photoLightboxFigure}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activePhoto}
                alt={`${homeTitle} ${(activeIndex ?? 0) + 1}`}
                className={styles.photoLightboxImage}
              />
              <figcaption>
                {(activeIndex ?? 0) + 1}/{photos.length}
              </figcaption>
            </figure>

            {hasMultiplePhotos ? (
              <button
                type="button"
                className={`${styles.photoLightboxNav} ${styles.photoLightboxNext}`}
                onClick={showNextPhoto}
                aria-label="Photo suivante"
              >
                <ChevronRight aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
