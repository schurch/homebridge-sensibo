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
} from "./model";
import { Log, LogLevel } from "./log";

let Service: any, Characteristic: any;

export default function(homebridge: any) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory(
    "homebridge-sensibo",
    "Sensibo",
    SensiboAccessory,
  );
}

class SensiboAccessory {
  private heaterCoolerService = new Service.HeaterCooler("Living Room AC");
  private log: Log;
  private api: API;
  private deviceID: string;
  private isActive?: boolean;
  private fanLevel?: FanLevel;

  constructor(log: Log, config: any) {
    this.log = log;
    this.deviceID = config["deviceID"];

    const apiKey = config["apiKey"];
    this.api = new API("https://home.sensibo.com", apiKey, this.log);

    this.log(
      LogLevel.Debug,
      "Staring sensibo for device ID " +
        this.deviceID +
        " and API key " +
        apiKey,
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

  getServices() {
    return [this.heaterCoolerService];
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
