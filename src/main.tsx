import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initDataSaver } from "./lib/data-saver";

// Aplica el modo ahorro de datos guardado antes del primer paint.
initDataSaver();

createRoot(document.getElementById("root")!).render(<App />);
