import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync } from 'fs';
import type { Request } from 'express';
import type { Multer } from 'multer';

function uniqueName(originalName: string): string {
  const name = originalName.replace(/\s+/g, '-').toLowerCase();
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${ts}-${rand}${extname(name)}`;
}

function ensureDir(dir: string): string {
  mkdirSync(dir, { recursive: true });
  return dir;
}

export const photosStorage = () =>
  diskStorage({
    destination: (
      _req: Request,
      _file: Express.Multer.File,
      cb: (error: Error | null, destination: string) => void,
    ) => cb(null, ensureDir('uploads/photos')),
    filename: (
      _req: Request,
      file: Express.Multer.File,
      cb: (error: Error | null, filename: string) => void,
    ) => cb(null, uniqueName(file.originalname)),
  });

export const logosStorage = () =>
  diskStorage({
    destination: (
      _req: Request,
      _file: Express.Multer.File,
      cb: (error: Error | null, destination: string) => void,
    ) => cb(null, ensureDir('uploads/branding/logos')),
    filename: (
      _req: Request,
      file: Express.Multer.File,
      cb: (error: Error | null, filename: string) => void,
    ) => cb(null, uniqueName(file.originalname)),
  });

export const backgroundsStorage = () =>
  diskStorage({
    destination: (
      _req: Request,
      _file: Express.Multer.File,
      cb: (error: Error | null, destination: string) => void,
    ) => cb(null, ensureDir('uploads/branding/backgrounds')),
    filename: (
      _req: Request,
      file: Express.Multer.File,
      cb: (error: Error | null, filename: string) => void,
    ) => cb(null, uniqueName(file.originalname)),
  });

