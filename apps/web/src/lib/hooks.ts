import { useEffect, useRef, useState } from 'react';
import {
  onSnapshot,
  type DocumentData,
  type DocumentReference,
  type Query,
} from 'firebase/firestore';

export interface LiveState<T> {
  data: T;
  loading: boolean;
  error: Error | null;
}

/** Live document data. Pass null to skip. `key` should change when the reference changes. */
export function useDoc<T = DocumentData>(ref: DocumentReference | null, key: string | null = ref?.path ?? null): LiveState<(T & { id: string }) | null> {
  const [state, setState] = useState<LiveState<(T & { id: string }) | null>>({ data: null, loading: !!ref, error: null });
  useEffect(() => {
    if (!ref) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      ref,
      (snap) => setState({ data: snap.exists() ? ({ id: snap.id, ...(snap.data() as T) }) : null, loading: false, error: null }),
      (error) => setState({ data: null, loading: false, error }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}

/** Live query results. `key` must uniquely describe the query (Firestore queries aren't comparable). */
export function useQuery<T = DocumentData>(q: Query | null, key: string | null): LiveState<Array<T & { id: string }>> {
  const [state, setState] = useState<LiveState<Array<T & { id: string }>>>({ data: [], loading: !!q, error: null });
  useEffect(() => {
    if (!q) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      q,
      (snap) => setState({ data: snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) })), loading: false, error: null }),
      (error) => setState({ data: [], loading: false, error }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}

/** Runs an async function on demand, tracking loading/error. */
export function useAsync<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const run = async (...args: A): Promise<R | undefined> => {
    setLoading(true);
    setError(null);
    try {
      return await fnRef.current(...args);
    } catch (e) {
      const { errorMessage } = await import('./api');
      setError(errorMessage(e));
      return undefined;
    } finally {
      setLoading(false);
    }
  };
  return { run, loading, error, setError };
}

/** Milliseconds elapsed since mount (or since `resetKey` changed). */
export function useElapsed(resetKey: unknown): () => number {
  const start = useRef(Date.now());
  useEffect(() => {
    start.current = Date.now();
  }, [resetKey]);
  return () => Date.now() - start.current;
}
