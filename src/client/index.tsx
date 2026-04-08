import { createRoot } from "react-dom/client";
import * as react from "react";

import App from "./components/App";

import "@picocss/pico";
import "./style.css";

const app = (
  <react.StrictMode>
    <App />
  </react.StrictMode>
);

if (import.meta.hot) {
  const root = (import.meta.hot.data.root ??= createRoot(document.body));
  root.render(app);
} else {
  createRoot(document.body).render(app);
}
