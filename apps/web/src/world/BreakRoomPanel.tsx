import type { ClientWorkplaceState, WorkplaceInteraction } from "@sim/schemas";
import {
  coffeeControl,
  coffeeStageLabel,
  energyPercent,
  energyTone,
  fridgeControl,
  snackControl,
} from "./breakRoom.js";

type SubmitInteraction = (interaction: WorkplaceInteraction) => void;

export function EmergencyRecoveryControl({ workplace, onSubmit, pending = false }: {
  workplace: ClientWorkplaceState;
  onSubmit: SubmitInteraction;
  pending?: boolean;
}) {
  if (workplace.energy.current !== 0 || workplace.emergencyRecoveryUsed ||
    workplace.carriedSnackBites !== 0 || workplace.fridgeSnackBars !== 0 ||
    workplace.coffeeServings !== 0 || workplace.coffeeStage !== "idle") return null;
  return <button type="button" disabled={pending} data-interaction-id="emergency_recovery"
    onClick={() => { onSubmit({ type: "emergency_recovery" }); }}>Use emergency recovery</button>;
}

export function EnergyMeter({
  workplace,
}: {
  workplace: ClientWorkplaceState;
}) {
  const { current, max } = workplace.energy;
  const tone = energyTone(workplace);
  return (
    <div
      aria-label="Energy"
      aria-valuemax={max}
      aria-valuemin={0}
      aria-valuenow={current}
      className={`energy-meter energy-meter-${tone}`}
      data-testid="energy-meter"
      role="meter"
    >
      <span className="energy-meter-label">Energy</span>
      <span className="energy-meter-value">
        {current}/{max}
      </span>
      <span className="energy-meter-track">
        <span
          className="energy-meter-fill"
          style={{ width: `${String(energyPercent(workplace))}%` }}
        />
      </span>
      {current === 0 ? (
        <span className="energy-recovery">
          Energy is empty. Eat a carried snack or visit the break-room fridge
          and coffee maker to recover.
        </span>
      ) : null}
    </div>
  );
}

export function CarriedSnackControl({
  workplace,
  onSubmit,
  pending = false,
}: {
  workplace: ClientWorkplaceState;
  onSubmit: SubmitInteraction;
  pending?: boolean;
}) {
  const control = snackControl(workplace);
  if (!control) return null;
  return (
    <div className="carried-snack-control">
      <button
        className="guidance-secondary"
        data-interaction-id="eat_snack_bite"
        disabled={pending || !control.interaction}
        onClick={() => {
          if (control.interaction) onSubmit(control.interaction);
        }}
        type="button"
      >
        {control.label}
      </button>
      {control.reason ? (
        <span className="resource-unavailable">{control.reason}</span>
      ) : null}
    </div>
  );
}

export function BreakRoomPanel({
  station,
  workplace,
  onSubmit,
  pending = false,
}: {
  station: "fridge" | "coffee";
  workplace: ClientWorkplaceState;
  onSubmit: SubmitInteraction;
  pending?: boolean;
}) {
  const control =
    station === "fridge" ? fridgeControl(workplace) : coffeeControl(workplace);
  return (
    <section
      aria-label={station === "fridge" ? "Fridge controls" : "Coffee controls"}
      className="break-room-panel"
    >
      <div className="break-room-status">
        <strong>{station === "fridge" ? "Fridge" : "Coffee maker"}</strong>
        {station === "fridge" ? (
          workplace.fridgeOpen && workplace.fridgeSnackBars > 0 ? (
            <span>
              {workplace.fridgeSnackBars} snack{" "}
              {workplace.fridgeSnackBars === 1 ? "bar" : "bars"} inside
            </span>
          ) : (
            <span>{workplace.fridgeOpen ? "Open" : "Closed"}</span>
          )
        ) : (
          <span>
            {coffeeStageLabel(workplace.coffeeStage)} ·{" "}
            {workplace.coffeeServings}{" "}
            {workplace.coffeeServings === 1 ? "serving" : "servings"} remaining
          </span>
        )}
      </div>
      {control.reason ? (
        <p className="resource-unavailable">{control.reason}</p>
      ) : null}
      <div className="break-room-actions">
        <button
          className="start-shift"
          data-interaction-id={control.interaction?.type}
          disabled={pending || !control.interaction}
          onClick={() => {
            if (control.interaction) onSubmit(control.interaction);
          }}
          type="button"
        >
          {control.label}
        </button>
        {station === "fridge" &&
        workplace.fridgeOpen &&
        control.interaction?.type === "take_snack" ? (
          <button
            className="guidance-secondary"
            data-interaction-id="close_fridge"
            disabled={pending}
            onClick={() => {
              onSubmit({ type: "close_fridge" });
            }}
            type="button"
          >
            Close fridge
          </button>
        ) : null}
      </div>
    </section>
  );
}
