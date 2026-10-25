import clsx from 'clsx';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Camera, FileText, FolderOpen, Loader2, X } from 'lucide-react';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { storage } from '../../lib/firebase';
import { Button, Notice } from '../ui';

// Photo/PDF uploads to uploads/<uid>/<file> (see storage.rules). Photos are downscaled in the
// browser to at most 2000 px on the long edge and re-encoded as JPEG, so phone photos upload fast
// and stay well under the 10 MB limit.

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_EDGE = 2000;
const JPEG_QUALITY = 0.85;

export interface PreparedUpload {
  id: string;
  /** Original file name, for display only (the stored name is generated). */
  name: string;
  blob: Blob;
  contentType: 'image/jpeg' | 'application/pdf';
  ext: 'jpg' | 'pdf';
  /** Object URL for image thumbnails. */
  previewUrl: string | null;
}

interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}

async function decodeImage(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      /* fall back to <img>, which some browsers decode more formats with (e.g. HEIC in Safari) */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', quality));
}

async function toJpeg(file: File): Promise<Blob> {
  const img = await decodeImage(file);
  try {
    if (!img.width || !img.height) throw new Error('empty image');
    const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no canvas');
    ctx.fillStyle = '#ffffff'; // transparent PNGs become white, not black
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img.source, 0, 0, canvas.width, canvas.height);
    let blob = await canvasToBlob(canvas, JPEG_QUALITY);
    if (blob.size >= MAX_BYTES) blob = await canvasToBlob(canvas, 0.7);
    return blob;
  } finally {
    img.close();
  }
}

const isPdf = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
const isHeic = (f: File) => /^image\/hei[cf]/.test(f.type) || /\.hei[cf]$/i.test(f.name);

/** Validates a picked file and converts photos to a downscaled JPEG. Throws a friendly Error. */
export async function prepareFile(file: File): Promise<PreparedUpload> {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  if (isPdf(file)) {
    if (file.size >= MAX_BYTES) throw new Error(`“${file.name}” is bigger than 10 MB. Try a smaller PDF, or take photos of the pages instead.`);
    return { id, name: file.name, blob: file, contentType: 'application/pdf', ext: 'pdf', previewUrl: null };
  }
  if (file.type.startsWith('image/') || isHeic(file)) {
    let blob: Blob;
    try {
      blob = await toJpeg(file);
    } catch {
      throw new Error(
        isHeic(file)
          ? `“${file.name}” is an iPhone HEIC photo, which this browser can’t open. Take the photo with the “Take a photo” button instead, or save it as a JPEG.`
          : `We couldn’t open “${file.name}”. Try a JPEG or PNG photo.`,
      );
    }
    if (blob.size >= MAX_BYTES) throw new Error(`“${file.name}” is still bigger than 10 MB after shrinking it. Try a different photo.`);
    return { id, name: file.name, blob, contentType: 'image/jpeg', ext: 'jpg', previewUrl: URL.createObjectURL(blob) };
  }
  throw new Error(`“${file.name}” isn’t a photo or a PDF.`);
}

/** Uploads prepared files and returns their Storage paths (uploads/<uid>/<timestamp>-<n>.<ext>). */
export async function uploadPrepared(uid: string, items: PreparedUpload[], onProgress?: (done: number, total: number) => void): Promise<string[]> {
  const stamp = Date.now();
  const paths: string[] = [];
  onProgress?.(0, items.length);
  for (const [i, item] of items.entries()) {
    const path = `uploads/${uid}/${stamp}-${i + 1}.${item.ext}`;
    await uploadBytes(ref(storage, path), item.blob, { contentType: item.contentType });
    paths.push(path);
    onProgress?.(i + 1, items.length);
  }
  return paths;
}

