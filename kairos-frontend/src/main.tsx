import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initReownAppKit } from "@/lib/reown";

initReownAppKit();

createRoot(document.getElementById("root")!).render(<App />);
