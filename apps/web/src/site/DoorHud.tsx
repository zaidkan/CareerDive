export function DoorHud({
  reducedMotion,
  onStart,
}: {
  reducedMotion: boolean;
  onStart: () => void;
}) {
  return (
    <div
      className={`door-hud${reducedMotion ? " door-hud-static" : ""}`}
      role="region"
      aria-label="Verdaly doors: start your first day"
    >
      <div className="door-hud-frame" aria-hidden="true">
        <span className="door-hud-corner tl" />
        <span className="door-hud-corner tr" />
        <span className="door-hud-corner bl" />
        <span className="door-hud-corner br" />
      </div>
      <p className="door-hud-top">
        <span>VERDALY OS · Day 1</span>
        <span>08:59 · Tower doors</span>
      </p>
      <h3>
        Begin your
        <br />
        first day!
      </h3>
      <button type="button" className="start-shift" onClick={onStart} autoFocus>
        Start your first day
      </button>
    </div>
  );
}
