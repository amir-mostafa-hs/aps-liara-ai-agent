export interface AppCreationAction {
  appName: string;
  platform: string;
  planId: string;
  teamId: string | null;
  priceMonthly: number | null;
}

export interface AppCreationApproval extends AppCreationAction {
  confirmed: true;
}

export function buildAppCreationApproval(action: AppCreationAction): AppCreationApproval {
  return { ...action, confirmed: true };
}

export function matchesApprovedAppCreation(
  approval: unknown,
  action: AppCreationAction,
): approval is AppCreationApproval {
  if (!approval || typeof approval !== "object") return false;
  const approved = approval as Partial<AppCreationApproval>;
  return approved.confirmed === true
    && approved.appName === action.appName
    && approved.platform === action.platform
    && approved.planId === action.planId
    && approved.teamId === action.teamId
    && approved.priceMonthly === action.priceMonthly;
}
