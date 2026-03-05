import { createRoot } from "react-dom/client";
import { StrictMode } from "react";

import { Counter } from "./Counter";

import "@picocss/pico";

const app = (
  <StrictMode>
    <main>
      <Counter />
    </main>
  </StrictMode>
);

if (import.meta.hot) {
  const root = (import.meta.hot.data.root ??= createRoot(document.body));
  root.render(app);
} else {
  createRoot(document.body).render(app);
}
