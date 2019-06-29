require("@babel/polyfill");

import { API } from "./api";
import {
  IsOnUpdate,
  Mode,
  Swing,
  FanLevel,
  SwingUpdate,
  TargetTemperatureUpdate,
  FanLevelUpdate,
  ModeUpdate,
  DeviceSummary,
} from "./model";
import { Log, LogLevel } from "./log";

const pluginName = "homebridge-sensibo";
const platformName = "Sensibo";

let Service: any;
let Characteristic: any;
let Accessory: any;
let UUIDGen: any;

export default function(homebridge: any) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  Accessory = homebridge.platformAccessory;
  UUIDGen = homebridge.hap.uuid;

  homebridge.registerPlatform(pluginName, platformName, SensiboPlatform, true);
}

class SensiboPlatform {
  private homebridgeAPI: any;
  private api!: API;
  private apiKey: string;
  private log: Log;
  private accessories: Map<string, SensiboAccessory>;

  constructor(log: Log, config: any, api: any) {
    this.accessories = new Map();
    this.log = log;
    this.apiKey = config["apiKey"];

    if (!this.apiKey) {
      this.log(
        LogLevel.Error,
        "Please specify the Homebridge API key in the platform config.",
      );
      return;
    }

    if (!api) {
      this.log(
        LogLevel.Error,
        "Expected the Homebridge API. Please update to latest version of Homebridge.",
      );
      return;
    }

    this.homebridgeAPI = api;
    this.api = new API(this.apiKey, this.log);

    this.homebridgeAPI.on("didFinishLaunching", () => {
      this.log(LogLevel.Debug, "Did finish launching platform...");

      this.api
        .getDevices()
        .then(devices => {
          if (devices == null) {
            this.log(LogLevel.Error, "No devices information returned.");
            return;
          }

          devices.forEach(device => {
            this.addDevice(device);
          });
        })
        .catch(error => {
          this.log(LogLevel.Error, "Error loading devices: " + error);
        });
    });
  }

  private addDevice(deviceSummary: DeviceSummary) {
    const deviceID = deviceSummary.id;
    if (this.accessories.has(deviceID)) {
      this.log(LogLevel.Debug, "Already loaded device with ID " + deviceID);
      return;
    }

    this.log(LogLevel.Debug, "Adding new device with ID " + deviceID);

    const uuid = UUIDGen.generate(deviceSummary.id);
    const name = deviceSummary.room.name + " AC";

    const newAccessory = new Accessory(name, uuid);
    newAccessory.addService(Service.HeaterCooler, name);
    newAccessory.context.deviceID = deviceSummary.id;

    const sensiboAccessory = new SensiboAccessory(
      this.apiKey,
      newAccessory.context.deviceID,
      newAccessory.getService(Service.HeaterCooler),
      this.log,
    );

    this.homebridgeAPI.registerPlatformAccessories(pluginName, platformName, [
      newAccessory,
    ]);

    this.accessories.set(deviceID, sensiboAccessory);
  }

  configureAccessory(homebridgeAccessory: any) {
    homebridgeAccessory.reachable = true;

    const deviceID: string = homebridgeAccessory.context.deviceID;

    this.log(LogLevel.Debug, "Loading cached device with ID " + deviceID);

    const sensiboAccessory = new SensiboAccessory(
      this.apiKey,
      deviceID,
      homebridgeAccessory.getService(Service.HeaterCooler),
      this.log,
    );

    this.accessories.set(deviceID, sensiboAccessory);
  }
}

class SensiboAccessory {
  private log: Log;
  private api: API;
  private deviceID: string;
  private heaterCoolerService: any;
  private isActive?: boolean;
  private fanLevel?: FanLevel;

  constructor(
    apiKey: string,
    deviceID: string,
    heaterCoolerService: any,
    log: Log,
  ) {
    this.log = log;
    this.deviceID = deviceID;
    this.api = new API(apiKey, this.log);
    this.heaterCoolerService = heaterCoolerService;

    this.log(
      LogLevel.Debug,
      "Initializing an accessory with device ID " + this.deviceID,
    );

    this.heaterCoolerService
      .getCharacteristic(Characteristic.Active)
      .on("get", this.getActive)
      .on("set", this.setActive);

    this.heaterCoolerService
      .getCharacteristic(Characteristic.CurrentHeaterCoolerState)
      .on("get", this.getCurrentHeaterCoolerState);

    this.heaterCoolerService
      .getCharacteristic(Characteristic.TargetHeaterCoolerState)
      .on("get", this.getTargetHeaterCoolerState)
      .on("set", this.setTargetHeaterCoolerState);

    this.heaterCoolerService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .on("get", this.getCurrentTemperature);

    this.heaterCoolerService
      .getCharacteristic(Characteristic.SwingMode)
      .on("get", this.getSwingMode)
      .on("set", this.setSwingMode);

    this.heaterCoolerService
      .getCharacteristic(Characteristic.CoolingThresholdTemperature)
      .on("get", this.getCoolingThresholdTemperature)
      .on("set", this.setCoolingThresholdTemperature);

    this.heaterCoolerService
      .getCharacteristic(Characteristic.HeatingThresholdTemperature)
      .on("get", this.getHeatingThresholdTemperature)
      .on("set", this.setHeatingThresholdTemperature);

    this.heaterCoolerService
      .getCharacteristic(Characteristic.RotationSpeed)
      .on("get", this.getRotationSpeed)
      .on("set", this.setRotationSpeed);
  }

