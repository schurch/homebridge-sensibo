require("@babel/polyfill");

// Interfaces
export interface DeviceDetails {
  acState: DeviceState;
  measurements?: Measurements;
}

export interface APIResponse {
  status: string;
  result: DeviceDetails;
}

export interface DeviceState {
  on: boolean;
  fanLevel: FanLevel;
  targetTemperature: number;
  mode: Mode;
  swing: Swing;
}

export interface Measurements {
  temperature: number;
  humitity: number;
}

export interface IsOnUpdate {
  kind: "on";
  value: boolean;
}

export interface FanLevelUpdate {
  kind: "fanLevel";
  value: FanLevel;
}

export interface TargetTemperatureUpdate {
  kind: "targetTemperature";
  value: number;
}

export interface ModeUpdate {
  kind: "mode";
  value: Mode;
}

export interface SwingUpdate {
  kind: "swing";
  value: Swing;
}

export type Update =
  | IsOnUpdate
  | FanLevelUpdate
  | TargetTemperatureUpdate
  | ModeUpdate
  | SwingUpdate;

export enum FanLevel {
  Quiet = "quiet",
  Low = "low",
  Medium = "medium",
  MediumHigh = "mediumHigh",
  High = "high",
  Auto = "auto",
}

export enum Swing {
  Stopped = "stopped",
  FixedTop = "fixedTop",
  FixedMiddleTop = "fixedMiddleTop",
  FixedMiddle = "fixedMiddle",
  FixedMiddleBottom = "fixedMiddleBottom",
  FixedBottom = "fixedBottom",
  RangeFull = "rangeFull",
}

export enum Mode {
  Dry = "dry",
  Auto = "auto",
  Heat = "heat",
  Cool = "cool",
}
