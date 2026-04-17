export type TabKey = "job" | "messages" | "vehicle" | "fuel" | "profile";

export type StepType = "START_JOB" | "LOAD" | "UNLOAD" | "DELIVERY" | "END_JOB";

export const TOKEN_KEY = "daylog_mobile_token";
export const USER_KEY = "daylog_mobile_user";
export const THEME_KEY = "daylog_mobile_theme";

export const STEP_LABELS: Record<StepType, string> = {
  START_JOB: "Is Baslat",
  LOAD:      "Yukleme",
  UNLOAD:    "Bosaltma",
  DELIVERY:  "Teslim",
  END_JOB:   "Is Bitti",
};

// Phase definitions per job type
export interface PhaseStep {
  type: StepType;
  label: string;
  locationKey: keyof import("./types").DriverTask;
}

// İşi Başlat → Yükle → İşi Bitir  (jobType === "LOADING")
export const LOADING_PHASES: PhaseStep[] = [
  { type: "START_JOB", label: "Is Baslat", locationKey: "phaseStartLocation" },
  { type: "LOAD",      label: "Yukleme",   locationKey: "phaseLoadLocation" },
  { type: "END_JOB",   label: "Is Bitti",  locationKey: "phaseDeliveryLocation" },
];

// İşi Başlat → Boşalt → İşi Bitir  (jobType === "UNLOADING")
export const UNLOADING_PHASES: PhaseStep[] = [
  { type: "START_JOB", label: "Is Baslat", locationKey: "phaseStartLocation" },
  { type: "UNLOAD",    label: "Bosaltma",  locationKey: "phaseUnloadLocation" },
  { type: "END_JOB",   label: "Is Bitti",  locationKey: "phaseDeliveryLocation" },
];

// İşi Başlat → Yükle → Boşalt → İşi Bitir  (jobType === "FULL")
export const FULL_PHASES: PhaseStep[] = [
  { type: "START_JOB", label: "Is Baslat", locationKey: "phaseStartLocation" },
  { type: "LOAD",      label: "Yukleme",   locationKey: "phaseLoadLocation" },
  { type: "UNLOAD",    label: "Bosaltma",  locationKey: "phaseUnloadLocation" },
  { type: "END_JOB",   label: "Is Bitti",  locationKey: "phaseDeliveryLocation" },
];

// İşi Başlat → İşi Bitir  (jobType === null / other)
export const SIMPLE_PHASES: PhaseStep[] = [
  { type: "START_JOB", label: "Is Baslat", locationKey: "phaseStartLocation" },
  { type: "END_JOB",   label: "Is Bitti",  locationKey: "phaseDeliveryLocation" },
];
