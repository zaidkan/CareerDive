import { flushSync } from "react-dom";
import { prefersReducedMotion } from "./os/reducedMotion.js";

/** Animate presentation only, after the server has accepted the real mutation.
 * Await DOM update, never animation completion. Older browsers update normally.
 */
export async function updateWorkspacePresentation(
  update: () => void,
): Promise<void> {
  const startTransition =
    typeof document === "undefined"
      ? undefined
      : (document as { startViewTransition?: Document["startViewTransition"] })
          .startViewTransition;
  if (
    typeof document === "undefined" ||
    !startTransition ||
    prefersReducedMotion() ||
    !document.querySelector(".desk-workspace .workspace-panel")
  ) {
    update();
    return;
  }
  let applied = false;
  const commit = () => {
    if (applied) return;
    applied = true;
    flushSync(update);
  };
  let transition: ViewTransition;
  try {
    transition = startTransition.call(document, commit);
  } catch {
    commit();
    return;
  }
  // A skipped/unsupported snapshot must never lose or replay the accepted update.
  void transition.ready.catch(() => {});
  void transition.finished.catch(() => {});
  await transition.updateCallbackDone.catch(() => {
    commit();
  });
}
