import { createRoot } from "react-dom/client";

import * as Router from "@/public/router";
import * as React from "react";

import App from "./App";

import "@picocss/pico";

const app = (
  <React.StrictMode>
    <Router.Provider>
      <App />
    </Router.Provider>
  </React.StrictMode>
);

if (import.meta.hot) {
  const root = (import.meta.hot.data.root ??= createRoot(document.body));
  root.render(app);
} else {
  createRoot(document.body).render(app);
}
