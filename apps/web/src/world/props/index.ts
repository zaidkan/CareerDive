/**
 * Barrel for the stylized SOC props. Prefer importing the domain module
 * directly; this exists so a caller pulling from several domains can use one
 * specifier.
 */
export {
  CeilingAC,
  CityGlazing,
  Thermostat,
  WallPanel,
} from "./building.js";
export { DustMotes, VentPapers } from "./atmosphere.js";
export {
  AccentPoster,
  EmployeeOfMonth,
  FramedCertificate,
  PlantPot,
  TallFloorPlant,
  WallArt,
  WallClock,
} from "./decor.js";
export { CarpetRunner, FloorTileGrid } from "./floor.js";
export {
  BreakTable,
  CoatRack,
  CubicleWalls,
  DeskFrame,
  DESK_SURFACE_Y,
  MonitorArmDesk,
  OfficeChair,
  PersonalLockers,
  StorageCabinet,
  TrashBin,
} from "./furniture.js";
export { CoffeePot, Fridge, SnackBasket } from "./kitchen.js";
export { CeilingFixture, TaskLamp } from "./lighting.js";
export {
  LoginPostIt,
  MeshLabel,
  StickyNotes,
  WallCalendar,
  Whiteboard,
} from "./signage.js";
export {
  DeskClutter,
  DocumentShredder,
  DualMonitor,
  KeyboardMouse,
  SecurityCamera,
  ServerRack,
} from "./tech.js";
