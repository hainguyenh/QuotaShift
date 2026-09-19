import { invoke } from "@tauri-apps/api/core";
import { obfuscate } from "../../utils/auth/auth";
import type { CodexAccount } from "../../utils/common/types";
import { parseCodexLocalAuth } from "../../utils/codex/current-local-session";

export function createApiKeyCodexAccount(label: string, apiKey: string): CodexAccount {
  return {
    id: `acct-apikey-${Date.now()}`,
    label,
    apiKey: obfuscate(apiKey),
  };
}

export async function importLocalCodexSession(
  label: string,
  loadAccounts: () => CodexAccount[],
  saveAccounts: (accounts: CodexAccount[]) => void,
): Promise<{ account?: CodexAccount; error?: string }> {
  const rawAuth = await invoke<string | null>("read_codex_auth");
  if (!rawAuth) {
    return { error: "No Codex CLI session found at ~/.codex/auth.json. Log in via CLI first." };
  }
  let authData: unknown;
  try {
    authData = JSON.parse(rawAuth);
  } catch {
    return { error: "Failed to parse auth.json. The file is empty or invalid." };
  }
  if (!authData) {
    return { error: "Failed to parse auth.json. The file is empty or invalid." };
  }
  const importedAccount = parseCodexLocalAuth(authData, label);
  if (!importedAccount) {
    return { error: "auth.json does not contain valid ChatGPT tokens or OpenAI API Key." };
  }

  const accounts = loadAccounts();
  const existingIdx = accounts.findIndex(
    (a) =>
      a.id === importedAccount.id || (importedAccount.email && a.email === importedAccount.email),
  );
  if (existingIdx !== -1) {
    importedAccount.id = accounts[existingIdx].id;
    accounts[existingIdx] = importedAccount;
  } else {
    accounts.push(importedAccount);
  }
  saveAccounts(accounts);
  return { account: importedAccount };
}
