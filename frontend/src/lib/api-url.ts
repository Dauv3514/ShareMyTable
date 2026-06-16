const API_PREFIX = "api";

export function normalizePublicApiUrl(apiUrl?: string | null) {
  const trimmedApiUrl = apiUrl?.trim();

  if (!trimmedApiUrl) {
    return null;
  }

  try {
    const url = new URL(trimmedApiUrl);
    const currentPath = url.pathname.replace(/\/+$/g, "");

    if (currentPath === `/${API_PREFIX}` || currentPath.endsWith(`/${API_PREFIX}`)) {
      url.pathname = currentPath;
      return url.toString().replace(/\/$/g, "");
    }

    url.pathname = `${currentPath}/${API_PREFIX}`.replace(/\/{2,}/g, "/");
    return url.toString().replace(/\/$/g, "");
  } catch {
    const relativeUrl = trimmedApiUrl.replace(/\/+$/g, "");

    if (relativeUrl === `/${API_PREFIX}` || relativeUrl.endsWith(`/${API_PREFIX}`)) {
      return relativeUrl;
    }

    return `${relativeUrl}/${API_PREFIX}`.replace(/\/{2,}/g, "/");
  }
}

export function buildPublicApiUrl(path: string) {
  const apiBaseUrl = normalizePublicApiUrl(process.env.NEXT_PUBLIC_API_URL);

  if (!apiBaseUrl) {
    return null;
  }

  let normalizedPath = path.replace(/^\/+/g, "");

  if (normalizedPath === API_PREFIX || normalizedPath.startsWith(`${API_PREFIX}/`)) {
    normalizedPath = normalizedPath.slice(API_PREFIX.length).replace(/^\/+/g, "");
  }

  if (apiBaseUrl.startsWith("http://") || apiBaseUrl.startsWith("https://")) {
    return new URL(normalizedPath, `${apiBaseUrl}/`).toString();
  }

  return `${apiBaseUrl}/${normalizedPath}`.replace(/\/{2,}/g, "/");
}