  // Active
  getActive = (callback: Function) => {
    this.api.getDeviceDetails(this.deviceID).then(details => {
      if (!details) {
        callback(null);
        return;
      }
      const newValue = details.acState.on
        ? Characteristic.Active.ACTIVE
        : Characteristic.Active.INACTIVE;
      callback(null, newValue);
    });
  };

  setActive = (newValue: number, callback: Function) => {
    const newOnState = newValue == Characteristic.Active.ACTIVE ? true : false;

    if (this.isActive && this.isActive == true && newOnState == true) {
      callback(null);
      return;
    }

    const update: IsOnUpdate = {
      kind: "on",
      value: newOnState,
    };

    this.api.updateDeviceState(this.deviceID, update).then(state => {
      if (!state) {
        callback(null);
        return;
      }

      this.isActive = state.on;

      const newValue = state.on
        ? Characteristic.Active.ACTIVE
        : Characteristic.Active.INACTIVE;
      callback(null, newValue);
    });
  };

  // Heater/cooler state
  getCurrentHeaterCoolerState = (callback: Function) => {
    this.api.getDeviceDetails(this.deviceID).then(details => {
      if (!details) {
        callback(null, Characteristic.CurrentHeaterCoolerState.INACTIVE);
        return;
      }

      if (details.acState.on == false) {
        callback(null, Characteristic.CurrentHeaterCoolerState.INACTIVE);
        return;
      }

      switch (details.acState.mode) {
        case Mode.Heat:
          callback(null, Characteristic.CurrentHeaterCoolerState.HEATING);
          break;
        case Mode.Cool:
          callback(null, Characteristic.CurrentHeaterCoolerState.COOLING);
          break;
        default:
          callback(null, Characteristic.CurrentHeaterCoolerState.INACTIVE);
          break;
      }
    });
  };

  // Target heater/cooler state
  getTargetHeaterCoolerState = (callback: Function) => {
    this.api.getDeviceDetails(this.deviceID).then(details => {
      if (!details) {
        callback(null);
        return;
      }

      switch (details.acState.mode) {
        case Mode.Auto:
          callback(null, Characteristic.TargetHeaterCoolerState.AUTO);
          break;
        case Mode.Heat:
          callback(null, Characteristic.TargetHeaterCoolerState.HEAT);
          break;
        case Mode.Cool:
          callback(null, Characteristic.TargetHeaterCoolerState.COOL);
          break;
      }
    });
  };

  setTargetHeaterCoolerState = (newValue: number, callback: Function) => {
    var update: ModeUpdate;
    switch (newValue) {
      case Characteristic.TargetHeaterCoolerState.AUTO:
        update = {
          kind: "mode",
          value: Mode.Auto,
        };
        break;
      case Characteristic.TargetHeaterCoolerState.HEAT:
        update = {
          kind: "mode",
          value: Mode.Heat,
        };
        break;
      case Characteristic.TargetHeaterCoolerState.COOL:
        update = {
          kind: "mode",
          value: Mode.Cool,
        };
        break;
      default:
        update = {
          kind: "mode",
          value: Mode.Auto,
        };
        break;
    }

    this.api.updateDeviceState(this.deviceID, update).then(state => {
      if (!state) {
        callback(null, 0);
        return;
      }

      this.isActive = state.on;

      switch (state.mode) {
        case Mode.Auto:
          callback(null, Characteristic.TargetHeaterCoolerState.AUTO);
          break;
        case Mode.Heat:
          callback(null, Characteristic.TargetHeaterCoolerState.HEAT);
          break;
        case Mode.Cool:
          callback(null, Characteristic.TargetHeaterCoolerState.COOL);
          break;
      }
    });
  };

  // Temperature
  getCurrentTemperature = (callback: Function) => {
    this.api.getDeviceDetails(this.deviceID).then(details => {
      if (!details) {
        callback(null);
        return;
      }

      if (!details.measurements) {
        callback(null);
        return;
      }

      const currentValue = details.measurements.temperature;
      callback(null, currentValue);
    });
  };

