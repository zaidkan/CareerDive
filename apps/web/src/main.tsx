import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SiteApp } from "./site/SiteApp.js";
import "./styles.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element is missing");
}

createRoot(root).render(
  <StrictMode>
    <SiteApp />
  </StrictMode>,
);
