import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createEmptyLocalAntigravitySession,
  mergeDiskAntigravitySession,
  mergeLocalAntigravityStatus,
  canAddLocalSessionToMonitored,
  normalizeLocalSessionQuotas,
} from '../.test-build/local-antigravity-session.js';

test('offline refresh retains the last captured identity and quota', () => {
  const previous = {
    ...createEmptyLocalAntigravitySession(),
    email: 'User@Example.com',
    planTier: 'Google AI Pro',
    quotas: [{ model: 'Gemini Models', percent: 50, refreshTime: 'Ready', weeklyPercent: 42 }],
    online: true,
    lastSeenAt: 1000,
  };
  const result = mergeLocalAntigravityStatus(previous, { online: false });
  assert.equal(result.online, false);
  assert.equal(result.email, 'User@Example.com');
  assert.equal(result.quotas[0].weeklyPercent, 42);
  assert.equal(result.lastSeenAt, 1000);
});

test('successful local refresh updates identity but preserves captured credentials', () => {
  const previous = {
    ...createEmptyLocalAntigravitySession(),
    capturedAccount: { token: 'obf', email: 'old@example.com', authMethod: 'consumer' },
  };
  const result = mergeLocalAntigravityStatus(previous, {
    online: true,
    email: 'new@example.com',
    planTier: 'Paid',
    quotas: [],
    credits: null,
    monitoredCodex: null,
    recentlyUsedModel: null,
  }, 1234);
  assert.equal(result.email, 'new@example.com');
  assert.equal(result.lastSeenAt, 1234);
  assert.equal(result.capturedAccount?.token, 'obf');
});

test('same local identity keeps refreshed in-memory credentials and credits when disk is stale', () => {
  const previous = {
    ...createEmptyLocalAntigravitySession(),
    email: 'User@example.com',
    credits: { balance: 12 },
    quotas: [{ model: 'Gemini', percent: 75 }],
    capturedAccount: {
      token: 'refreshed-access',
      refreshToken: 'refreshed-refresh',
      email: 'User@example.com',
      authMethod: 'consumer',
    },
  };
  const result = mergeDiskAntigravitySession(previous, {
    id: 'disk',
    label: 'disk',
    token: 'stale-access',
    refreshToken: 'stale-refresh',
    email: ' user@EXAMPLE.com ',
    authMethod: 'consumer',
  }, 2000);
  assert.equal(result.capturedAccount?.token, 'refreshed-access');
  assert.equal(result.capturedAccount?.refreshToken, 'refreshed-refresh');
  assert.deepEqual(result.credits, { balance: 12 });
  assert.equal(result.quotas.length, 1);
  assert.equal(result.lastSeenAt, 2000);
});

test('different local identity adopts disk credentials and clears stale usage', () => {
  const previous = {
    ...createEmptyLocalAntigravitySession(),
    email: 'old@example.com',
    credits: { balance: 12 },
    quotas: [{ model: 'Gemini', percent: 75 }],
    capturedAccount: { token: 'old-access', email: 'old@example.com' },
  };
  const result = mergeDiskAntigravitySession(previous, {
    id: 'disk',
    label: 'disk',
    token: 'new-access',
    refreshToken: 'new-refresh',
    email: 'new@example.com',
  }, 3000);
  assert.equal(result.email, 'new@example.com');
  assert.equal(result.capturedAccount?.token, 'new-access');
  assert.equal(result.capturedAccount?.refreshToken, 'new-refresh');
  assert.equal(result.credits, null);
  assert.deepEqual(result.quotas, []);
});

test('add button is hidden for a case-insensitive monitored duplicate', () => {
  const session = {
    ...createEmptyLocalAntigravitySession(),
    email: 'USER@example.com',
    capturedAccount: { token: 'obf', email: 'USER@example.com' },
  };
  assert.equal(canAddLocalSessionToMonitored(session, [{ id: '1', label: 'x', token: 'x', email: ' user@EXAMPLE.com ' }]), false);
  assert.equal(canAddLocalSessionToMonitored(session, []), true);
});

