import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { seedIfEmpty } from "./db/seed";
import "./index.css";

seedIfEmpty().then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
