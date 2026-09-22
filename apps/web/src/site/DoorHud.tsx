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
      role="dialog"
      aria-label="Verdaly doors: start your first day"
    >
      <div className="door-hud-frame" aria-hidden="true">
        <span className="door-hud-corner tl" />
        <span className="door-hud-corner tr" />
        <span className="door-hud-corner bl" />
        <span className="door-hud-corner br" />
        <span className="door-hud-scan" />
      </div>
      <p className="door-hud-top">
        <span>VERDALY OS · Day 1</span>
        <span>08:59 · Tower doors</span>
      </p>
      <h3>You made it. Doors hold.</h3>
      <dl className="door-hud-meta">
        <div>
          <dt>Location</dt>
          <dd>Verdaly tower entrance</dd>
        </div>
        <div>
          <dt>Shift</dt>
          <dd>10–15 min · single shift</dd>
        </div>
        <div>
          <dt>Next</dt>
          <dd>Badge in, meet team, desk in Security Operations</dd>
        </div>
      </dl>
      <button type="button" className="start-shift" onClick={onStart} autoFocus>
        Start your first day
      </button>
    </div>
  );
}
