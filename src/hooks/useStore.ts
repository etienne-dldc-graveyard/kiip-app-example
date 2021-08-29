import { useLayoutEffect, useState } from 'react';
import { SubscribeMethod } from 'suub';

export type Store<T> = {
  subscribe: SubscribeMethod<T>;
  getState: () => T;
};

export function useStore<T>(store: Store<T>): T {
  const [state, setState] = useState(() => store.getState());

  useLayoutEffect(() => {
    return store.subscribe(setState);
  }, [store]);

  return state;
}

export function useDynamicStore<T>(store: Store<T> | null): T | null {
  const [state, setState] = useState(store ? store.getState : null);

  useLayoutEffect(() => {
    if (!store) {
      return;
    }
    setState(store.getState());
    return store.subscribe(setState);
  }, [store]);

  return state;
}
