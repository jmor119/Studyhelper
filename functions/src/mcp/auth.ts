import { createHash } from 'node:crypto';
import type { Request, Response } from 'express';
import { onCall } from 'firebase-functions/https';
import { z } from 'zod';
import { randomToken, sha256 } from '../lib/crypto';
import { appBaseUrl, db, isEmulator } from '../lib/firebase';
import { fail, parseInput, requireAuth } from '../lib/http';
import { rateLimit } from '../lib/ratelimit';
import { requireProfile } from '../lib/users';

// OAuth 2.1 authorization server for MCP clients (Claude, ChatGPT, …), with PKCE (S256) and
// dynamic client registration, backed by Firebase Auth for sign-in via the web app's consent page.
// Tokens are opaque random strings; only their SHA-256 hashes are stored.

const ACCESS_TTL = 3600;
const REFRESH_TTL = 30 * 86400;
const CODE_TTL = 300;
const REQUEST_TTL = 900;

export function baseUrl(req: Request): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;
  if (isEmulator()) {
    const host = req.get('x-forwarded-host') ?? req.get('host');
    return `${req.protocol}://${host}`;
  }
  return appBaseUrl();
}

export function protectedResourceMetadata(req: Request) {
  const base = baseUrl(req);
  return {
    resource: `${base}/mcp`,
    authorization_servers: [base],
    bearer_methods_supported: ['header'],
    scopes_supported: ['study'],
    resource_name: 'Study Helper',
  };
}

