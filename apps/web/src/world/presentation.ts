import type { HotspotId, RoomId, SpatialState } from "./worldTypes.js";

export const INITIAL_SPATIAL: SpatialState = {
  phase: "floor_map",
};

export type SpatialEvent =
  | { type: "enter_room"; roomId: RoomId }
  | { type: "leave_room" }
  | { type: "sit_desk" }
  | { type: "login_success" }
  | { type: "focus_desk" }
  | { type: "unfocus_desk" }
  | { type: "stand" }
  | { type: "set_nearby"; hotspotId?: HotspotId }
  | { type: "set_flavor"; message?: string };

export function reduceSpatialEvent(
  state: SpatialState,
  event: SpatialEvent,
): SpatialState {
  switch (event.type) {
    case "enter_room":
      return {
        phase: "room_walk",
        roomId: event.roomId,
        ...(state.visitedDesk ? { visitedDesk: true } : {}),
      };
    case "leave_room":
      return {
        phase: "floor_map",
        ...(state.visitedDesk ? { visitedDesk: true } : {}),
      };
    case "sit_desk": {
      const next: SpatialState = {
        ...state,
        phase: "desk_login",
        visitedDesk: true,
      };
      delete next.flavorMessage;
      return next;
    }
    case "login_success":
      return { ...state, phase: "seated_monitor" };
    case "focus_desk":
      return { ...state, phase: "focus_desk" };
    case "unfocus_desk":
      return state.phase === "focus_desk"
        ? { ...state, phase: "seated_monitor" }
        : state;
    case "stand":
      return { ...state, phase: "room_walk" };
    case "set_nearby": {
      const next: SpatialState = { ...state };
      if (event.hotspotId === undefined) {
        delete next.nearbyHotspotId;
      } else {
        next.nearbyHotspotId = event.hotspotId;
      }
      return next;
    }
    case "set_flavor": {
      const next: SpatialState = { ...state };
      if (event.message === undefined) {
        delete next.flavorMessage;
      } else {
        next.flavorMessage = event.message;
      }
      return next;
    }
    default:
      return state;
  }
}