  // Swing Mode
  getSwingMode = (callback: Function) => {
    this.api.getDeviceDetails(this.deviceID).then(details => {
      if (!details) {
        callback(null);
        return;
      }

      const currentValue = details.acState.swing;

      switch (currentValue) {
        case Swing.FixedMiddle:
          callback(null, Characteristic.SwingMode.SWING_DISABLED);
          break;
        case Swing.RangeFull:
          callback(null, Characteristic.SwingMode.SWING_ENABLED);
          break;
        default:
          callback(null);
          break;
      }
    });
  };

  setSwingMode = (newValue: number, callback: Function) => {
    var update: SwingUpdate;
    switch (newValue) {
      case Characteristic.SwingMode.SWING_DISABLED:
        update = {
          kind: "swing",
          value: Swing.FixedMiddle,
        };
        break;
      case Characteristic.SwingMode.SWING_ENABLED:
        update = {
          kind: "swing",
          value: Swing.RangeFull,
        };
        break;
      default:
        update = {
          kind: "swing",
          value: Swing.FixedMiddle,
        };
        break;
    }

    this.api.updateDeviceState(this.deviceID, update).then(state => {
      if (!state) {
        callback(null);
        return;
      }

      switch (state.swing) {
        case Swing.FixedMiddle:
          callback(null, Characteristic.SwingMode.SWING_DISABLED);
          break;
        case Swing.RangeFull:
          callback(null, Characteristic.SwingMode.SWING_ENABLED);
          break;
        default:
          callback(null);
          break;
      }
    });
  };

  // Cooling
  getCoolingThresholdTemperature = (callback: Function) => {
    this.api.getDeviceDetails(this.deviceID).then(details => {
      if (!details) {
        callback(null);
        return;
      }

      const currentValue = details.acState.targetTemperature;
      callback(null, currentValue);
    });
  };

  setCoolingThresholdTemperature = (newValue: number, callback: Function) => {
    const update: TargetTemperatureUpdate = {
      kind: "targetTemperature",
      value: Math.round(newValue),
    };

    this.api.updateDeviceState(this.deviceID, update).then(state => {
      if (!state) {
        callback(null, 0);
        return;
      }

      callback(null, state.targetTemperature);
    });
  };

  // Heating
  getHeatingThresholdTemperature = (callback: Function) => {
    this.api.getDeviceDetails(this.deviceID).then(details => {
      if (!details) {
        callback(null);
        return;
      }

      const currentValue = details.acState.targetTemperature;
      callback(null, currentValue);
    });
  };

  setHeatingThresholdTemperature = (newValue: number, callback: Function) => {
    const update: TargetTemperatureUpdate = {
      kind: "targetTemperature",
      value: Math.round(newValue),
    };

    this.api.updateDeviceState(this.deviceID, update).then(state => {
      if (!state) {
        callback(null, 0);
        return;
      }

      callback(null, state.targetTemperature);
    });
  };

  // Rotation Speed
  // maxValue: 100,
  // minValue: 0,
  // minStep: 1,
  getRotationSpeed = (callback: Function) => {
    this.api.getDeviceDetails(this.deviceID).then(details => {
      if (!details || !details.acState.fanLevel) {
        callback(null);
        return;
      }

      this.fanLevel = details.acState.fanLevel;
      const currentValue = SensiboAccessory.numberFromFanLevel(
        details.acState.fanLevel,
      );

      callback(null, currentValue);
    });
  };

  setRotationSpeed = (newValue: number, callback: Function) => {
    const newFanLevel = SensiboAccessory.fanLevelForNumber(newValue);

    if (this.fanLevel == newFanLevel) {
      callback(null);
      return;
    }

    this.fanLevel = newFanLevel;

    const update: FanLevelUpdate = {
      kind: "fanLevel",
      value: newFanLevel,
    };

    this.api.updateDeviceState(this.deviceID, update).then(state => {
      if (!state || !state.fanLevel) {
        callback(null, 0);
        return;
      }

      this.fanLevel = state.fanLevel;
      const fanLevelNumber = SensiboAccessory.numberFromFanLevel(
        state.fanLevel,
      );

      callback(null, fanLevelNumber);
    });
  };

  static fanLevelForNumber(intValue: number): FanLevel {
    if (intValue >= 0 && intValue < 20) {
      return FanLevel.Quiet;
    } else if (intValue >= 20 && intValue < 40) {
      return FanLevel.Low;
    } else if (intValue >= 40 && intValue < 60) {
      return FanLevel.Medium;
    } else if (intValue >= 60 && intValue < 80) {
      return FanLevel.MediumHigh;
    } else if (intValue >= 80 && intValue <= 100) {
      return FanLevel.High;
    } else {
      return FanLevel.Quiet;
    }
  }

  static numberFromFanLevel(fanLevel: FanLevel): number {
    switch (fanLevel) {
      case FanLevel.Quiet:
        return 0;
      case FanLevel.Low:
        return 20;
      case FanLevel.Medium:
        return 40;
      case FanLevel.MediumHigh:
        return 60;
      case FanLevel.High:
        return 80;
      default:
        return 0;
    }
  }
}
