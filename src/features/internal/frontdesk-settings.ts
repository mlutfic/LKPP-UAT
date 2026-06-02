export type FrontdeskSettingsState = {
  highlightReadyQueue: boolean;
  playUnitCallTone: boolean;
  autoStartScanner: boolean;
  compactQueueDensity: boolean;
};

export const FRONTDESK_SETTINGS_STORAGE_KEY = "lkpp-frontdesk-settings";

export const defaultFrontdeskSettings: FrontdeskSettingsState = {
  highlightReadyQueue: true,
  playUnitCallTone: true,
  autoStartScanner: false,
  compactQueueDensity: false,
};
