import type { ConfigService } from '@nestjs/config';

type ConfigReader = Pick<ConfigService, 'get'> | Record<string, string | undefined>;

function readConfigValue(config: ConfigReader | undefined, key: string) {
  if (!config) {
    return process.env[key];
  }

  if ('get' in config && typeof config.get === 'function') {
    return config.get<string>(key);
  }

  return config[key];
}

export function getApiGlobalPrefix(config?: ConfigReader) {
  return readConfigValue(config, 'API_GLOBAL_PREFIX')?.trim().replace(/^\/+|\/+$/g, '') ?? '';
}

function appendApiPrefix(baseUrl: string, config?: ConfigReader) {
  const url = new URL(baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  const globalPrefix = getApiGlobalPrefix(config);

  if (!globalPrefix) {
    return url.toString();
  }

  const currentPath = url.pathname.replace(/\/+$/g, '');
  if (currentPath === `/${globalPrefix}` || currentPath.endsWith(`/${globalPrefix}`)) {
    url.pathname = `${currentPath}/`;
    return url.toString();
  }

  url.pathname = `${currentPath}/${globalPrefix}/`.replace(/\/{2,}/g, '/');
  return url.toString();
}

export function getPublicApiBaseUrl(config?: ConfigReader) {
  const explicitApiUrl =
    readConfigValue(config, 'PUBLIC_API_URL')?.trim() ??
    readConfigValue(config, 'NEXT_PUBLIC_API_URL')?.trim();

  if (explicitApiUrl) {
    return appendApiPrefix(explicitApiUrl, config);
  }

  const backendUrl =
    readConfigValue(config, 'BACKEND_URL')?.trim() ??
    `http://localhost:${readConfigValue(config, 'PORT')?.trim() || 5001}`;

  return appendApiPrefix(backendUrl, config);
}

export function buildPublicApiUrl(path: string, config?: ConfigReader) {
  const apiBaseUrl = getPublicApiBaseUrl(config);
  const globalPrefix = getApiGlobalPrefix(config);
  let normalizedPath = path.replace(/^\/+/g, '');

  if (
    globalPrefix &&
    (normalizedPath === globalPrefix || normalizedPath.startsWith(`${globalPrefix}/`))
  ) {
    normalizedPath = normalizedPath.slice(globalPrefix.length).replace(/^\/+/g, '');
  }

  return new URL(normalizedPath, apiBaseUrl).toString();
}

export function normalizeAuthCallbackUrl(callbackUrl: string, config?: ConfigReader) {
  const globalPrefix = getApiGlobalPrefix(config);

  if (!globalPrefix) {
    return callbackUrl;
  }

  const url = new URL(callbackUrl);
  const currentPath = url.pathname.replace(/\/+$/g, '') || '/';

  if (currentPath === `/${globalPrefix}` || currentPath.startsWith(`/${globalPrefix}/`)) {
    return url.toString();
  }

  url.pathname = `/${globalPrefix}${currentPath}`.replace(/\/{2,}/g, '/');
  return url.toString();
}
