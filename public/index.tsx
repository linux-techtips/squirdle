import { createRoot } from "react-dom/client";
import { StrictMode } from "react";

import App from "./App";

import "@picocss/pico";

const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

if (import.meta.hot) {
  const root = (import.meta.hot.data.root ??= createRoot(document.body));
  root.render(app);
} else {
  createRoot(document.body).render(app);
}