test('add button requires both an email and captured token', () => {
  const empty = createEmptyLocalAntigravitySession();
  assert.equal(canAddLocalSessionToMonitored(empty, []), false);
  assert.equal(canAddLocalSessionToMonitored({ ...empty, email: 'x@y.com' }, []), false);
});

test('loadLocalAntigravitySession and saveLocalAntigravitySession persist to localStorage', async () => {
  const {
    loadLocalAntigravitySession,
    saveLocalAntigravitySession,
    LOCAL_ANTIGRAVITY_SESSION_KEY,
  } = await import('../.test-build/local-antigravity-session.js');

  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
  };

  try {
    const empty = loadLocalAntigravitySession();
    assert.equal(empty.online, false);

    store.set(LOCAL_ANTIGRAVITY_SESSION_KEY, '{invalid');
    assert.equal(loadLocalAntigravitySession().online, false);

    const session = {
      email: 'saved@test.com',
      planTier: 'Pro',
      credits: 10,
      quotas: [{ model: 'Gemini', percent: 100 }],
      online: true,
      lastSeenAt: 5555,
    };
    saveLocalAntigravitySession(session);
    const loaded = loadLocalAntigravitySession();
    assert.equal(loaded.email, 'saved@test.com');
    assert.equal(loaded.online, false);
    assert.equal(loaded.quotas.length, 1);
  } finally {
    delete globalThis.localStorage;
  }
});

test('resolveLocalSessionDisplayQuotas prefers raw quotas when available', async () => {
  const { resolveLocalSessionDisplayQuotas } = await import('../.test-build/local-antigravity-session.js');
  const raw = [{ model: 'Gemini Models', percent: 80 }];
  const cloud = [{ model: 'Gemini Models', percent: 20 }];
  const result = resolveLocalSessionDisplayQuotas(raw, cloud, [], [], [], true);
  assert.deepEqual(result, raw);
});

test('resolveLocalSessionDisplayQuotas falls back to cached cloud quotas when raw is empty', async () => {
  const { resolveLocalSessionDisplayQuotas } = await import('../.test-build/local-antigravity-session.js');
  const cloud = [{ model: 'Claude & OpenAI Models', percent: 65, weeklyPercent: 30 }];
  const result = resolveLocalSessionDisplayQuotas([], cloud, [], [], [], true);
  assert.deepEqual(result, cloud);
});

test('resolveLocalSessionDisplayQuotas falls back to account quotas or returns empty array when none available', async () => {
  const { resolveLocalSessionDisplayQuotas } = await import('../.test-build/local-antigravity-session.js');
  const accountQuotas = [{ model: 'Gemini Models', percent: 50 }];
  assert.deepEqual(resolveLocalSessionDisplayQuotas([], [], [], accountQuotas, [], false), accountQuotas);
  assert.deepEqual(resolveLocalSessionDisplayQuotas([], [], [], [], [], false), []);
});

test('drops legacy cloud-shaped local quota rows without a display model', () => {
  const stale = normalizeLocalSessionQuotas([
    { modelId: 'gemini_pool', displayName: 'Gemini Models', fiveHourPercent: 78, weeklyPercent: 80 },
    { modelId: 'claude_and_gpt_pool', displayName: 'Claude & OpenAI Models', fiveHourPercent: 100, weeklyPercent: 67 },
  ]);
  assert.deepEqual(stale, []);

  const valid = normalizeLocalSessionQuotas([
    { model: 'Gemini Models', percent: 78, refreshTime: 'Ready', fiveHourPercent: 78, weeklyPercent: 80 },
    { model: 'Claude & OpenAI Models', percent: 100, refreshTime: 'Ready', fiveHourPercent: 100, weeklyPercent: 67 },
  ]);
  assert.deepEqual(valid.map((quota) => quota.model), ['Gemini Models', 'Claude & OpenAI Models']);
});

test('local session refresh converts cloud quotas into display pools and refreshes stale cache', () => {
  const source = readFileSync(new URL('../src/hooks/useLocalSession.ts', import.meta.url), 'utf8');
  assert.match(source, /aggregateCloudQuotasIntoPools\(res\.quotas\)/);
  assert.match(source, /normalizeLocalSessionQuotas\(previous\.quotas\)/);
});
