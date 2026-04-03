import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HostProfile } from './host-profile.entity';

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

type PhotoVerificationResult = {
  verified: boolean;
  note: string;
};

// Service de verification automatique niveau 1.
// Il aide la moderation admin mais n'approuve jamais un profil automatiquement.
@Injectable()
export class HostProfileVerificationService {
  private readonly logger = new Logger(HostProfileVerificationService.name);

  constructor(private readonly configService: ConfigService) {}

  async runAutoReview(hostProfile: HostProfile): Promise<void> {
    const notes: string[] = [];

    const addressResult = await this.verifyAddress(hostProfile);
    hostProfile.addressVerified = addressResult.verified;
    if (addressResult.verified) {
      hostProfile.lat = addressResult.lat;
      hostProfile.lng = addressResult.lng;
    }
    notes.push(addressResult.note);

    const photoResult = this.verifyHomePhoto(hostProfile.homePhotoUrl);
    hostProfile.homePhotoVerified = photoResult.verified;
    notes.push(photoResult.note);

    hostProfile.verificationScore = this.calculateVerificationScore(hostProfile);
    notes.push(`Score automatique calcule: ${hostProfile.verificationScore}/100.`);

    hostProfile.autoReviewNotes = notes.join('\n');
    hostProfile.lastAutoReviewedAt = new Date();
  }

  calculateVerificationScore(hostProfile: HostProfile): number {
    let score = 0;

    if (hostProfile.addressVerified) {
      score += 50;
    }

    if (hostProfile.homePhotoVerified) {
      score += 30;
    }

    if (this.hasCleanAddressFields(hostProfile)) {
      score += 20;
    }

    return Math.min(score, 100);
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

  private verifyHomePhoto(homePhotoUrl: string | null): PhotoVerificationResult {
    if (!homePhotoUrl) {
      return {
        verified: false,
        note: 'Photo du domicile non verifiee: aucune URL fournie.',
      };
    }

    const trimmedUrl = homePhotoUrl.trim();
    if (!trimmedUrl) {
      return {
        verified: false,
        note: 'Photo du domicile non verifiee: URL vide.',
      };
    }

    if (trimmedUrl.startsWith('data:image/')) {
      return {
        verified: true,
        note: 'Photo du domicile verifiee: format data URL image acceptable.',
      };
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmedUrl);
    } catch {
      return {
        verified: false,
        note: 'Photo du domicile non verifiee: URL invalide.',
      };
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return {
        verified: false,
        note: 'Photo du domicile non verifiee: protocole non supporte.',
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
    const hasValidExtension = allowedExtensions.some((extension) =>
      pathname.endsWith(extension),
    );

    if (!hasValidExtension) {
      return {
        verified: false,
        note: "Photo du domicile non verifiee: extension d'image non reconnue.",
      };
    }

    return {
      verified: true,
      note: 'Photo du domicile verifiee: URL image de niveau 1 acceptable.',
    };
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

  private buildUserAgent(nominatimEmail: string): string {
    return nominatimEmail
      ? `RameneTaPoire/1.0 (${nominatimEmail})`
      : 'RameneTaPoire/1.0';
  }
}
