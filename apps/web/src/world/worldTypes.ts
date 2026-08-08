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
  | "coffee"
  | "storage"
  | "door_exit";

export type SpatialState = {
  phase: SpatialPhase;
  roomId?: RoomId;
  nearbyHotspotId?: HotspotId;
  flavorMessage?: string;
};
