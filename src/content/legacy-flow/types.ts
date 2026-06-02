export type LegacyParityStatus = "done" | "partial" | "todo";

export type ApiContractRef = {
  name: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  path?: string;
  note?: string;
};

export type FlowStep = {
  id: string;
  title: string;
  description: string;
  legacyRoute?: string;
  targetRoute?: string;
  apiContracts?: ApiContractRef[];
  gate?: string;
  output?: string;
};

export type LegacyFeatureFlow = {
  key: string;
  label: string;
  legacyView: string;
  legacyRoutes: string[];
  targetRoutes: string[];
  businessGoal: string;
  primaryActor: string;
  parityStatus: LegacyParityStatus;
  apiContracts: ApiContractRef[];
  notes?: string[];
  steps: FlowStep[];
};

export type LegacyRoleFlow = {
  role: string;
  label: string;
  loginEntry?: string;
  dashboardEntry?: string;
  legacySources: string[];
  summary: string;
  parityStatus: LegacyParityStatus;
  featureFlows: LegacyFeatureFlow[];
};

export type LegacyRouteAlias = {
  legacyPath: string;
  nextPath: string;
  status: LegacyParityStatus;
  note?: string;
};
