import {
  addDocument,
  deleteDocument,
  getDocument,
  getDocuments,
  subscribeToCollection,
  subscribeToDocument,
  updateDocument,
} from '@/services/firestore';
import { DocumentData, QueryConstraint } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';

/**
 * Hook for fetching a single document
 */
export function useDocument<T extends DocumentData>(
  collectionName: string,
  documentId: string | null,
  realtime: boolean = false
) {
  const [data, setData] = useState<(T & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!documentId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    if (realtime) {
      const unsubscribe = subscribeToDocument<T>(
        collectionName,
        documentId,
        (doc) => {
          setData(doc);
          setLoading(false);
        }
      );
      return unsubscribe;
    } else {
      getDocument<T>(collectionName, documentId)
        .then((doc) => {
          setData(doc);
          setLoading(false);
        })
        .catch((err) => {
          setError(err);
          setLoading(false);
        });
    }
  }, [collectionName, documentId, realtime]);

  const refetch = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    try {
      const doc = await getDocument<T>(collectionName, documentId);
      setData(doc);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [collectionName, documentId]);

  return { data, loading, error, refetch };
}

/**
 * Hook for fetching multiple documents
 */
export function useCollection<T extends DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  realtime: boolean = false
) {
  const [data, setData] = useState<(T & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    if (realtime) {
      const unsubscribe = subscribeToCollection<T>(
        collectionName,
        constraints,
        (docs) => {
          setData(docs);
          setLoading(false);
        }
      );
      return unsubscribe;
    } else {
      getDocuments<T>(collectionName, constraints)
        .then((docs) => {
          setData(docs);
          setLoading(false);
        })
        .catch((err) => {
          setError(err);
          setLoading(false);
        });
    }
  }, [collectionName, realtime, JSON.stringify(constraints)]);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const docs = await getDocuments<T>(collectionName, constraints);
      setData(docs);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [collectionName, constraints]);

  return { data, loading, error, refetch };
}

/**
 * Hook for CRUD operations
 */
export function useMutation<T extends DocumentData>(collectionName: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const add = useCallback(
    async (data: T): Promise<string | null> => {
      setLoading(true);
      setError(null);
      try {
        const id = await addDocument(collectionName, data);
        return id;
      } catch (err) {
        setError(err as Error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [collectionName]
  );

  const update = useCallback(
    async (documentId: string, data: Partial<T>): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await updateDocument(collectionName, documentId, data);
        return true;
      } catch (err) {
        setError(err as Error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [collectionName]
  );

  const remove = useCallback(
    async (documentId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await deleteDocument(collectionName, documentId);
        return true;
      } catch (err) {
        setError(err as Error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [collectionName]
  );

  return { add, update, remove, loading, error };
}

