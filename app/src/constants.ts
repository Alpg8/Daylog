export type TabKey = "job" | "messages" | "vehicle" | "fuel" | "profile";

export type StepType = "START_JOB" | "LOAD" | "DELIVERY" | "END_JOB";

export const TOKEN_KEY = "daylog_mobile_token";
export const USER_KEY = "daylog_mobile_user";
export const THEME_KEY = "daylog_mobile_theme";

export const STEP_LABELS: Record<StepType, string> = {
  START_JOB: "Isi Baslat",
  LOAD: "Yukleme",
  DELIVERY: "Teslim",
  END_JOB: "Isi Bitir",
};
