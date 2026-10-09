import { setSimulationMuted, useSimulationMuted } from "./audio.js";
export function AudioToggle() {
  const muted = useSimulationMuted();
  return (
    <button
      type="button"
      data-dialogue-immediate="true"
      aria-label={
        muted ? "Sound off — turn sound on" : "Sound on — turn sound off"
      }
      aria-pressed={!muted}
      onClick={() => {
        setSimulationMuted(!muted);
      }}
    >
      {muted ? "Sound off — turn on" : "Sound on — turn off"}
    </button>
  );
}
