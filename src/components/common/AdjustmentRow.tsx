import React from "react";
import { OverlayScaleIcon } from "./SettingsIcons";

interface AdjustmentRowProps {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (value: number) => void;
}

export const AdjustmentRow: React.FC<AdjustmentRowProps> = ({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}) => (
  <div className="settings-adjustment-row">
    <div className="settings-adjustment-meta settings-toggle-row settings-toggle-row--segmented">
      <span className="settings-row-icon">
        <OverlayScaleIcon />
      </span>
      <div className="settings-toggle-copy">
        <div className="settings-toggle-label settings-adjustment-label">{label}</div>
        <div className="settings-toggle-description settings-adjustment-hint">{hint}</div>
      </div>
      <div className="settings-adjustment-value-wrap">
        <input
          className="settings-adjustment-number"
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onBlur={(e) => onChange(Number(e.target.value))}
          aria-label={label}
        />
        <span>{unit}</span>
      </div>
    </div>
    <input
      className="settings-adjustment-range"
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label={`${label} slider`}
    />
    <div className="settings-adjustment-bounds">
      <span>
        {min}
        {unit}
      </span>
      <span>
        {max}
        {unit}
      </span>
    </div>
  </div>
);
