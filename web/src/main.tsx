import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Restore the deep link encoded by GitHub Pages' 404.html fallback.
const redirected = new URLSearchParams(window.location.search).get("/");
if (redirected) {
  try {
    window.history.replaceState(null, "", decodeURIComponent(redirected));
  } catch { /* keep the current URL */ }
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode><App /></React.StrictMode>,
);
