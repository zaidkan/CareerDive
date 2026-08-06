import type { RoomId, SpatialState } from "./worldTypes.js";

export const INITIAL_SPATIAL: SpatialState = {
  phase: "floor_map",
};

export type SpatialEvent =
  | { type: "enter_room"; roomId: RoomId }
  | { type: "leave_room" }
  | { type: "sit_desk" }
  | { type: "focus_desk" }
  | { type: "stand" }
  | { type: "set_nearby"; hotspotId?: SpatialState["nearbyHotspotId"] }
  | { type: "set_flavor"; message?: string };

export function reduceSpatialEvent(
  state: SpatialState,
  event: SpatialEvent,
): SpatialState {
  switch (event.type) {
    case "enter_room":
      return { phase: "room_walk", roomId: event.roomId };
    case "leave_room":
      return { phase: "floor_map" };
    case "sit_desk":
      return { ...state, phase: "seated_monitor", flavorMessage: undefined };
    case "focus_desk":
      return { ...state, phase: "focus_desk" };
    case "stand":
      return { ...state, phase: "room_walk" };
    case "set_nearby":
      return { ...state, nearbyHotspotId: event.hotspotId };
    case "set_flavor":
      return { ...state, flavorMessage: event.message };
    default:
      return state;
  }
}
