export const clampPercent = (value: number | null | undefined): number => {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
};

export const formatPercent = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return "Unavailable";
  return `${Math.round(value * 10) / 10}%`;
};

export const formatTokens = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return "--";
  return new Intl.NumberFormat(undefined, {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
};

export const formatDuration = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return "--";
  const totalSeconds = Math.max(0, Math.floor(value / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

export const formatReset = (
  epochSeconds: number | null | undefined,
  nowMs = Date.now(),
): string => {
  if (epochSeconds == null || !Number.isFinite(epochSeconds)) return "Reset unavailable";
  const ms = epochSeconds > 10_000_000_000 ? epochSeconds : epochSeconds * 1000;
  const reset = new Date(ms);
  const now = new Date(nowMs);
  const time = `${String(reset.getHours()).padStart(2, "0")}:${String(reset.getMinutes()).padStart(
    2,
    "0",
  )}`;
  const isToday =
    reset.getFullYear() === now.getFullYear() &&
    reset.getMonth() === now.getMonth() &&
    reset.getDate() === now.getDate();
  if (isToday) return time;

  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const isTomorrow =
    reset.getFullYear() === tomorrow.getFullYear() &&
    reset.getMonth() === tomorrow.getMonth() &&
    reset.getDate() === tomorrow.getDate();
  if (isTomorrow) return `Tomorrow ${time}`;

  const month = reset.toLocaleString("en", { month: "short" });
  return `${month} ${reset.getDate()}, ${time}`;
};

export const formatCaptureTime = (epochMs: number): string => {
  if (!epochMs) return "Unknown";
  return new Date(epochMs).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
};

export const formatClaudeModelName = (name: string | null | undefined): string => {
  if (!name || name === "Claude") return "Claude Code";
  if (name === "claude-sonnet-5") return "Claude Sonnet  5";
  return name.replace(/claude-sonnet-5/g, "Claude Sonnet  5");
};
