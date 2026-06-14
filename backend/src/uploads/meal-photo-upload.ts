import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

export const MEAL_PHOTO_UPLOAD_DIR = join(
  process.cwd(),
  'uploads',
  'meal-photos',
);

const MAX_MEAL_PHOTO_SIZE = 3 * 1024 * 1024;
const ALLOWED_MEAL_PHOTO_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
];

function ensureMealPhotoUploadDir() {
  if (!existsSync(MEAL_PHOTO_UPLOAD_DIR)) {
    mkdirSync(MEAL_PHOTO_UPLOAD_DIR, { recursive: true });
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

export const mealPhotoUploadOptions = {
  storage: diskStorage({
    destination: (_req, _file, callback) => {
      ensureMealPhotoUploadDir();
      callback(null, MEAL_PHOTO_UPLOAD_DIR);
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
    if (!ALLOWED_MEAL_PHOTO_MIME_TYPES.includes(file.mimetype)) {
      callback(
        new BadRequestException(
          'Le fichier doit être une image PNG, JPG, JPEG ou WebP',
        ),
        false,
      );
      return;
    }

    callback(null, true);
  },
  limits: {
    fileSize: MAX_MEAL_PHOTO_SIZE,
  },
};

export function buildMealPhotoUrl(fileName: string) {
  const baseUrl =
    process.env.BACKEND_URL ?? `http://localhost:${process.env.PORT ?? 5001}`;
  return `${baseUrl}/uploads/meal-photos/${fileName}`;
}
