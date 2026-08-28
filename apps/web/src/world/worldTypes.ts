export type SpatialPhase =
  | "floor_map"
  | "room_walk"
  | "desk_login"
  | "seated_monitor"
  | "focus_desk";

export type RoomId = "soc" | "break_room" | "manager_office";

export type HotspotId =
  | "desk_player"
  | "alert_wall"
  | "morgan_station"
  | "break_door"
  | "jules"
  | "fridge"
  | "coffee"
  | "storage"
  | "door_exit";

export type SpatialState = {
  phase: SpatialPhase;
  roomId?: RoomId;
  nearbyHotspotId?: HotspotId;
  flavorMessage?: string;
  /** True once the player has used the workstation, so guidance stops onboarding them to it. */
  visitedDesk?: boolean;
};
