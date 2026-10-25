import { AI_PROVIDERS, nzMonthKey, type AiProvider } from '@study-helper/shared';
import { defineSecret } from 'firebase-functions/params';
import { onCall } from 'firebase-functions/https';
import { z } from 'zod';
import { seal, unseal, type Sealed } from '../lib/crypto';
import { db, FieldValue } from '../lib/firebase';
import { fail, parseInput, requireAuth } from '../lib/http';
import { rateLimit } from '../lib/ratelimit';
import { getProfile, linkedParents } from '../lib/users';
import { createLlm, defaultModel, estimateCostUsd, listModels, type LlmClient, type Usage } from './providers';

export const KEY_ENCRYPTION_KEY = defineSecret('KEY_ENCRYPTION_KEY');

export interface AiSettings {
  providers: Partial<Record<AiProvider, { last4: string; addedAt: number; models: string[] }>>;
  activeProvider?: AiProvider;
  model?: string;
  monthlyLimitUsd: number;
  updatedAt: number;
}

const DEFAULT_LIMIT_USD = 10;
const aad = (uid: string, provider: AiProvider) => `${uid}:${provider}`;

async function getSettings(uid: string): Promise<AiSettings | undefined> {
  return (await db.doc(`users/${uid}/private/ai`).get()).data() as AiSettings | undefined;
}

// ---------------------------------------------------------------------------------------------
// Key management (owner only). The plaintext key never leaves the server.

export const saveAiKey = onCall({ secrets: [KEY_ENCRYPTION_KEY] }, async (req) => {
  const uid = requireAuth(req);
  await rateLimit(`ai-key:${uid}`, 10, 3600);
  const input = parseInput(z.object({ provider: z.enum(AI_PROVIDERS), apiKey: z.string().trim().min(20).max(400) }), req.data);
  if (input.provider === 'anthropic' && !input.apiKey.startsWith('sk-ant-')) throw fail.invalid('Anthropic keys start with "sk-ant-".');
  if (input.provider === 'openai' && !input.apiKey.startsWith('sk-')) throw fail.invalid('OpenAI keys start with "sk-".');

  let models;
  try {
    models = await listModels(input.provider, input.apiKey);
  } catch {
    throw fail.invalid("That key didn't work. Check it's copied correctly and has API access.");
  }
  if (!models.length) throw fail.invalid('That key works, but has no chat models available.');

  const sealed = seal(input.apiKey, KEY_ENCRYPTION_KEY.value(), aad(uid, input.provider));
  await db.doc(`secrets/${uid}`).set({ [input.provider]: sealed, updatedAt: Date.now() }, { merge: true });
  const prev = await getSettings(uid);
  const settings: AiSettings = {
    providers: {
      ...(prev?.providers ?? {}),
      [input.provider]: { last4: input.apiKey.slice(-4), addedAt: Date.now(), models: models.map((m) => m.id).slice(0, 60) },
    },
    activeProvider: prev?.activeProvider ?? input.provider,
    model: prev?.activeProvider && prev.activeProvider !== input.provider ? prev.model : defaultModel(input.provider, models),
    monthlyLimitUsd: prev?.monthlyLimitUsd ?? DEFAULT_LIMIT_USD,
    updatedAt: Date.now(),
  };
  if (!prev?.activeProvider || prev.activeProvider === input.provider) {
    settings.activeProvider = input.provider;
    settings.model = defaultModel(input.provider, models);
  }
  await db.doc(`users/${uid}/private/ai`).set(settings);
  return { ok: true, models: models.slice(0, 60), model: settings.model, activeProvider: settings.activeProvider };
});

export const deleteAiKey = onCall(async (req) => {
  const uid = requireAuth(req);
  const { provider } = parseInput(z.object({ provider: z.enum(AI_PROVIDERS) }), req.data);
  await db.doc(`secrets/${uid}`).set({ [provider]: FieldValue.delete() }, { merge: true });
  const prev = await getSettings(uid);
  if (prev) {
    const providers = { ...prev.providers };
    delete providers[provider];
    const remaining = Object.keys(providers) as AiProvider[];
    const switchTo = prev.activeProvider === provider ? remaining[0] : prev.activeProvider;
    await db.doc(`users/${uid}/private/ai`).set({
      ...prev,
      providers,
      activeProvider: switchTo ?? FieldValue.delete(),
      model: switchTo === prev.activeProvider ? prev.model : switchTo ? (providers[switchTo]?.models[0] ?? FieldValue.delete()) : FieldValue.delete(),
      updatedAt: Date.now(),
    });
  }
  return { ok: true };
});

