export type UnitSettingsState = {
  compactRows: boolean;
  autoRefresh: boolean;
  highlightEscalation: boolean;
  autoOpenNotes: boolean;
};

export const UNIT_SETTINGS_STORAGE_KEY = "lkpp-unit-settings";

export const defaultUnitSettings: UnitSettingsState = {
  compactRows: false,
  autoRefresh: true,
  highlightEscalation: true,
  autoOpenNotes: true,
};
