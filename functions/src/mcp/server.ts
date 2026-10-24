import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { onRequest } from 'firebase-functions/https';
import { logger } from 'firebase-functions';
import { auth } from '../lib/firebase';
import { getProfile } from '../lib/users';
import {
  authenticateBearer,
  authorizationServerMetadata,
  baseUrl,
  handleAuthorize,
  handleRegister,
  handleToken,
  protectedResourceMetadata,
} from './auth';
import { buildMcpServer } from './tools';

// One HTTP function serves the MCP endpoint and the OAuth endpoints. Firebase Hosting rewrites
// /mcp, /.well-known/oauth-* and /oauth/* on the app's domain to it (see firebase.json).

export const mcp = onRequest({ cors: true, timeoutSeconds: 120, memory: '512MiB' }, async (req, res) => {
  const path = req.path.replace(/\/+$/, '') || '/';
  try {
    if (path.startsWith('/.well-known/oauth-protected-resource')) {
      res.json(protectedResourceMetadata(req));
      return;
    }
    if (path.startsWith('/.well-known/oauth-authorization-server')) {
      res.json(authorizationServerMetadata(req));
      return;
    }
    if (path === '/oauth/register' && req.method === 'POST') return void (await handleRegister(req, res));
    if (path === '/oauth/authorize' && req.method === 'GET') return void (await handleAuthorize(req, res));
    if (path === '/oauth/token' && req.method === 'POST') return void (await handleToken(req, res));

    if (path === '/mcp' || path === '/') {
      const uid = await authenticateBearer(req.get('authorization'));
      if (!uid) {
        res
          .status(401)
          .set('WWW-Authenticate', `Bearer resource_metadata="${baseUrl(req)}/.well-known/oauth-protected-resource"`)
          .json({ error: 'unauthorized', error_description: 'Sign in to Study Helper to use this connector.' });
        return;
      }
      const profile = await getProfile(uid);
      if (!profile) {
        res.status(403).json({ error: 'forbidden', error_description: 'Finish setting up your Study Helper account first.' });
        return;
      }
      if (req.method !== 'POST') {
        // Stateless server: no server-initiated SSE stream.
        res.status(405).set('Allow', 'POST').json({ error: 'method_not_allowed' });
        return;
      }
      const user = await auth.getUser(uid);
      const server = buildMcpServer(uid, profile, user.customClaims?.admin === true);
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
      res.on('close', () => {
        void transport.close();
        void server.close();
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    }
    res.status(404).json({ error: 'not_found' });
  } catch (e) {
    logger.error('mcp request failed', e);
    if (!res.headersSent) res.status(500).json({ error: 'server_error' });
  }
});
