export type Level2SettingsState = {
  compactInboxDensity: boolean;
  highlightEscalationQueue: boolean;
  autoOpenClosingNotes: boolean;
  playEscalationAlert: boolean;
};

export const LEVEL2_SETTINGS_STORAGE_KEY = "lkpp-level2-settings";

export const defaultLevel2Settings: Level2SettingsState = {
  compactInboxDensity: false,
  highlightEscalationQueue: true,
  autoOpenClosingNotes: true,
  playEscalationAlert: true,
};
