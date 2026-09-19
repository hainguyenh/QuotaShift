import React from "react";
import { QuotaData } from "../../utils/common/types";

interface AntigravityExactErrorBannerProps {
  error?: string;
  quotas: QuotaData[];
}

export const AntigravityExactErrorBanner: React.FC<AntigravityExactErrorBannerProps> = ({
  error,
  quotas,
}) => {
  if (!error) return null;
  if (quotas.length > 0 && /antigravity ide|executable not found/i.test(error)) {
    return null;
  }
  return (
    <div className="antigravity-exact-error" data-tooltip={error}>
      ⚠ {error}
    </div>
  );
};
