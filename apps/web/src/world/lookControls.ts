/** Pointer lock where supported; held-button drag otherwise. No simulation state. */
export function bindLookControls(
  canvas: HTMLCanvasElement,
  onLook: (dx: number, dy: number) => void,
): () => void {
  let dragging = false;
  let x = 0;
  let y = 0;
  let requesting = false;
  const stop = () => {
    dragging = false;
  };
  const down = (event: PointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    dragging = true;
    x = event.clientX;
    y = event.clientY;
    if (
      document.pointerLockElement === canvas ||
      requesting ||
      typeof canvas.requestPointerLock !== "function"
    )
      return;
    requesting = true;
    try {
      void Promise.resolve(canvas.requestPointerLock())
        .catch(() => undefined)
        .finally(() => {
          requesting = false;
        });
    } catch {
      requesting = false;
    }
  };
  const move = (event: MouseEvent) => {
    if (document.pointerLockElement === canvas) {
      onLook(event.movementX, event.movementY);
    } else if (dragging && event.buttons & 1) {
      onLook(event.clientX - x, event.clientY - y);
      x = event.clientX;
      y = event.clientY;
    }
  };
  canvas.addEventListener("pointerdown", down);
  document.addEventListener("mousemove", move);
  document.addEventListener("pointerup", stop);
  document.addEventListener("pointercancel", stop);
  document.addEventListener("pointerlockchange", stop);
  window.addEventListener("blur", stop);
  return () => {
    stop();
    canvas.removeEventListener("pointerdown", down);
    document.removeEventListener("mousemove", move);
    document.removeEventListener("pointerup", stop);
    document.removeEventListener("pointercancel", stop);
    document.removeEventListener("pointerlockchange", stop);
    window.removeEventListener("blur", stop);
  };
}
