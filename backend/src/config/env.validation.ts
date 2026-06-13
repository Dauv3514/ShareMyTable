type EnvRecord = Record<string, string | undefined>;

function requireValue(env: EnvRecord, key: string): string {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`Variable d'environnement manquante: ${key}`);
  }

  return value;
}

function validateOptionalUrl(env: EnvRecord, key: string): void {
  const value = env[key]?.trim();
  if (!value) {
    return;
  }

  try {
    new URL(value);
  } catch {
    throw new Error(`Variable d'environnement invalide: ${key} doit être une URL valide`);
  }
}

function validateOptionalNumber(env: EnvRecord, key: string): void {
  const value = env[key]?.trim();
  if (!value) {
    return;
  }

  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) {
    throw new Error(`Variable d'environnement invalide: ${key} doit être un nombre`);
  }
}

function validateOptionalBoolean(env: EnvRecord, key: string): void {
  const value = env[key]?.trim().toLowerCase();
  if (!value) {
    return;
  }

  if (!['true', 'false'].includes(value)) {
    throw new Error(
      `Variable d'environnement invalide: ${key} doit valoir true ou false`,
    );
  }
}

export function validateEnvConfig(config: Record<string, unknown>) {
  const env = Object.fromEntries(
    Object.entries(config).map(([key, value]) => [
      key,
      typeof value === 'string' ? value : value?.toString(),
    ]),
  ) as EnvRecord;

  requireValue(env, 'DATABASE_URL');
  requireValue(env, 'JWT_SECRET');
  requireValue(env, 'JWT_EXPIRES_IN');

  validateOptionalNumber(env, 'PORT');
  validateOptionalNumber(env, 'SMTP_PORT');

  validateOptionalUrl(env, 'BACKEND_URL');
  validateOptionalUrl(env, 'FRONTEND_URL');
  validateOptionalUrl(env, 'GOOGLE_CALLBACK_URL');
  validateOptionalUrl(env, 'APPLE_CALLBACK_URL');
  validateOptionalUrl(env, 'NOMINATIM_BASE_URL');

  validateOptionalBoolean(env, 'GOOGLE_VISION_ENABLED');

  const googleVisionEnabled =
    env.GOOGLE_VISION_ENABLED?.trim().toLowerCase() === 'true';
  if (
    googleVisionEnabled &&
    !env.GOOGLE_APPLICATION_CREDENTIALS &&
    !env.GOOGLE_VISION_CREDENTIALS_JSON
  ) {
    throw new Error(
      "Google Vision est active mais aucune credentielle n'est configuree",
    );
  }

  return config;
}
