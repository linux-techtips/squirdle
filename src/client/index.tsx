import { scan } from "react-scan";
import { createRoot } from "react-dom/client";

import * as React from "react";

import type { Profile, GameState, GuessResult } from "@/types";

import * as tokin from "@/lib/tokin/client";
import * as pages from "@/client/pages";

import "./style.css";

export function useDebounce<T>(delay: number, value: T): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

export namespace Router {
  type RouteComponent = (props?: any) => React.ReactNode;
  type Routes = Readonly<Record<string, RouteComponent>>;

  export interface Register {
    routes: typeof routes
  };

  type RegisteredRoutes = Register extends { routes: infer R extends Routes } ? R : Routes;
  type PropsOf<R extends Routes, K extends keyof R> = Parameters<R[K]>[0];

  type NavigateArgs<R extends Routes, K extends keyof R> =
    undefined extends PropsOf<R, K>
    ? [to: K, props?: PropsOf<R, K>]
    : [to: K, props: PropsOf<R, K>];

  type NavigateFn<R extends Routes> = <K extends keyof R & string>(
    ...args: NavigateArgs<R, K>
  ) => void;

  export type Context = { navigate: NavigateFn<RegisteredRoutes> };

  export const Context = React.createContext<Context>(undefined as any);

  export function use(): Context {
    return React.use(Context);
  }

  type State = { path: string, props: unknown };

  export function Provider<const R extends Routes>(
    { children, routes }: { children: React.ReactNode, routes: R },
  ) {
    const readState = () => ({ path: window.location.pathname, props: window.history.state });

    const [state, setState] = React.useState<State>(readState());

    React.useEffect(() => {
      const listener = () => setState(readState());
      window.addEventListener("popstate", listener);
      return () => window.removeEventListener("popstate", listener);
    }, []);

    const navigate = ((path: string, props?: unknown) => {
      window.history.pushState(props ?? null, "", path);
      setState({ path, props });
    }) as NavigateFn<R>;

    const Route = routes[state.path];

    if (Route === undefined) window.location.pathname = "/";

    return (
      <Context.Provider value={{ navigate: navigate as NavigateFn<RegisteredRoutes> }}>
        <React.Suspense>
          {Route ? <Route {...(state.props as any)} /> : children}
        </React.Suspense>
      </Context.Provider>
    );
  }

  type NavigateProps = {
    [K in keyof RegisteredRoutes & string]: undefined extends PropsOf<RegisteredRoutes, K>
    ? { to: K, props?: PropsOf<RegisteredRoutes, K> }
    : { to: K, props: PropsOf<RegisteredRoutes, K> };
  }[keyof RegisteredRoutes & string];

  export function Navigate(props: NavigateProps) {
    use().navigate(props.to as never, (props as { props?: unknown }).props as never);
    return null;
  }
};

export namespace Auth {
  export type Context = {
    state: Profile | null,
    isSignedIn(): boolean,
    signOut(): Promise<void>,
    signIn(body: FormData): Promise<Response>,
    signUp(body: FormData): Promise<Response>,
  };

  export const Context = React.createContext<Context>(undefined as any);

  export function use(): Context {
    return React.use(Context);
  }

  export function Provider({ children }: { children: React.ReactNode }) {
    const readState = (): Profile | null => {
      const token = (
        document.cookie
          .split(";")
          .find(row => row.startsWith("primary-token="))
          ?.split("=")[1] ?? null
      );
      if (!token) return null;

      return tokin.read<Profile>(token);
    };

    const [state, setState] = React.useState(readState());

    const submit = async (path: string, body: FormData) => {
      const resp = await fetch(path, { method: "POST", body });

      setState(readState());

      return resp;
    };

    const context: Context = {
      isSignedIn: () => state !== null,
      signOut: async () => {
        await window.cookieStore.delete("primary-token");
        setState(null);
      },
      signUp: (body) => submit("/api/auth/signup", body),
      signIn: (body) => submit("/api/auth/signin", body),
      state,
    };

    return (
      <Context.Provider value={context}>
        {children}
      </Context.Provider>
    );
  }

  export function Guard({ children, fallback }: { children: React.ReactNode, fallback: React.ReactNode }) {
    return <>{use().state != null ? children : fallback}</>;
  }
};

export namespace Squirdle {
  export type Status = "loading" | "playing" | "won" | "lost";

  export type Context = {
    status: Status,
    state: GameState | null,
    guess(pokemon_id: number): Promise<void>,
  };

  export const Context = React.createContext<Context>(undefined as any);

  export function use(): Context {
    return React.use(Context);
  }

  export function Provider({ children }: { children: React.ReactNode }) {
    const auth = Auth.use();

    const [state, setState] = React.useState<GameState | null>(null);

    React.useEffect(() => {
      if (!auth.isSignedIn()) return;

      const controller = new AbortController();

      fetch("/api/game", { method: "POST", signal: controller.signal })
        .then(r => r.ok ? r.json() : null)
        .then(state => setState(state))
        .catch(_ => { if (controller.signal.aborted) return });

      return () => controller.abort();
    }, [auth.state]);

    const guess = React.useCallback(async (pokemon_id: number) => {
      const resp = await fetch(`/api/guess/${pokemon_id}`, { method: "POST" });
      const result: GuessResult = await resp.json();

      setState(prev => prev ? {
        guesses: [...prev.guesses ?? [], { mask: result.mask, pokemon_id }],
        remaining: result.remaining,
      } : prev);
    }, []);

    const status = (() => {
      if (state === null) return "loading";

      const last = state.guesses.at(-1);
      if (last?.mask === 0) return "won";
      if (state.remaining === 0) return "lost";

      return "playing";
    })();

    const value = React.useMemo<Context>(
      () => ({ status, state, guess }),
      [state, guess],
    );

    return (
      <Context.Provider value={value}>
        {children}
      </Context.Provider>
    );
  }
};

const routes = {
  "/settings": pages.Settings,
  "/profile": pages.Profilescreen,
  "/pokedex": pages.Pokedex,
  "/game": pages.Gamescreen,
  "/": pages.Homescreen,
} as const;

const app = (
  <React.StrictMode>
    <Auth.Provider>
      <Squirdle.Provider>
        <Router.Provider routes={routes}>
          <pages.Homescreen />
        </Router.Provider>
      </Squirdle.Provider>
    </Auth.Provider>
  </React.StrictMode>
);

if (import.meta.hot) {
  const root = (import.meta.hot.data.root ??= createRoot(document.body));
  root.render(app);
} else {
  createRoot(document.body).render(app);
}

if (process.env.NODE_ENV === "development") {
  scan({ enabled: true });
}
