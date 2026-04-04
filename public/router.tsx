import * as React from "react";

const Context = React.createContext<{ path: string, navigate: (to: string) => void } | null>(null);

export function Provider({ children }: { children: React.ReactNode }) {
  const [path, setPath] = React.useState(window.location.pathname);

  React.useEffect(() => {
    const onPathChange = () => setPath(window.location.pathname);
    const orgPushState = window.history.pushState.bind(window.history);

    window.history.pushState = (...args) => {
      orgPushState(...args);
      window.dispatchEvent(new Event("pushState"));
    };

    window.addEventListener("popstate", onPathChange);
    window.addEventListener("pushstate", onPathChange);

    return () => {
      window.removeEventListener("popstate", onPathChange);
      window.removeEventListener("pushState", onPathChange);
      window.history.pushState = orgPushState;
    };
  }, []);

  const navigate = (to: string) => {
    window.history.pushState({}, "", to);
    setPath(to);
  };

  return (
    <Context.Provider value={{ path, navigate }}>
      {children}
    </Context.Provider>
  )
}

export function useRouter() {
  const ctx = React.useContext(Context);
  if (!ctx) throw new Error("useRouter must be called within a RouterProvider");

  return ctx;
}

export function Route({ path, children, guard }: { path: string, children: React.ReactNode, guard?: () => boolean }) {
  const { path: current, navigate } = useRouter();
  if (current !== path) return null;
  if (guard && !guard()) {
    navigate("/");
    return null;
  }

  return <>{children}</>;
}
