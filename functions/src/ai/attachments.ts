import { bucket } from '../lib/firebase';
import { fail } from '../lib/http';
import type { Attachment } from './providers';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = /^(image\/(png|jpeg|webp|gif)|application\/pdf)$/;

/** Loads a student's own upload from Storage as a model attachment. */
export async function loadAttachment(uid: string, path: string): Promise<Attachment> {
  if (!path.startsWith(`uploads/${uid}/`) || path.includes('..')) throw fail.denied('You can only use your own uploads.');
  const file = bucket().file(path);
  const [exists] = await file.exists();
  if (!exists) throw fail.notFound('That upload');
  const [meta] = await file.getMetadata();
  const size = Number(meta.size ?? 0);
  const contentType = String(meta.contentType ?? '');
  if (size > MAX_BYTES) throw fail.invalid('That file is too big (10 MB max).');
  if (!ALLOWED.test(contentType)) {
    throw fail.invalid(
      contentType.startsWith('image/heic') || contentType.startsWith('image/heif')
        ? 'iPhone HEIC photos need converting — please take the photo again in the app, or save it as JPEG.'
        : 'Use a photo (PNG/JPEG) or a PDF.',
    );
  }
  const [buf] = await file.download();
  return { mediaType: contentType, base64: buf.toString('base64') };
}
