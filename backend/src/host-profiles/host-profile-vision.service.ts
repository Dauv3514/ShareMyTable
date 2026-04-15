import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  HostPhotoSafeSearch,
  HostPhotoVisionLabel,
} from './host-profile.entity';

type BasicPhotoValidationResult = {
  isPresent: boolean;
  isValid: boolean;
  normalizedUrl: string | null;
  note: string;
  riskFlags: string[];
};

type VisionAnalysisResult = {
  executed: boolean;
  skippedByConfiguration: boolean;
  basicUrlValid: boolean;
  labels: HostPhotoVisionLabel[];
  safeSearch: HostPhotoSafeSearch;
  logos: string[];
  homeRelated: boolean;
  safeSearchFlagged: boolean;
  visionFailed: boolean;
  note: string;
  riskFlags: string[];
  manualReviewRequired: boolean;
};

type VisionClient = {
  batchAnnotateImages(request: unknown): Promise<[unknown, unknown?, unknown?]>;
};

type VisionEntityAnnotation = {
  description?: string | null;
  score?: number | null;
};

type VisionSafeSearchAnnotation = {
  adult?: string | null;
  spoof?: string | null;
  medical?: string | null;
  violence?: string | null;
  racy?: string | null;
};

type VisionAnnotateImageResponse = {
  labelAnnotations?: VisionEntityAnnotation[];
  logoAnnotations?: VisionEntityAnnotation[];
  safeSearchAnnotation?: VisionSafeSearchAnnotation;
  error?: { message?: string | null };
};

// Service Google Vision V2.
// Il analyse la photo du logement sans bloquer la creation ou la mise a jour du profil.
@Injectable()
export class HostProfileVisionService {
  private readonly logger = new Logger(HostProfileVisionService.name);
  private visionClient: VisionClient | null = null;
  private visionClientPromise: Promise<VisionClient | null> | null = null;
  private visionUnavailableReason: string | null = null;

  constructor(private readonly configService: ConfigService) {}

  validatePhotoUrl(homePhotoUrl: string | null): BasicPhotoValidationResult {
    if (!homePhotoUrl) {
      return {
        isPresent: false,
        isValid: false,
        normalizedUrl: null,
        note: 'Photo du domicile non verifiee: aucune URL fournie.',
        riskFlags: ['photo_missing'],
      };
    }

    const normalizedUrl = homePhotoUrl.trim();
    if (!normalizedUrl) {
      return {
        isPresent: false,
        isValid: false,
        normalizedUrl: null,
        note: 'Photo du domicile non verifiee: URL vide.',
        riskFlags: ['photo_missing'],
      };
    }

    if (normalizedUrl.startsWith('data:image/')) {
      return {
        isPresent: true,
        isValid: true,
        normalizedUrl,
        note: 'Photo du domicile basiquement valide: format image acceptable.',
        riskFlags: [],
      };
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(normalizedUrl);
    } catch {
      return {
        isPresent: true,
        isValid: false,
        normalizedUrl: null,
        note: 'Photo du domicile non verifiee: URL invalide.',
        riskFlags: ['photo_invalid_url'],
      };
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return {
        isPresent: true,
        isValid: false,
        normalizedUrl: null,
        note: 'Photo du domicile non verifiee: protocole non supporte.',
        riskFlags: ['photo_invalid_url'],
      };
    }

    const pathname = parsedUrl.pathname.toLowerCase();
    const allowedExtensions = [
      '.jpg',
      '.jpeg',
      '.png',
      '.webp',
      '.gif',
      '.avif',
      '.heic',
      '.heif',
    ];
    const hasValidExtension =
      pathname.length === 0 ||
      allowedExtensions.some((extension) => pathname.endsWith(extension));

    if (!hasValidExtension) {
      return {
        isPresent: true,
        isValid: false,
        normalizedUrl: null,
        note: "Photo du domicile non verifiee: extension d'image non reconnue.",
        riskFlags: ['photo_invalid_url'],
      };
    }

    return {
      isPresent: true,
      isValid: true,
      normalizedUrl,
      note: 'Photo du domicile basiquement valide: URL exploitable.',
      riskFlags: [],
    };
  }

