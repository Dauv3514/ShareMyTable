import styles from "./event-detail.module.scss";

const uniqueTags = (tags: string[]) => Array.from(new Set(tags.filter(Boolean)));

export function EventProfileFilters({ tags }: { tags: string[] }) {
  const displayTags = uniqueTags(tags);

  if (displayTags.length === 0) {
    return null;
  }

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

export function EventDietaryPreferenceSection({ tags }: { tags: string[] }) {
  const visibleDietaryTags = uniqueTags(tags);

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