export const setAiPrefs = onCall(async (req) => {
  const uid = requireAuth(req);
  const input = parseInput(
    z.object({
      activeProvider: z.enum(AI_PROVIDERS).optional(),
      model: z.string().max(100).optional(),
      monthlyLimitUsd: z.number().min(0).max(500).optional(),
    }),
    req.data,
  );
  const prev = await getSettings(uid);
  if (!prev) throw fail.precondition('Add an AI key first.');
  const provider = input.activeProvider ?? prev.activeProvider;
  if (!provider || !prev.providers[provider]) throw fail.invalid('Add a key for that provider first.');
  const models = prev.providers[provider]!.models;
  const model = input.model ?? (provider === prev.activeProvider ? prev.model : models[0]);
  if (model && !models.includes(model)) throw fail.invalid("That model isn't available with your key.");
  await db.doc(`users/${uid}/private/ai`).update({
    activeProvider: provider,
    model,
    ...(input.monthlyLimitUsd !== undefined && { monthlyLimitUsd: input.monthlyLimitUsd }),
    updatedAt: Date.now(),
  });
  return { ok: true };
});

// ---------------------------------------------------------------------------------------------
// Resolving which key a request uses, and enforcing the monthly budget.

export interface ResolvedAi {
  ownerUid: string;
  ownerName: string;
  llm: LlmClient;
  limitUsd: number;
  spentUsd: number;
}

async function monthSpend(ownerUid: string): Promise<number> {
  const snap = await db.doc(`usage/${ownerUid}/months/${nzMonthKey()}`).get();
  return (snap.data()?.costUsd as number | undefined) ?? 0;
}

async function tryOwner(ownerUid: string): Promise<ResolvedAi | null> {
  const settings = await getSettings(ownerUid);
  const provider = settings?.activeProvider;
  if (!settings || !provider || !settings.providers[provider]) return null;
  const secrets = (await db.doc(`secrets/${ownerUid}`).get()).data() as Partial<Record<AiProvider, Sealed>> | undefined;
  const sealed = secrets?.[provider];
  if (!sealed) return null;
  const apiKey = unseal(sealed, KEY_ENCRYPTION_KEY.value(), aad(ownerUid, provider));
  const owner = await getProfile(ownerUid);
  return {
    ownerUid,
    ownerName: owner?.displayName ?? 'your family',
    llm: await createLlm(provider, apiKey, settings.model ?? defaultModel(provider, [])),
    limitUsd: settings.monthlyLimitUsd ?? DEFAULT_LIMIT_USD,
    spentUsd: await monthSpend(ownerUid),
  };
}

/** A student's own key first, then linked parents who share theirs. */
export async function resolveAi(uid: string): Promise<ResolvedAi | null> {
  const own = await tryOwner(uid);
  if (own) return own;
  const parents = await linkedParents(uid);
  for (const link of parents.sort((a, b) => a.createdAt - b.createdAt)) {
    const parent = await getProfile(link.parentUid);
    if (parent?.prefs?.shareAiKey === false) continue;
    const resolved = await tryOwner(link.parentUid);
    if (resolved) return resolved;
  }
  return null;
}

/** Resolves a key and checks the budget, or throws a friendly error. */
export async function requireAi(uid: string): Promise<ResolvedAi> {
  const ai = await resolveAi(uid);
  if (!ai) {
    throw fail.precondition(
      'AI features need an API key. Ask a parent to add one in Settings → AI (or add your own).',
    );
  }
  if (ai.limitUsd <= 0 || ai.spentUsd >= ai.limitUsd) {
    throw fail.exhausted(
      ai.ownerUid === uid
        ? "You've reached this month's AI budget. You can raise it in Settings → AI."
        : `This month's AI budget is used up. Ask ${ai.ownerName} to raise it in Settings → AI.`,
    );
  }
  return ai;
}

export type AiFeature = 'tutor' | 'generate' | 'verify' | 'mark' | 'notes' | 'working';

export async function recordUsage(ai: ResolvedAi, uid: string, feature: AiFeature, usage: Usage): Promise<number> {
  const cost = estimateCostUsd(usage);
  const ref = db.doc(`usage/${ai.ownerUid}/months/${nzMonthKey()}`);
  await ref.set(
    {
      inputTokens: FieldValue.increment(usage.inputTokens),
      outputTokens: FieldValue.increment(usage.outputTokens),
      costUsd: FieldValue.increment(cost),
      requests: FieldValue.increment(1),
      byUser: { [uid]: { costUsd: FieldValue.increment(cost), requests: FieldValue.increment(1) } },
      byFeature: { [feature]: { costUsd: FieldValue.increment(cost), requests: FieldValue.increment(1) } },
      updatedAt: Date.now(),
    },
    { merge: true },
  );
  return cost;
}

/** What the current user can do with AI right now (for the UI). */
export const getAiStatus = onCall({ secrets: [KEY_ENCRYPTION_KEY] }, async (req) => {
  const uid = requireAuth(req);
  const ai = await resolveAi(uid);
  if (!ai) return { available: false as const };
  return {
    available: true as const,
    fromOwnName: ai.ownerUid === uid,
    ownerName: ai.ownerName,
    provider: ai.llm.provider,
    model: ai.llm.model,
    limitUsd: ai.limitUsd,
    spentUsd: Math.round(ai.spentUsd * 100) / 100,
    budgetLeft: ai.limitUsd > ai.spentUsd,
  };
});
