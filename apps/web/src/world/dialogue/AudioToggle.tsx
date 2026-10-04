import { setSimulationMuted, useSimulationMuted } from "./audio.js";
export function AudioToggle() {
  const muted = useSimulationMuted();
  return (
    <button
      type="button"
      data-dialogue-immediate="true"
      aria-label="Mute simulation audio"
      aria-pressed={muted}
      onClick={() => {
        setSimulationMuted(!muted);
      }}
    >
      {muted ? "Sound off" : "Sound on"}
    </button>
  );
}