  async analyzeHomePhoto(
    homePhotoUrl: string | null,
  ): Promise<VisionAnalysisResult> {
    const basicValidation = this.validatePhotoUrl(homePhotoUrl);

    if (!basicValidation.isPresent || !basicValidation.isValid) {
      return {
        executed: false,
        skippedByConfiguration: false,
        basicUrlValid: false,
        labels: [],
        safeSearch: null,
        logos: [],
        homeRelated: false,
        safeSearchFlagged: false,
        visionFailed: false,
        note: basicValidation.note,
        riskFlags: [...basicValidation.riskFlags],
        manualReviewRequired: basicValidation.riskFlags.length > 0,
      };
    }

    if (this.isVisionExplicitlyDisabled()) {
      return {
        executed: false,
        skippedByConfiguration: true,
        basicUrlValid: true,
        labels: [],
        safeSearch: null,
        logos: [],
        homeRelated: false,
        safeSearchFlagged: false,
        visionFailed: false,
        note: 'Google Vision desactive par configuration: verification image limitee au niveau 1.',
        riskFlags: [],
        manualReviewRequired: false,
      };
    }

    if (this.visionUnavailableReason) {
      return {
        executed: false,
        skippedByConfiguration: false,
        basicUrlValid: true,
        labels: [],
        safeSearch: null,
        logos: [],
        homeRelated: false,
        safeSearchFlagged: false,
        visionFailed: true,
        note: this.visionUnavailableReason,
        riskFlags: ['google_vision_failed'],
        manualReviewRequired: true,
      };
    }

    const client = await this.getVisionClient();
    if (!client || !basicValidation.normalizedUrl) {
      return {
        executed: false,
        skippedByConfiguration: false,
        basicUrlValid: true,
        labels: [],
        safeSearch: null,
        logos: [],
        homeRelated: false,
        safeSearchFlagged: false,
        visionFailed: true,
        note:
          'Verification Google Vision indisponible: configuration absente ou client non charge.',
        riskFlags: ['google_vision_failed'],
        manualReviewRequired: true,
      };
    }

    try {
      const [batchResponse] = await client.batchAnnotateImages({
        requests: [
          {
            image: {
              source: {
                imageUri: basicValidation.normalizedUrl,
              },
            },
            features: [
              { type: 'LABEL_DETECTION', maxResults: 10 },
              { type: 'SAFE_SEARCH_DETECTION' },
              { type: 'LOGO_DETECTION', maxResults: 5 },
            ],
          },
        ],
      });

      const response = this.extractFirstResponse(batchResponse);
      if (response?.error?.message) {
        const normalizedReason = this.normalizeVisionFailureMessage(
          response.error.message,
        );
        this.maybeDisableVision(response.error.message, normalizedReason);

        return {
          executed: false,
          skippedByConfiguration: false,
          basicUrlValid: true,
          labels: [],
          safeSearch: null,
          logos: [],
          homeRelated: false,
          safeSearchFlagged: false,
          visionFailed: true,
          note: normalizedReason,
          riskFlags: ['google_vision_failed'],
          manualReviewRequired: true,
        };
      }

      const labels = (response?.labelAnnotations ?? [])
        .filter((label) => typeof label.description === 'string')
        .map((label) => ({
          description: (label.description ?? '').trim(),
          score:
            typeof label.score === 'number'
              ? Number(label.score.toFixed(4))
              : null,
        }))
        .filter((label) => label.description.length > 0);

      const logos = (response?.logoAnnotations ?? [])
        .map((logo) => (logo.description ?? '').trim())
        .filter((logo) => logo.length > 0);

      const safeSearch = this.normalizeSafeSearch(response?.safeSearchAnnotation);
      const homeRelated = this.isHomeRelated(labels);
      const safeSearchFlagged = this.isSafeSearchFlagged(safeSearch);

      const riskFlags: string[] = [];
      if (logos.length > 0) {
        riskFlags.push('image_contains_logo');
      }
      if (safeSearchFlagged) {
        riskFlags.push('image_safe_search_flagged');
      }
      if (!homeRelated) {
        riskFlags.push('image_not_related_to_home');
      }

      const noteParts = [
        labels.length > 0
          ? `Labels Vision detectes: ${labels
              .map((label) => label.description)
              .join(', ')}.`
          : 'Labels Vision: aucun label exploitable detecte.',
        logos.length > 0
          ? `Logos detectes: ${logos.join(', ')}.`
          : 'Logos detectes: aucun.',
        safeSearch
          ? `SafeSearch: adult=${safeSearch.adult ?? 'UNKNOWN'}, violence=${safeSearch.violence ?? 'UNKNOWN'}, medical=${safeSearch.medical ?? 'UNKNOWN'}, racy=${safeSearch.racy ?? 'UNKNOWN'}, spoof=${safeSearch.spoof ?? 'UNKNOWN'}.`
          : 'SafeSearch: aucune donnee exploitable.',
        homeRelated
          ? "L'image semble correspondre a un logement ou un interieur."
          : "L'image ne ressemble pas suffisamment a un logement ou un interieur.",
      ];

      return {
        executed: true,
        skippedByConfiguration: false,
        basicUrlValid: true,
        labels,
        safeSearch,
        logos,
        homeRelated,
        safeSearchFlagged,
        visionFailed: false,
        note: noteParts.join(' '),
        riskFlags,
        manualReviewRequired: riskFlags.length > 0,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'erreur Vision inconnue';
      const normalizedReason = this.normalizeVisionFailureMessage(message);
      this.maybeDisableVision(message, normalizedReason);

      return {
        executed: false,
        skippedByConfiguration: false,
        basicUrlValid: true,
        labels: [],
        safeSearch: null,
        logos: [],
        homeRelated: false,
        safeSearchFlagged: false,
        visionFailed: true,
        note: normalizedReason,
        riskFlags: ['google_vision_failed'],
        manualReviewRequired: true,
      };
    }
  }

  private async getVisionClient(): Promise<VisionClient | null> {
    if (this.visionClient) {
      return this.visionClient;
    }

    if (this.visionClientPromise) {
      return this.visionClientPromise;
    }

    if (!this.isVisionEnabled()) {
      return null;
    }

    this.visionClientPromise = this.createVisionClient();
    this.visionClient = await this.visionClientPromise;
    return this.visionClient;
  }

  private async createVisionClient(): Promise<VisionClient | null> {
    try {
      const dynamicImport = new Function(
        'moduleName',
        'return import(moduleName);',
      ) as (moduleName: string) => Promise<any>;
      const visionModule = await dynamicImport('@google-cloud/vision');
      const ImageAnnotatorClient =
        visionModule?.v1?.ImageAnnotatorClient ??
        visionModule?.ImageAnnotatorClient;

      if (!ImageAnnotatorClient) {
        this.logger.warn('Client Google Vision introuvable dans le package.');
        return null;
      }

      const clientOptions: Record<string, unknown> = {};
      const credentialsJson = this.configService.get<string>(
        'GOOGLE_VISION_CREDENTIALS_JSON',
      );

      if (credentialsJson) {
        try {
          const parsedCredentials = JSON.parse(credentialsJson) as {
            client_email?: string;
            private_key?: string;
            project_id?: string;
          };

          if (
            parsedCredentials.client_email &&
            parsedCredentials.private_key
          ) {
            clientOptions.credentials = {
              client_email: parsedCredentials.client_email,
              private_key: parsedCredentials.private_key,
            };
          }

          if (parsedCredentials.project_id) {
            clientOptions.projectId = parsedCredentials.project_id;
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'JSON invalide';
          this.logger.warn(
            `GOOGLE_VISION_CREDENTIALS_JSON invalide: ${message}`,
          );
          return null;
        }
      } else {
        const projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT');
        if (projectId) {
          clientOptions.projectId = projectId;
        }
      }

      return new ImageAnnotatorClient(clientOptions) as VisionClient;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'package non disponible';
      this.logger.warn(`Chargement Google Vision impossible: ${message}`);
      return null;
    }
  }

  private isVisionEnabled(): boolean {
    const explicitFlag = this.configService.get<string>('GOOGLE_VISION_ENABLED');
    if (explicitFlag !== undefined) {
      return explicitFlag.toLowerCase() === 'true';
    }

    return Boolean(
      this.configService.get<string>('GOOGLE_VISION_CREDENTIALS_JSON') ||
        this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS'),
    );
  }

  private isVisionExplicitlyDisabled(): boolean {
    const explicitFlag = this.configService.get<string>('GOOGLE_VISION_ENABLED');
    return explicitFlag !== undefined && explicitFlag.toLowerCase() === 'false';
  }

  private normalizeVisionFailureMessage(message: string): string {
    const normalizedMessage = message.trim();

    if (this.isBillingPermissionError(normalizedMessage)) {
      return "Verification Google Vision indisponible: le billing Google Cloud n'est pas active sur le projet.";
    }

    return `Verification Google Vision echouee: ${normalizedMessage}.`;
  }

  private maybeDisableVision(rawMessage: string, normalizedReason: string): void {
    if (!this.isBillingPermissionError(rawMessage)) {
      this.logger.warn(`Google Vision analyse echouee: ${rawMessage}`);
      return;
    }

    if (!this.visionUnavailableReason) {
      this.logger.warn(
        "Google Vision desactive pour cette session: billing Google Cloud non active.",
      );
      this.visionUnavailableReason = normalizedReason;
    }
  }

  private isBillingPermissionError(message: string): boolean {
    const normalizedMessage = message.toLowerCase();
    return (
      normalizedMessage.includes('permission_denied') &&
      normalizedMessage.includes('billing')
    );
  }

  private extractFirstResponse(batchResponse: unknown): VisionAnnotateImageResponse | null {
    if (
      typeof batchResponse !== 'object' ||
      batchResponse === null ||
      !('responses' in batchResponse)
    ) {
      return null;
    }

    const responses = (batchResponse as { responses?: unknown[] }).responses;
    if (!Array.isArray(responses) || responses.length === 0) {
      return null;
    }

    return (responses[0] as VisionAnnotateImageResponse) ?? null;
  }

  private normalizeSafeSearch(
    safeSearchAnnotation: VisionSafeSearchAnnotation | null | undefined,
  ): HostPhotoSafeSearch {
    if (!safeSearchAnnotation) {
      return null;
    }

    return {
      adult: safeSearchAnnotation.adult ?? null,
      spoof: safeSearchAnnotation.spoof ?? null,
      medical: safeSearchAnnotation.medical ?? null,
      violence: safeSearchAnnotation.violence ?? null,
      racy: safeSearchAnnotation.racy ?? null,
    };
  }

  private isHomeRelated(labels: HostPhotoVisionLabel[]): boolean {
    const positiveLabels = new Set([
      'room',
      'interior design',
      'property',
      'kitchen',
      'living room',
      'bedroom',
      'furniture',
      'building',
      'house',
      'home',
      'apartment',
      'real estate',
      'ceiling',
      'table',
      'floor',
      'couch',
      'window',
      'residential area',
      'cabinetry',
      'dining room',
    ]);

    const matchedLabels = labels.filter((label) =>
      positiveLabels.has(label.description.toLowerCase()),
    );

    if (matchedLabels.length >= 2) {
      return true;
    }

    if (matchedLabels.length === 1) {
      const topScore = matchedLabels[0].score ?? 0;
      return topScore >= 0.85;
    }

    return false;
  }

  private isSafeSearchFlagged(safeSearch: HostPhotoSafeSearch): boolean {
    if (!safeSearch) {
      return false;
    }

    const problematicLikelihoods = new Set(['LIKELY', 'VERY_LIKELY']);

    return [
      safeSearch.adult,
      safeSearch.violence,
      safeSearch.medical,
      safeSearch.racy,
    ].some((value) => (value ? problematicLikelihoods.has(value) : false));
  }
}
