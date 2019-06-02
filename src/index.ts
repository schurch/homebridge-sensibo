require("@babel/polyfill");

import { API } from "./api";
import { State, DeviceStateUpdate, Mode, Swing, FanLevel } from "./model";

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

type Log = (message: string) => void;

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
    this.api = new API("https://home.sensibo.com", config["apiKey"]);

    this.log("Starting Sensibo service...");

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

  // Characteristic.Active.INACTIVE = 0;
  // Characteristic.Active.ACTIVE = 1;
  getActive = (callback: Function) => {
    this.api.getDeviceDetails(this.deviceID).then(details => {
      if (!details) {
        callback(null);
        return;
      }
      const newValue = details.acState.on ? 1 : 0;
      callback(null, newValue);
    });
  };

  setActive = (newValue: number, callback: Function) => {
    const newOnState = newValue == 1 ? true : false;

    if (this.isActive && this.isActive == true && newOnState == true) {
      callback(null);
      return;
    }

    const newState = new State();
    newState.on = newOnState;

    const update = new DeviceStateUpdate(newState);

    this.api.setDeviceState(this.deviceID, update).then(state => {
      if (!state) {
        callback(null);
        return;
      }

      const newValue = state.on ? 1 : 0;
      this.isActive = state.on;
      callback(null, newValue);
    });
  };

  // Characteristic.CurrentHeaterCoolerState.INACTIVE = 0;
  // Characteristic.CurrentHeaterCoolerState.IDLE = 1;
  // Characteristic.CurrentHeaterCoolerState.HEATING = 2;
  // Characteristic.CurrentHeaterCoolerState.COOLING = 3;
  getCurrentHeaterCoolerState = (callback: Function) => {
    this.api.getDeviceDetails(this.deviceID).then(details => {
      if (!details) {
        callback(null, 0);
        return;
      }

      if (details.acState.on == false) {
        callback(null, 0);
        return;
      }

      switch (details.acState.mode) {
        case Mode.Heat:
          callback(null, 2);
          break;
        case Mode.Cool:
          callback(null, 3);
          break;
        default:
          callback(null, 0);
          break;
      }
    });
  };

  // Characteristic.TargetHeaterCoolerState.AUTO = 0;
  // Characteristic.TargetHeaterCoolerState.HEAT = 1;
  // Characteristic.TargetHeaterCoolerState.COOL = 2;
  getTargetHeaterCoolerState = (callback: Function) => {
    this.api.getDeviceDetails(this.deviceID).then(details => {
      if (!details) {
        callback(null);
        return;
      }

      switch (details.acState.mode) {
        case Mode.Auto:
          callback(null, 0);
          break;
        case Mode.Heat:
          callback(null, 1);
          break;
        case Mode.Cool:
          callback(null, 2);
          break;
      }
    });
  };

  setTargetHeaterCoolerState = (newValue: number, callback: Function) => {
    const newState = new State();
    switch (newValue) {
      case 0:
        newState.mode = Mode.Auto;
        break;
      case 1:
        newState.mode = Mode.Heat;
        break;
      case 2:
        newState.mode = Mode.Cool;
        break;
    }

    newState.on = true;

    this.isActive = true;

    const update = new DeviceStateUpdate(newState);

    this.api.setDeviceState(this.deviceID, update).then(state => {
      if (!state) {
        callback(null, 0);
        return;
      }

      this.isActive = state.on;

      switch (state.mode) {
        case Mode.Auto:
          callback(null, 0);
          break;
        case Mode.Heat:
          callback(null, 1);
          break;
        case Mode.Cool:
          callback(null, 2);
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

      const currentValue = details.measurements.temperature;
      callback(null, currentValue);
    });
  };

  // Swing Mode
  // Characteristic.SwingMode.SWING_DISABLED = 0;
  // Characteristic.SwingMode.SWING_ENABLED = 1;
  getSwingMode = (callback: Function) => {
    this.api.getDeviceDetails(this.deviceID).then(details => {
      if (!details) {
        callback(null);
        return;
      }

      const currentValue = details.acState.swing;

      switch (currentValue) {
        case Swing.FixedMiddle:
          callback(null, 0);
          break;
        case Swing.RangeFull:
          callback(null, 1);
          break;
        default:
          callback(null);
          break;
      }
    });
  };

  setSwingMode = (newValue: number, callback: Function) => {
    const newState = new State();

    switch (newValue) {
      case 0:
        newState.swing = Swing.FixedMiddle;
        break;
      case 1:
        newState.swing = Swing.RangeFull;
        break;
      default:
        newState.swing = Swing.FixedMiddle;
        break;
    }

    const update = new DeviceStateUpdate(newState);

    this.api.setDeviceState(this.deviceID, update).then(state => {
      if (!state) {
        callback(null, 0);
        return;
      }

      switch (state.swing) {
        case Swing.FixedMiddle:
          callback(null, 0);
          break;
        case Swing.RangeFull:
          callback(null, 1);
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
    const newState = new State();
    newState.targetTemperature = Math.round(newValue);
    const update = new DeviceStateUpdate(newState);

    this.api.setDeviceState(this.deviceID, update).then(state => {
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
    const newState = new State();
    newState.targetTemperature = Math.round(newValue);
    const update = new DeviceStateUpdate(newState);

    this.api.setDeviceState(this.deviceID, update).then(state => {
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
    const newState = new State();
    const newFanLevel = SensiboAccessory.fanLevelForNumber(newValue);

    if (this.fanLevel == newFanLevel) {
      callback(null);
      return;
    }

    newState.fanLevel = newFanLevel;
    newState.on = true;

    this.fanLevel = newFanLevel;
    this.isActive = true;

    const update = new DeviceStateUpdate(newState);

    this.api.setDeviceState(this.deviceID, update).then(state => {
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
