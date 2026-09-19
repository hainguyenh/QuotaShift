import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { currentMonitor, primaryMonitor, availableMonitors } from "@tauri-apps/api/window";

export async function clampPositionToScreen(targetPos: {
  x: number;
  y: number;
}): Promise<{ x: number; y: number } | null> {
  try {
    const win = getCurrentWebviewWindow(),
      winSize = await win.outerSize(),
      monitors = (await availableMonitors()) || [];
    if (monitors.length > 0) {
      const boxes = monitors.map((m) => ({
        pos: m.workArea?.position ?? m.position,
        size: m.workArea?.size ?? m.size,
      }));
      const minX = Math.min(...boxes.map((b) => b.pos.x)),
        maxX = Math.max(...boxes.map((b) => b.pos.x + b.size.width)) - winSize.width;
      const minY = Math.min(...boxes.map((b) => b.pos.y)),
        maxY = Math.max(...boxes.map((b) => b.pos.y + b.size.height)) - winSize.height;
      return {
        x: Math.max(minX, Math.min(maxX, targetPos.x)),
        y: Math.max(minY, Math.min(maxY, targetPos.y)),
      };
    }
    const monitor = (await currentMonitor()) ?? (await primaryMonitor());
    if (!monitor) return null;
    const pad = Math.round(6 * (monitor.scaleFactor ?? 1)),
      workPos = monitor.workArea?.position ?? monitor.position,
      workSize = monitor.workArea?.size ?? monitor.size;
    return {
      x: Math.max(
        workPos.x + pad,
        Math.min(workPos.x + workSize.width - winSize.width - pad, targetPos.x),
      ),
      y: Math.max(
        workPos.y + pad,
        Math.min(workPos.y + workSize.height - winSize.height - pad, targetPos.y),
      ),
    };
  } catch {
    return null;
  }
}
