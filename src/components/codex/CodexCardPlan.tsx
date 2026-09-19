import React from "react";
import { formatCompactTierName } from "../../utils/common/card-layout-mode";

export const CodexCardPlan: React.FC<{ planText: string }> = ({ planText }) => (
  <span className="account-card-plan-badge">{formatCompactTierName(planText)}</span>
);
