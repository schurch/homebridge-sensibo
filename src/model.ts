require("@babel/polyfill");

export interface DeviceDetails {
  acState: DeviceState;
  measurements: Measurements;
}

export interface APIResponse {
  status: string;
  result: DeviceDetails;
}

export interface DeviceState {
  on?: boolean;
  fanLevel?: FanLevel;
  targetTemperature?: number;
  mode?: Mode;
  swing?: Swing;
}

export interface Measurements {
  temperature: number;
  humitity: number;
}

export class DeviceStateUpdate {
  acState: State;

  constructor(state: State) {
    this.acState = state;
  }
}

export class State implements DeviceState {
  on?: boolean;
  fanLevel?: FanLevel;
  targetTemperature?: number;
  mode?: Mode;
  swing?: Swing;

  constructor(
    on?: boolean,
    fanLevel?: FanLevel,
    targetTemperature?: number,
    mode?: Mode,
    swing?: Swing,
  ) {
    this.on = on;
    this.fanLevel = fanLevel;
    this.targetTemperature = targetTemperature;
    this.mode = mode;
    this.swing = swing;
  }
}

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