export function authorizationServerMetadata(req: Request) {
  const base = baseUrl(req);
  return {
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    registration_endpoint: `${base}/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: ['study'],
  };
}

function validRedirect(uri: string): boolean {
  try {
    const u = new URL(uri);
    if (u.hash) return false;
    if (u.protocol === 'https:') return true;
    if (u.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)) return true;
    return false;
  } catch {
    return false;
  }
}

function oauthError(res: Response, status: number, error: string, description: string) {
  res.status(status).json({ error, error_description: description });
}

// ---------------------------------------------------------------------------------------------

export async function handleRegister(req: Request, res: Response) {
  const ip = (req.get('x-forwarded-for') ?? req.ip ?? 'unknown').split(',')[0]!.trim();
  try {
    await rateLimit(`oauth-register:${sha256(ip).slice(0, 16)}`, 20, 3600);
  } catch {
    return oauthError(res, 429, 'too_many_requests', 'Too many registrations');
  }
  const body = (req.body ?? {}) as { redirect_uris?: unknown; client_name?: unknown };
  const uris = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter((u): u is string => typeof u === 'string') : [];
  if (!uris.length || uris.length > 10 || !uris.every(validRedirect)) {
    return oauthError(res, 400, 'invalid_redirect_uri', 'redirect_uris must be https (or http://localhost) URLs');
  }
  const clientName = typeof body.client_name === 'string' ? body.client_name.slice(0, 80) : 'MCP client';
  const clientId = `mcp_${randomToken(16)}`;
  const now = Math.floor(Date.now() / 1000);
  await db.doc(`oauthClients/${clientId}`).set({ clientName, redirectUris: uris, createdAt: Date.now() });
  res.status(201).json({
    client_id: clientId,
    client_id_issued_at: now,
    client_name: clientName,
    redirect_uris: uris,
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
  });
}

export async function handleAuthorize(req: Request, res: Response) {
  const q = req.query as Record<string, string | undefined>;
  const client = q.client_id ? (await db.doc(`oauthClients/${q.client_id}`).get()).data() : undefined;
  if (!client) return oauthError(res, 400, 'invalid_client', 'Unknown client_id');
  if (!q.redirect_uri || !(client.redirectUris as string[]).includes(q.redirect_uri)) {
    return oauthError(res, 400, 'invalid_request', 'redirect_uri not registered for this client');
  }
  const redirect = new URL(q.redirect_uri);
  const bounce = (error: string) => {
    redirect.searchParams.set('error', error);
    if (q.state) redirect.searchParams.set('state', q.state);
    res.redirect(302, redirect.toString());
  };
  if (q.response_type !== 'code') return bounce('unsupported_response_type');
  if (!q.code_challenge || q.code_challenge_method !== 'S256') return bounce('invalid_request');

  const requestId = randomToken(18);
  await db.doc(`oauthRequests/${requestId}`).set({
    clientId: q.client_id,
    clientName: client.clientName,
    redirectUri: q.redirect_uri,
    codeChallenge: q.code_challenge,
    state: q.state ?? null,
    scope: q.scope ?? 'study',
    createdAt: Date.now(),
    expiresAt: Date.now() + REQUEST_TTL * 1000,
  });
  const appBase = isEmulator() ? 'http://localhost:5173' : appBaseUrl();
  res.redirect(302, `${appBase}/oauth/consent?request=${encodeURIComponent(requestId)}`);
}

async function issueTokens(uid: string, clientId: string, scope: string) {
  const access = `sha_${randomToken(32)}`;
  const refresh = `shr_${randomToken(32)}`;
  const now = Date.now();
  const batch = db.batch();
  batch.set(db.doc(`oauthTokens/${sha256(access)}`), { uid, clientId, type: 'access', scope, createdAt: now, expiresAt: now + ACCESS_TTL * 1000 });
  batch.set(db.doc(`oauthTokens/${sha256(refresh)}`), { uid, clientId, type: 'refresh', scope, createdAt: now, expiresAt: now + REFRESH_TTL * 1000 });
  await batch.commit();
  return { access_token: access, token_type: 'Bearer', expires_in: ACCESS_TTL, refresh_token: refresh, scope };
}

export async function handleToken(req: Request, res: Response) {
  res.set('Cache-Control', 'no-store');
  const b = (req.body ?? {}) as Record<string, string | undefined>;
  if (b.grant_type === 'authorization_code') {
    if (!b.code || !b.code_verifier || !b.client_id || !b.redirect_uri) return oauthError(res, 400, 'invalid_request', 'Missing parameters');
    const ref = db.doc(`oauthCodes/${sha256(b.code)}`);
    const data = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return null;
      tx.delete(ref); // single use
      return snap.data()!;
    });
    if (!data || data.expiresAt < Date.now()) return oauthError(res, 400, 'invalid_grant', 'Code expired or already used');
    if (data.clientId !== b.client_id || data.redirectUri !== b.redirect_uri) return oauthError(res, 400, 'invalid_grant', 'Client mismatch');
    const challenge = createHash('sha256').update(b.code_verifier).digest('base64url');
    if (challenge !== data.codeChallenge) return oauthError(res, 400, 'invalid_grant', 'PKCE verification failed');
    return res.json(await issueTokens(data.uid as string, data.clientId as string, data.scope as string));
  }
  if (b.grant_type === 'refresh_token') {
    if (!b.refresh_token || !b.client_id) return oauthError(res, 400, 'invalid_request', 'Missing parameters');
    const ref = db.doc(`oauthTokens/${sha256(b.refresh_token)}`);
    const data = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return null;
      tx.delete(ref); // rotate
      return snap.data()!;
    });
    if (!data || data.type !== 'refresh' || data.expiresAt < Date.now() || data.clientId !== b.client_id) {
      return oauthError(res, 400, 'invalid_grant', 'Refresh token invalid');
    }
    return res.json(await issueTokens(data.uid as string, data.clientId as string, data.scope as string));
  }
  return oauthError(res, 400, 'unsupported_grant_type', 'Use authorization_code or refresh_token');
}

/** Resolves a bearer token (OAuth access token or personal API token) to a uid. */
export async function authenticateBearer(header: string | undefined): Promise<string | null> {
  const m = header?.match(/^Bearer\s+(\S+)$/i);
  if (!m) return null;
  const hash = sha256(m[1]!);
  const oauth = await db.doc(`oauthTokens/${hash}`).get();
  if (oauth.exists) {
    const d = oauth.data()!;
    return d.type === 'access' && d.expiresAt > Date.now() ? (d.uid as string) : null;
  }
  const pat = await db.doc(`apiTokens/${hash}`).get();
  if (pat.exists) {
    const d = pat.data()!;
    if (d.expiresAt && d.expiresAt < Date.now()) return null;
    void pat.ref.update({ lastUsedAt: Date.now() }).catch(() => undefined);
    return d.uid as string;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Callables used by the web app's consent page and settings.

export const oauthGetRequest = onCall(async (req) => {
  requireAuth(req);
  const { requestId } = parseInput(z.object({ requestId: z.string().min(10).max(60) }), req.data);
  const data = (await db.doc(`oauthRequests/${requestId}`).get()).data();
  if (!data || data.expiresAt < Date.now()) throw fail.notFound('That sign-in request');
  return { clientName: data.clientName as string, redirectHost: new URL(data.redirectUri as string).host };
});

export const oauthDecide = onCall(async (req) => {
  const uid = requireAuth(req);
  await requireProfile(uid);
  const { requestId, approve } = parseInput(z.object({ requestId: z.string().min(10).max(60), approve: z.boolean() }), req.data);
  const ref = db.doc(`oauthRequests/${requestId}`);
  const data = (await ref.get()).data();
  if (!data || data.expiresAt < Date.now()) throw fail.notFound('That sign-in request');
  await ref.delete();
  const redirect = new URL(data.redirectUri as string);
  if (data.state) redirect.searchParams.set('state', data.state as string);
  if (!approve) {
    redirect.searchParams.set('error', 'access_denied');
    return { redirectTo: redirect.toString() };
  }
  const code = randomToken(24);
  await db.doc(`oauthCodes/${sha256(code)}`).set({
    uid,
    clientId: data.clientId,
    clientName: data.clientName,
    redirectUri: data.redirectUri,
    codeChallenge: data.codeChallenge,
    scope: data.scope,
    expiresAt: Date.now() + CODE_TTL * 1000,
  });
  redirect.searchParams.set('code', code);
  return { redirectTo: redirect.toString() };
});

export const createApiToken = onCall(async (req) => {
  const uid = requireAuth(req);
  await requireProfile(uid);
  await rateLimit(`api-token:${uid}`, 10, 86400);
  const { name } = parseInput(z.object({ name: z.string().trim().min(1).max(60) }), req.data);
  const existing = await db.collection('apiTokens').where('uid', '==', uid).get();
  if (existing.size >= 10) throw fail.precondition('You can have up to 10 tokens. Revoke one first.');
  const token = `shp_${randomToken(32)}`;
  const tokenId = randomToken(8);
  await db.doc(`apiTokens/${sha256(token)}`).set({ uid, name, tokenId, prefix: token.slice(0, 8), createdAt: Date.now(), lastUsedAt: null });
  return { token, tokenId, name };
});

export const listConnections = onCall(async (req) => {
  const uid = requireAuth(req);
  const [tokens, oauth] = await Promise.all([
    db.collection('apiTokens').where('uid', '==', uid).get(),
    db.collection('oauthTokens').where('uid', '==', uid).where('type', '==', 'refresh').get(),
  ]);
  const apps = new Map<string, { clientId: string; createdAt: number }>();
  for (const d of oauth.docs) {
    const x = d.data();
    if (x.expiresAt > Date.now()) apps.set(x.clientId, { clientId: x.clientId, createdAt: x.createdAt });
  }
  const clients = await Promise.all([...apps.keys()].map((id) => db.doc(`oauthClients/${id}`).get()));
  return {
    tokens: tokens.docs.map((d) => {
      const x = d.data();
      return { tokenId: x.tokenId, name: x.name, prefix: x.prefix, createdAt: x.createdAt, lastUsedAt: x.lastUsedAt };
    }),
    apps: clients.map((c) => ({ clientId: c.id, name: (c.data()?.clientName as string) ?? 'MCP client', connectedAt: apps.get(c.id)!.createdAt })),
  };
});

export const revokeConnection = onCall(async (req) => {
  const uid = requireAuth(req);
  const input = parseInput(z.object({ tokenId: z.string().optional(), clientId: z.string().optional() }), req.data);
  if (input.tokenId) {
    const snap = await db.collection('apiTokens').where('uid', '==', uid).where('tokenId', '==', input.tokenId).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
  if (input.clientId) {
    const snap = await db.collection('oauthTokens').where('uid', '==', uid).where('clientId', '==', input.clientId).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
  return { ok: true };
});
