import { scan } from "react-scan";
import { createRoot } from "react-dom/client";

import * as React from "react";

import { SignIn, SignUp, Game, App } from "./components/App";
import * as tokin from "@/tokin/client";
import type { GameState, GuessResult } from "@/types";

import "./style.css";

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

  export function use() {
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
  type User = { username: string, id: number };

  export type Context = {
    state: User | null,
    isSignedIn(): boolean,
    signIn(body: FormData): Promise<Response>,
    signUp(body: FormData): Promise<Response>,
  };

  export const Context = React.createContext<Context>(undefined as any);

  export function use() {
    return React.use(Context);
  }

  export function Provider({ children }: { children: React.ReactNode }) {
    const readState = (): User | null => {
      const token = (
        document.cookie
          .split(";")
          .find(row => row.startsWith("primary-token="))
          ?.split("=")[1] ?? null
      );
      if (!token) return null;

      return tokin.read<User>(token);
    };

    const [state, setState] = React.useState(readState());

    const submit = async (path: string, body: FormData) => {
      const resp = await fetch(path, { method: "POST", body });

      setState(readState());

      return resp;
    };

    const context: Context = {
      isSignedIn: () => state !== null,
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
    state: GameState | null,
    status: Status,
    guess(body: FormData): Promise<void>,
  };

  export const Context = React.createContext<Context>(undefined as any);

  export function use() {
    return React.use(Context);
  }

  export function Provider({ children }: { children: React.ReactNode }) {
    const auth = Auth.use();

    const [loading, setLoading] = React.useState<boolean>(false);
    const [state, setState] = React.useState<GameState | null>(null);

    React.useEffect(() => {
      if (!auth.isSignedIn()) {
        setState(null);
        return;
      }

      let cancelled = false;
      setLoading(true);

      fetch("/api/game", { method: "POST" })
        .then(async r => r.ok ? await r.json() as null : null)
        .then(data => { if (!cancelled) setState(data); })
        .catch(() => { if (!cancelled) setState(null); })
        .finally(() => { if (!cancelled) setLoading(false); });

      return () => { cancelled = true };
    }, [auth.state]);

    const status: Status = (() => {
      if (loading) return "loading";
      if (state?.guesses.at(-1)?.mask === 0) return "won";
      if (state?.remaining_guesses === 0) return "lost";

      return "playing";
    })();

    const guess = async (body: FormData) => {
      const resp = await fetch("/api/guess", { method: "POST", body });
      if (!resp.ok) return;

      const result = await resp.json() as GuessResult;

      setState(prev => prev ? {
        guesses: [...prev.guesses, { mask: result.mask, pokemon_id: result.pokemon_id }],
        remaining_guesses: result.remaining_guesses,
      } : prev);
    };

    return (
      <Context.Provider value={{ state, status, guess }}>
        {children}
      </Context.Provider>
    )
  }
}

const routes = {
  "/": App,
  "/game": Game,
  "/signup": SignUp,
  "/signin": SignIn,
} as const;

const app = (
  <React.StrictMode>
    <Auth.Provider>
      <Squirdle.Provider>
        <Router.Provider routes={routes}>
          <App />
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

// declare global {
//   namespace Router {
//     interface Register { routes: typeof routes }
//   }
// }
