import { ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

const MAX_EDGE = 2000;
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Shrinks photos to at most 2000 px on the long edge and re-encodes as JPEG, which keeps uploads
 * small (and AI costs down) and converts formats the AI can't read. PDFs pass through unchanged.
 */
export async function prepareUpload(file: File): Promise<{ blob: Blob; contentType: string; ext: string }> {
  if (file.type === 'application/pdf') {
    if (file.size > MAX_BYTES) throw new Error('That PDF is over 10 MB. Try a smaller file.');
    return { blob: file, contentType: 'application/pdf', ext: 'pdf' };
  }
  if (!file.type.startsWith('image/')) throw new Error('Choose a photo or a PDF.');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('That photo format can’t be read here. Take the photo with your camera, or save it as a JPEG.');
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Couldn’t process that photo.'))), 'image/jpeg', 0.85),
  );
  return { blob, contentType: 'image/jpeg', ext: 'jpg' };
}

/** Uploads a file to uploads/<uid>/ and returns its storage path. */
export async function uploadStudentFile(uid: string, file: File, label = 'upload'): Promise<string> {
  const { blob, contentType, ext } = await prepareUpload(file);
  const safe = label.replace(/[^A-Za-z0-9-]/g, '').slice(0, 30) || 'upload';
  const path = `uploads/${uid}/${Date.now()}-${safe}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await uploadBytes(ref(storage, path), blob, { contentType });
  return path;
}
