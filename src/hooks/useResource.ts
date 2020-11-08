import { useState, useCallback, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import cuid from 'cuid';

const IS_RESOURCE = Symbol('IS_RESOURCE');

export type RemoteResource<T> =
  | {
      status: 'void';
    }
  | {
      status: 'pending';
      transformData: ((data: T) => T) | null;
    }
  | {
      status: 'resolved';
      data: T;
    }
  | {
      status: 'rejected';
      error: any;
    }
  | {
      status: 'outdated';
      data: T;
    }
  | {
      status: 'updating';
      data: T;
      transformData: ((data: T) => T) | null;
    }
  | {
      status: 'outdated-with-error';
      data: T;
      error: any;
    };

export type RemoteResourceStatus = RemoteResource<any>['status'];

export interface UseResourceParams<T> {
  name: string;
  fetchData: () => Promise<T>;
  initialRequested?: boolean;
}

export function isResource(maybe: any): maybe is Resource<any> {
  return maybe && maybe[IS_RESOURCE];
}

export function createVoidResource<T>(setRequested: (requested: boolean) => void): Resource<T> {
  return {
    [IS_RESOURCE]: true,
    sliceId: cuid.slug(),
    dataOrNull: null,
    requested: false,
    outdate: () => {},
    resource: { status: 'void' },
    retry: () => {},
    setRequested,
    stable: true,
    updateData: () => {},
    pending: false,
    name: 'Void Floating Resource',
  };
}

export interface Resource<T> {
  [IS_RESOURCE]: true;
  sliceId: string;
  resource: RemoteResource<T>;
  outdate: () => void;
  setRequested: (requested: boolean) => void;
  retry: () => void;
  dataOrNull: T | null;
  stable: boolean;
  requested: boolean;
  updateData: (update: (data: T) => T) => void;
  pending: boolean;
  name: string;
}

export function useResource<T>({
  fetchData,
  initialRequested = false,
  name,
}: UseResourceParams<T>): Resource<T> {
  const [sliceId] = useState(() => cuid.slug());
  const [state, setState] = useState<RemoteResource<T>>({ status: 'void' });
  const [requested, setRequestedInternal] = useState(initialRequested);
  // array of request in the order they were send
  // we use this to handle conccurency
  const requestQueueRef = useRef<Array<{ reqId: string; outdated: boolean }>>([]);

  const setRequested = useCallback((requested: boolean) => {
    setRequestedInternal(requested);
  }, []);

  const outdate = useCallback(() => {
    setState(
      (state): RemoteResource<T> => {
        if (state.status === 'pending' || state.status === 'updating') {
          // outdate pending requests
          requestQueueRef.current.forEach((req) => {
            req.outdated = true;
          });
          return state;
        }
        if (
          state.status === 'void' ||
          state.status === 'outdated' ||
          state.status === 'outdated-with-error' ||
          state.status === 'rejected'
        ) {
          return state;
        }
        if (state.status === 'resolved') {
          return { status: 'outdated', data: state.data };
        }
        return state;
      }
    );
  }, []);

  const setPending = useCallback(() => {
    setState((state) => {
      if (state.status === 'pending' || state.status === 'updating') {
        return state;
      }
      if (state.status === 'rejected' || state.status === 'void') {
        return { status: 'pending', transformData: null };
      }
      if (
        state.status === 'outdated' ||
        state.status === 'outdated-with-error' ||
        state.status === 'resolved'
      ) {
        return { status: 'updating', data: state.data, transformData: null };
      }
      return state;
    });
  }, []);

  useLayoutEffect(() => {
    // when the fetchData function change we "cancel" all previous requests
    requestQueueRef.current = [];
    // we also change set to make sure it will fetch if necessary
    setState((state) => {
      if (state.status === 'outdated' || state.status === 'void') {
        return state;
      }
      if (state.status === 'pending' || state.status === 'rejected') {
        return { status: 'void' };
      }
      if (
        state.status === 'resolved' ||
        state.status === 'updating' ||
        state.status === 'outdated-with-error'
      ) {
        return { status: 'outdated', data: state.data };
      }
      return state;
    });
  }, [fetchData]);

  useEffect(() => {
    return () => {
      // on unmount, cancel all fetch
      requestQueueRef.current = [];
    };
  }, []);

  const handleResolved = useCallback((reqId: string, data: T) => {
    const index = requestQueueRef.current.findIndex((item) => item.reqId === reqId);
    if (index === -1) {
      // request canceled
      return;
    }
    const { outdated } = requestQueueRef.current[index];
    // remove request and all request before from the queue
    requestQueueRef.current = requestQueueRef.current.slice(index + 1);
    const isLast = requestQueueRef.current.length === 0;
    setState((state) => {
      if (state.status === 'pending' || state.status === 'updating') {
        const nextData = state.transformData ? state.transformData(data) : data;
        if (isLast) {
          if (outdated) {
            return { status: 'outdated', data: nextData };
          }
          return { status: 'resolved', data: nextData };
        }
        return { status: 'updating', data: nextData, transformData: null };
      }
      console.warn(
        `An fetch response was ignored because the state of the resources is "${state.status}" (not a pending state)`
      );
      return state;
    });
  }, []);

  const handleRejected = useCallback((reqId: string, error: any) => {
    const index = requestQueueRef.current.findIndex((item) => item.reqId === reqId);
    if (index === -1) {
      // request canceled
      return;
    }
    // remove request and all request before from the queue
    requestQueueRef.current = requestQueueRef.current.slice(index + 1);
    if (requestQueueRef.current.length > 0) {
      // there are other requests pending, we can ignore this error.
      return;
    }
    // set error state
    setState((state) => {
      if (state.status === 'pending') {
        return { status: 'rejected', error };
      }
      if (state.status === 'updating') {
        return { status: 'outdated-with-error', error, data: state.data };
      }
      console.warn(
        `An fetch error was ignored because the state of the resources is "${state.status}" (not a pending state)`
      );
      return state;
    });
  }, []);

  const doFetch = useCallback(async () => {
    const reqId = cuid.slug();
    requestQueueRef.current.push({ reqId, outdated: false });
    setPending();
    try {
      const res = await fetchData();
      handleResolved(reqId, res);
    } catch (error) {
      handleRejected(reqId, error);
    }
  }, [fetchData, handleRejected, handleResolved, setPending]);

  const retry = useCallback(() => {
    if (requestQueueRef.current.length > 0) {
      // do nothing if request are pending
      return;
    }
    setState((state) => {
      if (state.status === 'rejected') {
        return { status: 'void' };
      }
      if (state.status === 'outdated-with-error') {
        return { status: 'outdated', data: state.data };
      }
      return state;
    });
  }, []);

  const updateData = useCallback((update: (data: T) => T) => {
    setState((state) => {
      if (state.status === 'resolved') {
        return {
          status: 'resolved',
          data: update(state.data),
        };
      }
      if (state.status === 'pending' || state.status === 'updating') {
        return {
          ...state,
          transformData: (data) => {
            return update(state.transformData ? state.transformData(data) : data);
          },
        };
      }
      return state;
    });
  }, []);

  useEffect(() => {
    if (!requested) {
      return;
    }
    if (state.status === 'void' || state.status === 'outdated') {
      doFetch();
    }
  }, [doFetch, requested, state]);

  const dataOrNull = useMemo(() => {
    if (
      state.status === 'resolved' ||
      state.status === 'outdated' ||
      state.status === 'updating' ||
      state.status === 'outdated-with-error'
    ) {
      return state.data;
    }
    return null;
  }, [state]);

  const stable = useMemo(() => {
    if (requested && state.status === 'void') {
      return false;
    }
    if (state.status === 'pending' || state.status === 'updating') {
      return false;
    }
    return true;
  }, [requested, state.status]);

  const pending = useMemo(() => {
    if (state.status === 'pending' || state.status === 'updating') {
      return true;
    }
    return false;
  }, [state.status]);

  return useMemo(
    () => ({
      [IS_RESOURCE]: true,
      resource: state,
      setRequested,
      outdate,
      retry,
      dataOrNull,
      stable,
      sliceId,
      requested,
      updateData,
      pending,
      name,
    }),
    [
      dataOrNull,
      name,
      outdate,
      pending,
      requested,
      retry,
      setRequested,
      sliceId,
      stable,
      state,
      updateData,
    ]
  );
}
