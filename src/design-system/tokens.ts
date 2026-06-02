export const spacingScale = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64] as const;
export const radiusScale = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  full: 9999,
} as const;
export const typeScale = [11, 12, 14, 16, 20, 24, 32, 40] as const;
export const zIndexScale = [0, 10, 20, 30, 40, 50, 60] as const;
export const elevationScale = {
  0: "none",
  1: "0 1px 2px rgba(0,0,0,0.04)",
  2: "0 2px 4px rgba(0,0,0,0.06)",
  3: "0 4px 12px rgba(0,0,0,0.08)",
  4: "0 8px 24px rgba(0,0,0,0.10)",
  5: "0 16px 32px rgba(0,0,0,0.12)",
} as const;

export type AppSpacingToken = (typeof spacingScale)[number];
export type AppTypeToken = (typeof typeScale)[number];
export type AppRadiusToken = keyof typeof radiusScale;
export type AppZIndexToken = (typeof zIndexScale)[number];
