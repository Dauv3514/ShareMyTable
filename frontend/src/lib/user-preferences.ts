export type UserPreferenceSummary = {
  dietaryTags: string[];
  ambianceTags: string[];
};

function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? null;
}

function normalizePreferenceResponse(payload: unknown): UserPreferenceSummary {
  const dietaryTags = Array.isArray((payload as { dietaryTags?: unknown })?.dietaryTags)
    ? (payload as { dietaryTags: unknown[] }).dietaryTags.filter(
        (item): item is string => typeof item === "string"
      )
    : [];
  const ambianceTags = Array.isArray((payload as { ambianceTags?: unknown })?.ambianceTags)
    ? (payload as { ambianceTags: unknown[] }).ambianceTags.filter(
        (item): item is string => typeof item === "string"
      )
    : [];

  return { dietaryTags, ambianceTags };
}

export async function fetchMyUserPreferences(
  token: string
): Promise<UserPreferenceSummary | null> {
  const apiUrl = getApiUrl();

  if (!apiUrl) {
    return null;
  }

  try {
    const response = await fetch(`${apiUrl}/users/me/preferences`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return normalizePreferenceResponse(await response.json());
  } catch {
    return null;
  }
}

export async function updateMyUserPreferences(
  token: string,
  preferences: UserPreferenceSummary
): Promise<UserPreferenceSummary | null> {
  const apiUrl = getApiUrl();

  if (!apiUrl) {
    return null;
  }

  try {
    const response = await fetch(`${apiUrl}/users/me/preferences`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        dietary_tags: preferences.dietaryTags,
        ambiance_tags: preferences.ambianceTags,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      preferences?: UserPreferenceSummary;
    };

    return normalizePreferenceResponse(payload.preferences ?? payload);
  } catch {
    return null;
  }
}

export async function fetchPublicUserPreferences(
  userId: string | number
): Promise<UserPreferenceSummary | null> {
  const apiUrl = getApiUrl();

  if (!apiUrl) {
    return null;
  }

  try {
    const response = await fetch(`${apiUrl}/users/${userId}/preferences`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return normalizePreferenceResponse(await response.json());
  } catch {
    return null;
  }
}