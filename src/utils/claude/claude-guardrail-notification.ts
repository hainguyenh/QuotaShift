import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

export async function notifyClaudeGuardrailSuspension(title: string, body: string): Promise<void> {
  let allowed = await isPermissionGranted();
  if (!allowed) {
    allowed = (await requestPermission()) === "granted";
  }
  if (allowed) {
    sendNotification({ title, body });
  }
}
