import { createRoot } from "react-dom/client";
import type { ClientView, Debrief } from "@sim/schemas";
import { AlertRecords } from "../src/components/tools/AlertRecords.js";
import { ArtifactDetail } from "../src/components/artifacts.js";
import { CaseReview } from "../src/components/tools/CaseReview.js";
import { DebriefView } from "../src/components/DebriefView.js";
import { EmailTool } from "../src/components/tools/EmailTool.js";
import { RecordQueryTool } from "../src/components/tools/RecordQueryTool.js";
import { TeamChatTool } from "../src/components/tools/TeamChatTool.js";
import { DeskOs } from "../src/world/deskOs/DeskOs.js";
import { OsSessionProvider } from "../src/world/deskOs/osSession.js";
import { RoomCanvas } from "../src/world/RoomCanvas.js";
import "../src/foundation.css";
import "../src/styles.css";
import "./product-media.css";

type Scene = "a-01" | "a-02" | "a-03" | "a-04" | "a-05" | "a-06" |
  "a-07" | "a-08" | "a-09" | "a-10" | "a-11" | "a-12";

const labels: Record<Scene, string> = {
  "a-01": "A-1042 alert", "a-02": "Sign-in timeline", "a-03": "Device inventory",
  "a-04": "Account history", "a-05": "VPN context", "a-06": "Investigation ticket",
  "a-07": "Morgan status", "a-08": "Handoff", "a-09": "Scanner comparison",
  "a-10": "Debrief", "a-11": "Workplace / SOC", "a-12": "Desk OS",
};

function ProductScene({ scene, view, debrief }: { scene: Scene; view: ClientView; debrief?: Debrief }) {
  const noAction = () => {};
  if (scene === "a-12") return <OsSessionProvider><div className="capture-desk"><DeskOs phase="seated_monitor" view={view} onAction={noAction} onLoginSuccess={noAction} onStand={noAction} onOsFullscreen={noAction} osFullscreen /></div></OsSessionProvider>;
  if (scene === "a-11") return <div className="capture-room"><RoomCanvas enabled={false} onNearbyChange={noAction} onInteract={noAction} onBreakRoomExit={noAction} mouseSensitivity={1} workplace={view.workplace} /></div>;
  if (scene === "a-10") return debrief ? <DebriefView debrief={debrief} /> : null;
  if (scene === "a-01") return <AlertRecords view={view} eventId="suspicious-login-1" />;
  if (["a-02", "a-03", "a-05", "a-09"].includes(scene)) return <RecordQueryTool view={view} queryAction={view.availableActions.find(({ id }) => id === "query_records")} onQueryRecords={noAction} />;
  if (scene === "a-04") {
    const artifact = view.artifacts.find(({ id }) => id === "account-history-1");
    return artifact ? <ArtifactDetail artifact={artifact} /> : null;
  }
  if (scene === "a-06") return <CaseReview view={view} actions={view.availableActions.filter(({ eventId }) => eventId === "suspicious-login-1")} />;
  if (scene === "a-07") return <OsSessionProvider><TeamChatTool view={view} /></OsSessionProvider>;
  if (scene === "a-08") return <EmailTool artifacts={view.artifacts.filter(({ systemId, eventIds }) => systemId === "email" && eventIds.some((id) => view.events.some((event) => event.id === id && event.status !== "pending")))} selectedId="handoff-email" onSelect={noAction} />;
  return null;
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Product media fixture root missing");
const root = createRoot(rootElement);
declare global {
  interface Window {
    renderProductMedia: (scene: Scene, view: ClientView, theme: "light" | "dark", debrief?: Debrief) => void;
  }
}
window.renderProductMedia = (scene, view, theme, debrief) => {
  document.documentElement.dataset.theme = theme;
  root.render(<main className={`simulation-main capture capture-${scene}`} data-scene={scene}>
    <header className="capture-heading"><span>VERDALY · SOC OPS</span><strong>{labels[scene]}</strong></header>
    <div className="capture-content"><ProductScene scene={scene} view={view} {...(debrief ? { debrief } : {})} /></div>
    <footer className="capture-footer">Career Expo · Cybersecurity Analyst · Simulated workplace</footer>
  </main>);
};
