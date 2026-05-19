import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import PresenterView from "./PresenterView.jsx";
import PresentationView from "./PresentationView.jsx";
import "./index.css";

const params = new URLSearchParams(window.location.search);
const view = params.has("present") ? "present" : params.has("presenter") ? "presenter" : "editor";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {view === "present"   && <PresentationView />}
    {view === "presenter" && <PresenterView />}
    {view === "editor"    && <App />}
  </React.StrictMode>
);
