export type Log = (level: LogLevel, message: string) => void;

export enum LogLevel {
  Debug = "debug",
  Info = "",
  Warn = "warn",
  Error = "error",
}
