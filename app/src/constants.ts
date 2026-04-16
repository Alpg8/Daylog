export type TabKey = "job" | "messages" | "vehicle" | "fuel" | "profile";

export type StepType = "START_JOB" | "LOAD" | "UNLOAD" | "DELIVERY" | "END_JOB";

export const TOKEN_KEY = "daylog_mobile_token";
export const USER_KEY = "daylog_mobile_user";
export const THEME_KEY = "daylog_mobile_theme";

export const STEP_LABELS: Record<StepType, string> = {
  START_JOB: "Is Baslat",
  LOAD: "Yukleme",
  UNLOAD: "Bosaltma",
  DELIVERY: "Teslim",
  END_JOB: "Is Bitti",
};

// Phase definitions per job type
export interface PhaseStep {
  type: StepType;
  label: string;
  locationKey: keyof import("./types").DriverTask;
}

export const LOADING_PHASES: PhaseStep[] = [
  { type: "START_JOB",  label: "Is Baslat",  locationKey: "phaseStartLocation" },
  { type: "LOAD",       label: "Yukleme",    locationKey: "phaseLoadLocation" },
  { type: "DELIVERY",  label: "Teslim",     locationKey: "phaseDeliveryLocation" },
];

export const UNLOADING_PHASES: PhaseStep[] = [
  { type: "START_JOB",  label: "Is Baslat",  locationKey: "phaseStartLocation" },
  { type: "UNLOAD",     label: "Bosaltma",   locationKey: "phaseUnloadLocation" },
  { type: "DELIVERY",  label: "Teslim",     locationKey: "phaseDeliveryLocation" },
];
