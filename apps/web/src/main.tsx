import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { SiteApp } from "./site/SiteApp.js";
import "./foundation.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element is missing");
}

const app = <StrictMode><SiteApp /></StrictMode>;
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
