import React from "react";
import { formatCompactTierName } from "../../utils/common/card-layout-mode";

export const AntigravityCardPlan: React.FC<{ plan: string }> = ({ plan }) => (
  <span className="account-card-plan-badge">{formatCompactTierName(plan)}</span>
);