/** Holds picked files and frees their preview URLs when removed or unmounted. */
export function useUploadItems() {
  const [items, setItems] = useState<PreparedUpload[]>([]);
  const latest = useRef(items);
  latest.current = items;
  useEffect(() => () => latest.current.forEach((i) => i.previewUrl && URL.revokeObjectURL(i.previewUrl)), []);
  const remove = (id: string) =>
    setItems((prev) => {
      const item = prev.find((x) => x.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  const clear = () =>
    setItems((prev) => {
      prev.forEach((i) => i.previewUrl && URL.revokeObjectURL(i.previewUrl));
      return [];
    });
  return { items, setItems, remove, clear };
}

export type UploadItemsState = ReturnType<typeof useUploadItems>;

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Pick 1–max photos or PDFs: camera button, file chooser, and drag-and-drop on larger screens. */
export function UploadPicker({ state, max, disabled, label = 'Add photos or PDFs' }: { state: UploadItemsState; max: number; disabled?: boolean; label?: string }) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  const [preparing, setPreparing] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const room = max - state.items.length;

  const add = async (list: FileList | File[] | null) => {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    const errs: string[] = [];
    const take = files.slice(0, Math.max(0, room));
    if (files.length > take.length) errs.push(`You can add up to ${max} file${max === 1 ? '' : 's'}.`);
    setPreparing((n) => n + take.length);
    const results = await Promise.allSettled(take.map(prepareFile));
    setPreparing((n) => n - take.length);
    const ok: PreparedUpload[] = [];
    results.forEach((r) => (r.status === 'fulfilled' ? ok.push(r.value) : errs.push(r.reason instanceof Error ? r.reason.message : 'That file couldn’t be added.')));
    state.setItems((prev) => {
      const fit = ok.slice(0, Math.max(0, max - prev.length));
      ok.slice(fit.length).forEach((i) => i.previewUrl && URL.revokeObjectURL(i.previewUrl));
      return [...prev, ...fit];
    });
    setErrors(errs);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled) void add(e.dataTransfer.files);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={clsx(
          'rounded-2xl border-2 border-dashed p-4 transition-colors',
          dragging ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40' : 'border-line',
        )}
      >
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-0.5 text-xs text-muted">
          Up to {max} photos or PDFs, 10 MB each. Photos are shrunk before uploading. You can also drag files here.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" icon={<Camera className="size-4" />} disabled={disabled || room <= 0} onClick={() => cameraRef.current?.click()}>
            Take a photo
          </Button>
          <Button type="button" variant="secondary" icon={<FolderOpen className="size-4" />} disabled={disabled || room <= 0} onClick={() => filesRef.current?.click()}>
            Choose files
          </Button>
        </div>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          multiple
          className="hidden"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            void add(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={filesRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            void add(e.target.files);
            e.target.value = '';
          }}
        />

        {(state.items.length > 0 || preparing > 0) && (
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Files to upload">
            {state.items.map((item, i) => (
              <li key={item.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-2">
                {item.previewUrl ? (
                  <img src={item.previewUrl} alt={`Page ${i + 1} preview`} className="size-14 shrink-0 rounded-lg border border-line object-cover" />
                ) : (
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                    <FileText className="size-6" aria-hidden />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.name || `File ${i + 1}`}</p>
                  <p className="text-xs text-muted">
                    {item.ext === 'pdf' ? 'PDF' : 'Photo'} · {formatSize(item.blob.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => state.remove(item.id)}
                  disabled={disabled}
                  className="rounded-lg p-2 text-muted hover:bg-black/5 hover:text-ink disabled:opacity-40 dark:hover:bg-white/10"
                  aria-label={`Remove ${item.name || `file ${i + 1}`}`}
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
            {preparing > 0 && (
              <li className="flex items-center gap-3 rounded-xl border border-line p-2 text-sm text-muted" role="status">
                <Loader2 className="size-5 animate-spin" /> Getting {preparing === 1 ? 'your file' : `${preparing} files`} ready…
              </li>
            )}
          </ul>
        )}
      </div>
      {errors.length > 0 && (
        <Notice tone="warn" className="mt-3">
          {errors.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </Notice>
      )}
    </div>
  );
}

/** Thumbnails for files already in Storage (chat attachments, note sets). */
export function AttachmentThumbs({ paths, className, size = 'sm' }: { paths: string[]; className?: string; size?: 'sm' | 'md' }) {
  const [urls, setUrls] = useState<Record<string, string | null>>({});
  const key = paths.join('|');
  useEffect(() => {
    let live = true;
    paths.forEach((p) => {
      getDownloadURL(ref(storage, p))
        .then((u) => live && setUrls((s) => ({ ...s, [p]: u })))
        .catch(() => live && setUrls((s) => ({ ...s, [p]: null })));
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (!paths.length) return null;
  const box = size === 'md' ? 'size-24' : 'size-16';
  return (
    <ul className={clsx('flex flex-wrap gap-2', className)} aria-label="Attached files">
      {paths.map((p, i) => {
        const url = urls[p];
        const pdf = /\.pdf$/i.test(p);
        const label = `${pdf ? 'PDF' : 'Photo'} ${i + 1}`;
        return (
          <li key={p}>
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer" className="block" title={`Open ${label}`}>
                {pdf ? (
                  <span className={clsx('flex flex-col items-center justify-center gap-1 rounded-lg border border-line bg-surface text-xs font-semibold text-ink', box)}>
                    <FileText className="size-5 text-rose-600" aria-hidden />
                    {label}
                  </span>
                ) : (
                  <img src={url} alt={label} className={clsx('rounded-lg border border-line bg-white object-cover', box)} />
                )}
              </a>
            ) : (
              <span className={clsx('flex items-center justify-center rounded-lg border border-line bg-surface text-center text-[11px] text-muted', box)}>
                {url === null ? 'File removed' : <Loader2 className="size-4 animate-spin" aria-label="Loading" />}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
