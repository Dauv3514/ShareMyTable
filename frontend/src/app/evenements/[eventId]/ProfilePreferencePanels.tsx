"use client";

import { useMemo, useSyncExternalStore } from "react";
import styles from "./event-detail.module.scss";

const PROFILE_DIETARY_STORAGE_PREFIX = "profile:dietary-preferences:v3";

const normalizePreferenceTag = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, " ");

const readStoredPreferenceTags = (storageKey: string) => {
  const storedPreferences = window.localStorage.getItem(storageKey);

  if (!storedPreferences) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedPreferences);

    if (!Array.isArray(parsed)) {
      return null;
    }

    const cleaned = parsed
      .map((item) => (typeof item === "string" ? normalizePreferenceTag(item) : ""))
      .filter(Boolean);

    return cleaned;
  } catch {
    return null;
  }
};

const uniqueTags = (tags: string[]) => Array.from(new Set(tags.filter(Boolean)));
const subscribeToNothing = () => () => {};

export function EventProfileFilters({
  hostProfileId,
  fallbackTags,
}: {
  hostProfileId: string;
  fallbackTags: string[];
}) {
  const isHydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const displayTags = useMemo(() => {
    if (!isHydrated) {
      return fallbackTags;
    }

    const dietaryTags = readStoredPreferenceTags(
      `${PROFILE_DIETARY_STORAGE_PREFIX}:${hostProfileId}`,
    );
    const profileTags = uniqueTags(dietaryTags ?? []);

    return profileTags.length > 0 ? profileTags : fallbackTags;
  }, [fallbackTags, hostProfileId, isHydrated]);

  return (
    <div className={styles.filters}>
      {displayTags.map((filter) => (
        <span key={filter} className={styles.filterChip}>
          {filter}
        </span>
      ))}
    </div>
  );
}

export function EventDietaryPreferenceSection({
  hostProfileId,
  fallbackTags,
}: {
  hostProfileId: string;
  fallbackTags: string[];
}) {
  const isHydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const visibleDietaryTags = useMemo(() => {
    if (!isHydrated) {
      return uniqueTags(fallbackTags);
    }

    const storedDietaryTags = readStoredPreferenceTags(
      `${PROFILE_DIETARY_STORAGE_PREFIX}:${hostProfileId}`,
    );

    return uniqueTags(storedDietaryTags && storedDietaryTags.length > 0 ? storedDietaryTags : fallbackTags);
  }, [fallbackTags, hostProfileId, isHydrated]);

  if (visibleDietaryTags.length === 0) {
    return null;
  }

  return (
    <section
      className={styles.preferenceSection}
      aria-label="Régime et préférences alimentaires"
    >
      <div className={styles.preferenceHead}>
        <h2>Régime & préférences alimentaires</h2>
      </div>

      <div className={styles.preferenceGrid}>
        <section className={styles.preferenceGroup}>
          <span className={styles.preferenceTitle}>Tags du profil</span>

          <div className={styles.preferenceBox}>
            {visibleDietaryTags.map((item) => (
              <span key={item} className={styles.preferenceChip}>
                {item}
              </span>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}