import { expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { applyAction as a, applyTaskAttempt, applyWorkplaceInteraction as w, availableActions, createInitialWorldState, toClientView } from "../src/index.js";
const EVENT = "suspicious-login-1", ROUTINE = "routine-alert-1";
function req<T>(v: T | undefined) { if (!v) throw new Error("missing"); return v; }
function walk(state: any, id: string, ev: string) {
  const act = availableActions(state).find((x: any) => x.id === id && x.eventId === ev);
  if (!act?.taskId) return a(state, { id, eventId: ev, actorId: "user" }).state;
  const task = req(state.rules.tasks[act.taskId]);
  for (const step of task.steps) {
    for (const s of new Set(step.options.flatMap((o: any) => (o.source ? [o.source.artifactId] : [])))) {
      const sid = s.artifactId ?? s;
      if (state.observedArtifactIds.includes(sid)) continue;
      state = w(state, { type: "open_artifact", artifactId: sid }).state;
    }
    state = applyTaskAttempt(state, { taskId: task.id, eventId: ev, selectedOptionIds: step.requiredOptionIds }).state;
  }
  return state;
}
it("post-fire", () => {
  const evt = "suspicious-login-1";
  let state = createInitialWorldState("probe-post2", 7, {}, loadDefaultCybersecurityPack());
  for (const id of ["review_alert","inspect_login_context","inspect_account_history","check_device_inventory"]) state = walk(state, id, evt);
  for (const id of ["dismiss_alert","review_alert","search_knowledge_base","document_ticket"]) state = walk(state, id, id==="review_alert"||id==="search_knowledge_base"||id==="document_ticket"?ROUTINE:evt);
  console.log("clock", state.simClock, "status", state.events.find((e:any)=>e.id===evt)?.statusClaim);
  const view = toClientView(state);
  for (const ev of view.events) {
    console.log("EVENT", ev.id, ev.statusClaim, "actions", view.availableActions.filter((x:any)=>x.eventId===ev.id).map((x:any)=>x.id).join(","));
  }
  expect(true).toBe(true);
});
