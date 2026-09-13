import { encrypt, decrypt, EncryptedBundle } from "../auth/crypto.js";
import { AntigravityAccount, CodexAccount, CodexAccountPool } from "./types.js";
import { loadCodexPools, saveAntigravityAccounts, saveCodexAccounts, saveCodexPools } from "./app-storage.js";
import { loadAccountOrder, saveAccountOrder, sortByOrder } from "../account/account-order.js";
import { normalizeCodexPools, reconcileCodexPools } from "../codex/codex-pools.js";
import { ANTIGRAVITY_ORDER_KEY, CODEX_ORDER_KEY } from "./app-constants.js";

export const buildBackupData = (
  antigravityAccounts: AntigravityAccount[],
  codexAccounts: CodexAccount[],
  theme: string,
) => {
  return {
    version: 2,
    createdAt: new Date().toISOString(),
    theme,
    antigravity: {
      accounts: antigravityAccounts,
    },
    codex: {
      accounts: codexAccounts,
      pools: loadCodexPools(),
    },
  };
};

export const encryptBackup = async (data: any, passphrase: string): Promise<string> => {
  const json = JSON.stringify(data);
  const bundle = await encrypt(json, passphrase);
  return JSON.stringify(bundle);
};

export const decryptBackup = async (content: string, passphrase: string): Promise<any> => {
  const bundle: EncryptedBundle = JSON.parse(content);
  const decrypted = await decrypt(bundle, passphrase);
  return JSON.parse(decrypted);
};

export interface RestoreBackupResult {
  importedAntigravityCount: number;
  updatedAntigravityCount: number;
  importedCodexCount: number;
  updatedCodexCount: number;
  importedPoolsCount: number;
  accounts: {
    antigravity: AntigravityAccount[];
    codex: CodexAccount[];
    pools: CodexAccountPool[];
  };
}

const isCodexCandidate = (item: any): boolean =>
  Boolean(
    item &&
      typeof item === "object" &&
      (item.apiKey ||
        item.tokens ||
        item.provider === "codex" ||
        item.lastPlan ||
        item.resetCredits ||
        (item.id && typeof item.id === "string" && item.id.includes("oauth"))),
  );

const isAntigravityCandidate = (item: any): boolean =>
  Boolean(
    item &&
      typeof item === "object" &&
      (item.token ||
        item.provider === "antigravity" ||
        (item.id && typeof item.id === "string" && item.id.startsWith("ag-acct"))),
  );

export const extractBackupPayload = (data: any) => {
  if (!data || typeof data !== "object") return { agAccounts: [], cxAccounts: [], pools: [] };
  let agAccounts: any[] = [];
  let cxAccounts: any[] = [];
  let pools: any[] = [];

  if (Array.isArray(data)) {
    for (const item of data) {
      if (isAntigravityCandidate(item)) agAccounts.push(item);
      else if (isCodexCandidate(item) || (item && typeof item === "object" && item.email)) cxAccounts.push(item);
    }
  } else {
    if (data.antigravity) {
      if (Array.isArray(data.antigravity.accounts)) agAccounts = [...data.antigravity.accounts];
      else if (Array.isArray(data.antigravity)) agAccounts = [...data.antigravity];
    } else if (Array.isArray(data.antigravityAccounts)) {
      agAccounts = [...data.antigravityAccounts];
    }

    if (data.codex) {
      const pData = data.codex;
      if (Array.isArray(pData.accounts)) cxAccounts = [...pData.accounts];
      else if (Array.isArray(pData)) cxAccounts = [...pData];
      if (Array.isArray(pData.pools)) pools = [...pData.pools];
    } else if (Array.isArray(data.codexAccounts)) {
      cxAccounts = [...data.codexAccounts];
    } else if (Array.isArray(data.codex_accounts)) {
      cxAccounts = [...data.codex_accounts];
    }

    if (data.platforms && typeof data.platforms === "object") {
      if (data.platforms.antigravity) {
        if (Array.isArray(data.platforms.antigravity.accounts)) agAccounts = [...agAccounts, ...data.platforms.antigravity.accounts];
        else if (Array.isArray(data.platforms.antigravity)) agAccounts = [...data.platforms.antigravity];
      }
      if (data.platforms.codex) {
        if (Array.isArray(data.platforms.codex.accounts)) cxAccounts = [...cxAccounts, ...data.platforms.codex.accounts];
        else if (Array.isArray(data.platforms.codex)) cxAccounts = [...cxAccounts, ...data.platforms.codex];
        if (Array.isArray(data.platforms.codex.pools)) pools = [...pools, ...data.platforms.codex.pools];
      }
    }

    if (Array.isArray(data.accounts)) {
      for (const item of data.accounts) {
        if (isAntigravityCandidate(item)) agAccounts.push(item);
        else if (isCodexCandidate(item) || (item && typeof item === "object" && item.email)) cxAccounts.push(item);
      }
    }

    if (Array.isArray(data.pools)) {
      pools = [...pools, ...data.pools];
    }
  }

  return { agAccounts, cxAccounts, pools };
};

