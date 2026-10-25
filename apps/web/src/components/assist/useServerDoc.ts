import { onSnapshot, type DocumentReference } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { LiveState } from '../../lib/hooks';

/**
 * Like useDoc, but a document that's missing from the local cache isn't reported as missing until
 * the server confirms it. Use for documents a Cloud Function has only just written (a new chat or
 * note set), so the page doesn't flash "not found" before the server snapshot arrives.
 */
export function useServerDoc<T>(ref: DocumentReference | null, key: string | null): LiveState<(T & { id: string }) | null> {
  const [state, setState] = useState<LiveState<(T & { id: string }) | null>>({ data: null, loading: !!ref, error: null });
  useEffect(() => {
    if (!ref) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    setState({ data: null, loading: true, error: null });
    return onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists() && snap.metadata.fromCache) return;
        setState({ data: snap.exists() ? { id: snap.id, ...(snap.data() as T) } : null, loading: false, error: null });
      },
      (error) => setState({ data: null, loading: false, error }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}
