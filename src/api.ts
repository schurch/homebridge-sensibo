require("@babel/polyfill");

import {
  DeviceDetails,
  APIResponse,
  DeviceState,
  Update,
  FanLevel,
  Mode,
  Swing,
} from "./model";

import { Log, LogLevel } from "./log";
const axios = require("axios");

type UpdatePayload = { newValue: number | boolean | FanLevel | Mode | Swing };

export class API {
  private static maxRefreshSeconds = 120;

  private baseURL: string;
  private apiKey: string;
  private cachedDetails?: DeviceDetails;
  private lastRequestTime?: number;
  private log: Log;

  constructor(baseURL: string, apiKey: string, log: Log) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
    this.log = log;
  }

  private deviceURL(deviceID: string): string {
    const path = this.baseURL + "/api/v2/pods/" + deviceID;
    const queryStringParameters =
      "apiKey=" + this.apiKey + "&fields=acState,measurements";
    return path + "?" + queryStringParameters;
  }

  private deviceUpdateURL(deviceID: string, update: Update): string {
    const path =
      this.baseURL + "/api/v2/pods/" + deviceID + "/acStates/" + update.kind;
    const queryStringParameters = "apiKey=" + this.apiKey + "&fields=acState";
    return path + "?" + queryStringParameters;
  }

  private deviceSetURL(deviceID: string): string {
    const path = this.baseURL + "/api/v2/pods/" + deviceID + "/acStates";
    const queryStringParameters = "apiKey=" + this.apiKey + "&fields=acState";
    return path + "?" + queryStringParameters;
  }

  private shouldUseCachedDetails(): boolean {
    if (!this.cachedDetails) {
      return false;
    }

    if (!this.lastRequestTime) {
      return false;
    }

    const currentTime = Date.now();
    const timeSinceLastRequest = currentTime - this.lastRequestTime;

    const shouldUseCachedDetails =
      timeSinceLastRequest < API.maxRefreshSeconds * 1000;

    return shouldUseCachedDetails;
  }

  async getDeviceDetails(deviceID: string): Promise<DeviceDetails | null> {
    if (this.shouldUseCachedDetails() && this.cachedDetails) {
      this.log(LogLevel.Debug, "Using cached device details response");
      return this.cachedDetails;
    } else {
      this.log(LogLevel.Debug, "Performing get device details request");
    }

    try {
      const url = this.deviceURL(deviceID);
      const response = await axios.get(url);
      const apiResponse: APIResponse = response.data;

      this.lastRequestTime = Date.now();
      this.cachedDetails = apiResponse.result;

      return apiResponse.result;
    } catch (error) {
      this.log(LogLevel.Error, error);

      return null;
    }
  }

  async updateDeviceState(
    deviceID: string,
    update: Update,
  ): Promise<DeviceState | null> {
    try {
      const payload = API.payloadForUpdate(update);
      const url = this.deviceUpdateURL(deviceID, update);
      const response = await axios.patch(url, payload);
      const apiResponse: APIResponse = response.data;

      this.lastRequestTime = Date.now();
      this.cachedDetails = apiResponse.result;

      return apiResponse.result.acState;
    } catch (error) {
      this.log(LogLevel.Error, error);

      return null;
    }
  }

  async setDeviceState(
    deviceID: string,
    state: DeviceState,
  ): Promise<DeviceState | null> {
    try {
      const url = this.deviceSetURL(deviceID);
      const response = await axios.post(url, state);
      const apiResponse: APIResponse = response.data;

      this.lastRequestTime = Date.now();
      this.cachedDetails = apiResponse.result;

      return apiResponse.result.acState;
    } catch (error) {
      this.log(LogLevel.Error, error);

      return null;
    }
  }

  private static payloadForUpdate(update: Update): UpdatePayload {
    switch (update.kind) {
      case "on":
        return { newValue: update.value };
      case "fanLevel":
        return { newValue: update.value };
      case "targetTemperature":
        return { newValue: update.value };
      case "mode":
        return { newValue: update.value };
      case "swing":
        return { newValue: update.value };
      default:
        return assertNever(update);
    }
  }
}

function assertNever(x: Update): never {
  throw new Error("Unexpected object: " + x);
}
