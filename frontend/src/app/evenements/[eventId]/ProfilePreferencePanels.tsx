"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchPublicUserPreferences } from "@/lib/user-preferences";
import styles from "./event-detail.module.scss";

const uniqueTags = (tags: string[]) => Array.from(new Set(tags.filter(Boolean)));

function usePublicPreferenceTags(
  hostUserId: string,
  fallbackTags: string[],
  type: "dietary" | "ambiance",
) {
  const [preferenceTags, setPreferenceTags] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadPreferences = async () => {
      const preferences = await fetchPublicUserPreferences(hostUserId);

      if (cancelled) {
        return;
      }

      setPreferenceTags(
        type === "ambiance"
          ? preferences?.ambianceTags ?? null
          : preferences?.dietaryTags ?? null,
      );
    };

    void loadPreferences();

    return () => {
      cancelled = true;
    };
  }, [hostUserId, type]);

  return preferenceTags && preferenceTags.length > 0
    ? uniqueTags(preferenceTags)
    : uniqueTags(fallbackTags);
}

export function EventProfileFilters({
  hostUserId,
  fallbackTags,
}: {
  hostUserId: string;
  fallbackTags: string[];
}) {
  const publicAmbianceTags = usePublicPreferenceTags(hostUserId, fallbackTags, "ambiance");
  const displayTags = useMemo(() => publicAmbianceTags, [publicAmbianceTags]);

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
  hostUserId,
  fallbackTags,
}: {
  hostUserId: string;
  fallbackTags: string[];
}) {
  const visibleDietaryTags = usePublicPreferenceTags(hostUserId, fallbackTags, "dietary");

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
          <span className={styles.preferenceTitle}>Tags concernant l&apos;événement</span>

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
