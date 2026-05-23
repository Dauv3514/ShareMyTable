export const FALLBACK_MEAL_IMAGE_SRC = "/photoRepas.png";

export function sanitizeNextImageSrc(value?: string | null): string | null {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  if (trimmedValue.startsWith("/")) {
    return trimmedValue;
  }

  try {
    const url = new URL(trimmedValue);

    if (url.protocol === "https:" && url.hostname === "images.unsplash.com") {
      return trimmedValue;
    }

    if (
      url.protocol === "http:" &&
      url.hostname === "localhost" &&
      url.port === "5001" &&
      url.pathname.startsWith("/uploads/")
    ) {
      return trimmedValue;
    }
  } catch {
    return null;
  }

  return null;
}

export function getNextImageSrc(
  value?: string | null,
  fallback = FALLBACK_MEAL_IMAGE_SRC,
): string {
  return sanitizeNextImageSrc(value) ?? fallback;
}
