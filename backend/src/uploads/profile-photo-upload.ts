import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

export const PROFILE_PHOTO_UPLOAD_DIR = join(process.cwd(), 'uploads', 'profile-photos');

const MAX_PROFILE_PHOTO_SIZE = 5 * 1024 * 1024;

function ensureProfilePhotoUploadDir() {
  if (!existsSync(PROFILE_PHOTO_UPLOAD_DIR)) {
    mkdirSync(PROFILE_PHOTO_UPLOAD_DIR, { recursive: true });
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

export const profilePhotoUploadOptions = {
  storage: diskStorage({
    destination: (_req, _file, callback) => {
      ensureProfilePhotoUploadDir();
      callback(null, PROFILE_PHOTO_UPLOAD_DIR);
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
    if (!file.mimetype.startsWith('image/')) {
      callback(new BadRequestException('Le fichier doit être une image'), false);
      return;
    }

    callback(null, true);
  },
  limits: {
    fileSize: MAX_PROFILE_PHOTO_SIZE,
  },
};

export function buildProfilePhotoUrl(fileName: string) {
  const baseUrl =
    process.env.BACKEND_URL ?? `http://localhost:${process.env.PORT ?? 5001}`;
  return `${baseUrl}/uploads/profile-photos/${fileName}`;
}
