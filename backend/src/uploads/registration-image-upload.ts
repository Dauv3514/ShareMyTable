import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

const REGISTRATION_UPLOAD_ROOT = join(process.cwd(), 'uploads');
const PROFILE_PHOTO_DIRECTORY = join(REGISTRATION_UPLOAD_ROOT, 'profile-photos');
const HOST_HOME_PHOTO_DIRECTORY = join(
  REGISTRATION_UPLOAD_ROOT,
  'host-home-photos',
);

export const MAX_REGISTRATION_IMAGE_SIZE = 3 * 1024 * 1024;

function ensureDirectory(path: string) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

function normalizeExtension(originalName: string) {
  const extension = extname(originalName).toLowerCase();

  if (extension === '.jpg' || extension === '.jpeg') {
    return '.jpg';
  }

  if (extension === '.png') {
    return '.png';
  }

  if (extension === '.webp') {
    return '.webp';
  }

  return '';
}

function getDestinationByFieldName(fieldName: string) {
  if (fieldName === 'host_home_photo') {
    return HOST_HOME_PHOTO_DIRECTORY;
  }

  return PROFILE_PHOTO_DIRECTORY;
}

export const registrationImageUploadOptions = {
  storage: diskStorage({
    destination: (_req, file, callback) => {
      const destination = getDestinationByFieldName(file.fieldname);
      ensureDirectory(destination);
      callback(null, destination);
    },
    filename: (_req, file, callback) => {
      callback(null, `${randomUUID()}${normalizeExtension(file.originalname)}`);
    },
  }),
  fileFilter: (
    _req: unknown,
    file: { mimetype: string },
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      callback(
        new BadRequestException(
          'Le fichier doit etre une image PNG, JPG, JPEG ou WebP',
        ),
        false,
      );
      return;
    }

    callback(null, true);
  },
  limits: {
    fileSize: MAX_REGISTRATION_IMAGE_SIZE,
  },
};

export function buildHostHomePhotoUrl(fileName: string) {
  const baseUrl =
    process.env.BACKEND_URL ?? `http://localhost:${process.env.PORT ?? 5001}`;
  return `${baseUrl}/uploads/host-home-photos/${fileName}`;
}
