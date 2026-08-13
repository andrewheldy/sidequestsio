import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ReadinessBrief from "../../src/pages/ReadinessBrief";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ReadinessBrief />
  </StrictMode>,
);
