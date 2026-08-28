import type { ClientWorkplaceState, WorkplaceInteraction } from "@sim/schemas";

export type ResourceControl = {
  label: string;
  interaction?: WorkplaceInteraction;
  reason?: string;
};

export function energyTone(
  workplace: ClientWorkplaceState,
): "ok" | "low" | "critical" {
  const ratio = workplace.energy.current / workplace.energy.max;
  if (ratio <= 0.12) return "critical";
  if (ratio <= 0.28) return "low";
  return "ok";
}

export function energyPercent(workplace: ClientWorkplaceState): number {
  return Math.round((workplace.energy.current / workplace.energy.max) * 100);
}

export function fridgeControl(
  workplace: ClientWorkplaceState,
): ResourceControl {
  if (!workplace.fridgeOpen) {
    return {
      label: "Open fridge",
      interaction: { type: "open_fridge" },
    };
  }
  if (workplace.fridgeSnackBars === 0) {
    return {
      label: "Close fridge",
      interaction: { type: "close_fridge" },
      reason: "The fridge is empty.",
    };
  }
  if (workplace.carriedSnackBites > 0) {
    return {
      label: "Close fridge",
      interaction: { type: "close_fridge" },
      reason: "Your hands are full.",
    };
  }
  return {
    label: "Take one snack bar",
    interaction: { type: "take_snack" },
  };
}

export function coffeeControl(
  workplace: ClientWorkplaceState,
): ResourceControl {
  switch (workplace.coffeeStage) {
    case "idle":
      return workplace.coffeeServings > 0
        ? {
            label: "Start coffee",
            interaction: { type: "start_coffee" },
          }
        : {
            label: "Coffee unavailable",
            reason: "No coffee servings remain.",
          };
    case "brewing":
      return {
        label: "Finish brewing",
        interaction: { type: "finish_coffee" },
      };
    case "ready":
      return workplace.coffeeServings > 0
        ? {
            label: "Pour coffee",
            interaction: { type: "pour_coffee" },
          }
        : {
            label: "Coffee unavailable",
            reason: "No coffee servings remain.",
          };
    case "poured":
      return workplace.energy.current < workplace.energy.max
        ? {
            label: "Drink coffee",
            interaction: { type: "drink_coffee" },
          }
        : {
            label: "Drink coffee",
            reason: "Energy is already full.",
          };
  }
}

export function snackControl(
  workplace: ClientWorkplaceState,
): ResourceControl | undefined {
  const bites = workplace.carriedSnackBites;
  if (bites === 0) return undefined;
  const label = `Eat snack — ${String(bites)} ${bites === 1 ? "bite" : "bites"} remaining`;
  return workplace.energy.current < workplace.energy.max
    ? { label, interaction: { type: "eat_snack_bite" } }
    : { label, reason: "Energy is already full." };
}

export function coffeeStageLabel(
  stage: ClientWorkplaceState["coffeeStage"],
): string {
  switch (stage) {
    case "idle":
      return "Idle";
    case "brewing":
      return "Brewing — advance it when you are ready";
    case "ready":
      return "Ready to pour";
    case "poured":
      return "Cup poured";
  }
}