const normId = (val?: string | null): string => (typeof val === "string" ? val.trim().toLowerCase() : "");

export const restoreBackupData = (
  rawBackup: any,
  currentAgAccounts: AntigravityAccount[],
  currentCxAccounts: CodexAccount[],
  currentPools: CodexAccountPool[] = [],
): RestoreBackupResult => {
  const { agAccounts, cxAccounts, pools } = extractBackupPayload(rawBackup);

  let importedAg = 0;
  let updatedAg = 0;
  const nextAg = [...currentAgAccounts];

  for (const imp of agAccounts) {
    if (!imp || typeof imp !== "object") continue;
    const impEmail = normId(imp.email);
    const existingIdx = nextAg.findIndex(
      (a) =>
        Boolean(imp.id && a.id === imp.id) ||
        Boolean(impEmail && normId(a.email) === impEmail) ||
        Boolean(!impEmail && !normId(a.email) && imp.token && a.token && imp.token === a.token),
    );
    if (existingIdx !== -1) {
      nextAg[existingIdx] = { ...nextAg[existingIdx], ...imp, id: nextAg[existingIdx].id };
      updatedAg++;
    } else {
      const id = imp.id || `ag-acct-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      nextAg.push({ ...imp, id });
      importedAg++;
    }
  }

  let importedCx = 0;
  let updatedCx = 0;
  const nextCx = [...currentCxAccounts];
  const importedIdMap = new Map<string, string>();

  for (const imp of cxAccounts) {
    if (!imp || typeof imp !== "object") continue;
    const impEmail = normId(imp.email);
    const existingIdx = nextCx.findIndex(
      (a) =>
        Boolean(imp.id && a.id === imp.id) ||
        Boolean(impEmail && normId(a.email) === impEmail) ||
        Boolean(!impEmail && !normId(a.email) && imp.apiKey && a.apiKey && imp.apiKey === a.apiKey),
    );
    if (existingIdx !== -1) {
      const savedId = nextCx[existingIdx].id;
      nextCx[existingIdx] = { ...nextCx[existingIdx], ...imp, id: savedId };
      if (imp.id) importedIdMap.set(imp.id, savedId);
      updatedCx++;
    } else {
      const id = imp.id || `acct-oauth-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      nextCx.push({ ...imp, id });
      if (imp.id) importedIdMap.set(imp.id, id);
      importedCx++;
    }
  }

  const remappedPools = normalizeCodexPools(pools).map((pool) => ({
    ...pool,
    accountIds: pool.accountIds.map((id) => importedIdMap.get(id) || id),
  }));
  const poolsById = new Map<string, CodexAccountPool>();
  currentPools.forEach((p) => poolsById.set(p.id, p));
  remappedPools.forEach((p) => poolsById.set(p.id, p));
  const reconciled = reconcileCodexPools([...poolsById.values()], nextCx);

  const agOrder = loadAccountOrder(ANTIGRAVITY_ORDER_KEY);
  const nextAgOrder = [...agOrder.filter((id) => nextAg.some((a) => a.id === id))];
  for (const a of nextAg) {
    if (!nextAgOrder.includes(a.id)) nextAgOrder.push(a.id);
  }
  const sortedAg = sortByOrder(nextAg, nextAgOrder);

  const cxOrder = loadAccountOrder(CODEX_ORDER_KEY);
  const nextCxOrder = [...cxOrder.filter((id) => nextCx.some((a) => a.id === id))];
  for (const a of nextCx) {
    if (!nextCxOrder.includes(a.id)) nextCxOrder.push(a.id);
  }
  const sortedCx = sortByOrder(nextCx, nextCxOrder);

  saveAntigravityAccounts(sortedAg);
  saveAccountOrder(ANTIGRAVITY_ORDER_KEY, nextAgOrder);
  saveCodexAccounts(sortedCx);
  saveAccountOrder(CODEX_ORDER_KEY, nextCxOrder);
  saveCodexPools(reconciled);

  return {
    importedAntigravityCount: importedAg,
    updatedAntigravityCount: updatedAg,
    importedCodexCount: importedCx,
    updatedCodexCount: updatedCx,
    importedPoolsCount: remappedPools.length,
    accounts: {
      antigravity: sortedAg,
      codex: sortedCx,
      pools: reconciled,
    },
  };
};
