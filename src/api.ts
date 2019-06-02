require("@babel/polyfill");

import {
  DeviceStateUpdate,
  DeviceDetails,
  APIResponse,
  DeviceState,
} from "./model";

const axios = require("axios");

export class API {
  private baseURL: string;
  private apiKey: string;

  constructor(baseURL: string, apiKey: string) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
  }

  private deviceURL(deviceID: string): string {
    const path = this.baseURL + "/api/v2/pods/" + deviceID;
    const queryStringParameters =
      "apiKey=" + this.apiKey + "&fields=acState,measurements";
    return path + "?" + queryStringParameters;
  }

  private deviceUpdateURL(deviceID: string): string {
    const path = this.baseURL + "/api/v2/pods/" + deviceID + "/acStates";
    const queryStringParameters =
      "apiKey=" + this.apiKey + "&fields=acState,measurements";
    return path + "?" + queryStringParameters;
  }

  async getDeviceDetails(deviceID: string): Promise<DeviceDetails | null> {
    try {
      const url = this.deviceURL(deviceID);
      const response = await axios.get(url);
      let apiResponse: APIResponse = response.data;

      return apiResponse.result;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async setDeviceState(
    deviceID: string,
    state: DeviceStateUpdate,
  ): Promise<DeviceState | null> {
    try {
      const url = this.deviceUpdateURL(deviceID);
      const test = JSON.stringify(state);
      console.error(test);
      const response = await axios.post(url, state);

      let apiResponse: APIResponse = response.data;

      return apiResponse.result.acState;
    } catch (error) {
      console.error(error);
      return null;
    }
  }
}
