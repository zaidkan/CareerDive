/** Held-left-button drag to look. No pointer lock, capture, or preventDefault. */
export function bindLookControls(
  canvas: HTMLCanvasElement,
  onLook: (dx: number, dy: number) => void,
): () => void {
  let dragging = false;
  let x = 0;
  let y = 0;
  const stop = () => {
    dragging = false;
  };
  const down = (event: PointerEvent) => {
    if (event.button !== 0) return;
    dragging = true;
    x = event.clientX;
    y = event.clientY;
  };
  const move = (event: PointerEvent) => {
    if (!dragging || !(event.buttons & 1)) {
      stop();
      return;
    }
    onLook(event.clientX - x, event.clientY - y);
    x = event.clientX;
    y = event.clientY;
  };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  const stops: ReadonlyArray<readonly [EventTarget, string]> = [
    [canvas, "pointerleave"],
    [document, "pointerup"],
    [document, "pointercancel"],
    [document, "fullscreenchange"],
    [window, "blur"],
  ];
  for (const [target, type] of stops) target.addEventListener(type, stop);
  return () => {
    stop();
    canvas.removeEventListener("pointerdown", down);
    canvas.removeEventListener("pointermove", move);
    for (const [target, type] of stops) target.removeEventListener(type, stop);
  };
}
