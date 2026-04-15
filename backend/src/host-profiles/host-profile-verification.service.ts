import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HostPhotoSafeSearch,
  HostPhotoVisionLabel,
  HostProfile,
} from './host-profile.entity';
import { HostProfileVisionService } from './host-profile-vision.service';

interface NominatimSearchResult {
  lat: string;
  lon: string;
  display_name?: string;
}

type AddressVerificationResult = {
  verified: boolean;
  lat: number | null;
  lng: number | null;
  note: string;
};

type AutoReviewSummary = {
  labels: HostPhotoVisionLabel[];
  safeSearch: HostPhotoSafeSearch;
  riskFlags: string[];
  manualReviewRequired: boolean;
};

// Service d'auto-review V2.
// Il combine verification d'adresse, verification image basique et Google Vision.
@Injectable()
export class HostProfileVerificationService {
  private readonly logger = new Logger(HostProfileVerificationService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly hostProfileVisionService: HostProfileVisionService,
  ) {}

  async runAutoReview(hostProfile: HostProfile): Promise<void> {
    const notes: string[] = [];
    const riskFlags = new Set<string>();

    const addressResult = await this.verifyAddress(hostProfile);
    hostProfile.addressVerified = addressResult.verified;
    if (addressResult.verified) {
      hostProfile.lat = addressResult.lat;
      hostProfile.lng = addressResult.lng;
    }
    if (!addressResult.verified) {
      riskFlags.add('address_not_verified');
    }
    notes.push(addressResult.note);

    const visionResult = await this.hostProfileVisionService.analyzeHomePhoto(
      hostProfile.homePhotoUrl,
    );

    hostProfile.homePhotoVisionLabels = visionResult.labels;
    hostProfile.homePhotoSafeSearch = visionResult.safeSearch;
    hostProfile.homePhotoVerified =
      visionResult.executed
        ? visionResult.homeRelated &&
          !visionResult.safeSearchFlagged &&
          !visionResult.riskFlags.includes('image_contains_logo')
        : visionResult.basicUrlValid;

    for (const riskFlag of visionResult.riskFlags) {
      riskFlags.add(riskFlag);
    }
    notes.push(visionResult.note);

    hostProfile.verificationRiskFlags = Array.from(riskFlags);
    hostProfile.manualReviewRequired =
      hostProfile.verificationRiskFlags.length > 0 ||
      visionResult.manualReviewRequired ||
      !hostProfile.addressVerified;

    hostProfile.verificationScore = this.calculateVerificationScore(hostProfile);
    notes.push(`Score automatique calcule: ${hostProfile.verificationScore}/100.`);
    notes.push(
      hostProfile.manualReviewRequired
        ? 'Review manuelle requise: oui.'
        : 'Review manuelle requise: non.',
    );

    hostProfile.autoReviewNotes = notes.join('\n');
    hostProfile.lastAutoReviewedAt = new Date();
  }

  calculateVerificationScore(hostProfile: HostProfile): number {
    let score = 0;

    if (hostProfile.addressVerified) {
      score += 40;
    }

    if (this.hasCleanAddressFields(hostProfile)) {
      score += 15;
    }

    const basicPhotoValidation = this.hostProfileVisionService.validatePhotoUrl(
      hostProfile.homePhotoUrl,
    );
    if (basicPhotoValidation.isValid) {
      score += 20;
    }

    if (this.hasHomeRelatedVisionLabels(hostProfile.homePhotoVisionLabels)) {
      score += 25;
    }

    if (hostProfile.verificationRiskFlags.includes('image_contains_logo')) {
      score -= 20;
    }

    if (hostProfile.verificationRiskFlags.includes('image_safe_search_flagged')) {
      score -= 30;
    }

    if (hostProfile.verificationRiskFlags.includes('image_not_related_to_home')) {
      score -= 20;
    }

    if (hostProfile.verificationRiskFlags.includes('google_vision_failed')) {
      score -= 15;
    }

    return Math.max(0, Math.min(score, 100));
  }

  private async verifyAddress(
    hostProfile: HostProfile,
  ): Promise<AddressVerificationResult> {
    const address = hostProfile.address.trim();
    const city = hostProfile.city.trim();
    const country = hostProfile.country.trim();

    if (!address || !city || !country) {
      return {
        verified: false,
        lat: hostProfile.lat,
        lng: hostProfile.lng,
        note: "Adresse non verifiee: champs d'adresse incomplets.",
      };
    }

    const params = new URLSearchParams({
      street: address,
      city,
      country,
      format: 'jsonv2',
      limit: '1',
      addressdetails: '1',
    });

    const nominatimEmail =
      this.configService.get<string>('NOMINATIM_EMAIL') ??
      this.configService.get<string>('MAIL_FROM') ??
      '';

    if (nominatimEmail) {
      params.set('email', nominatimEmail);
    }

    const baseUrl =
      this.configService.get<string>('NOMINATIM_BASE_URL') ??
      'https://nominatim.openstreetmap.org';
    const url = `${baseUrl}/search?${params.toString()}`;

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'fr,en',
          'User-Agent': this.buildUserAgent(nominatimEmail),
        },
      });

      if (!response.ok) {
        return {
          verified: false,
          lat: hostProfile.lat,
          lng: hostProfile.lng,
          note: `Adresse non verifiee: geocodage OpenStreetMap indisponible (${response.status}).`,
        };
      }

      const results = (await response.json()) as NominatimSearchResult[];
      const firstResult = results[0];

      if (!firstResult?.lat || !firstResult?.lon) {
        return {
          verified: false,
          lat: hostProfile.lat,
          lng: hostProfile.lng,
          note: "Adresse non verifiee: aucun resultat pertinent trouve par OpenStreetMap.",
        };
      }

      const lat = Number(firstResult.lat);
      const lng = Number(firstResult.lon);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return {
          verified: false,
          lat: hostProfile.lat,
          lng: hostProfile.lng,
          note: "Adresse non verifiee: coordonnees de geocodage invalides.",
        };
      }

      return {
        verified: true,
        lat,
        lng,
        note: firstResult.display_name
          ? `Adresse verifiee par OpenStreetMap: ${firstResult.display_name}.`
          : 'Adresse verifiee par OpenStreetMap.',
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'erreur reseau inconnue';
      this.logger.warn(`Auto-review adresse echouee: ${message}`);

      return {
        verified: false,
        lat: hostProfile.lat,
        lng: hostProfile.lng,
        note: `Adresse non verifiee: erreur technique lors du geocodage (${message}).`,
      };
    }
  }

  private hasCleanAddressFields(hostProfile: HostProfile): boolean {
    const fields = [
      hostProfile.address,
      hostProfile.city,
      hostProfile.country,
    ];

    return fields.every((field) => {
      const normalized = field.trim();
      return normalized.length >= 2 && normalized === field;
    });
  }

  private hasHomeRelatedVisionLabels(
    labels: HostPhotoVisionLabel[],
  ): boolean {
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

  private buildUserAgent(nominatimEmail: string): string {
    return nominatimEmail
      ? `RameneTaPoire/1.0 (${nominatimEmail})`
      : 'RameneTaPoire/1.0';
  }
}
