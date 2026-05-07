import * as React from "react";

export function useDebounce<T>(delay: number, value: T): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

export type FetchState<T> = {
  data: T | null,
  error: string | null,
  loading: boolean,
};

export function useFetch<T>(url: string | URL, options?: ResponseInit): FetchState<T> {
  const [state, setState] = React.useState({ data: null, error: null, loading: false });

  React.useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, error: null, loading: true });

    setState(prev => ({ ...prev, loading: true }));

    fetch(url, { ...options, signal: controller.signal })
      .then(resp => resp.ok ? resp.json() : Promise.reject(new Error(resp.statusText)))
      .then(data => setState(prev => ({ ...prev, data, loading: false })))
      .catch((e) => {
        if (controller.signal.aborted) return;
        setState(prev => ({ ...prev, error: e.message, loading: false }));
      })

    return () => controller.abort();
  }, [url, options]);

  return state;
}
