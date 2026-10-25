# Setup and deployment

Project: **study-helper-11021** (Blaze plan). Region: **australia-southeast1** (Sydney) for Firestore, Storage and Functions.

## One-time console steps

1. **Firestore**: Build → Firestore Database → *Create database* → location `australia-southeast1` (permanent) → production mode. The deployed rules replace the defaults.
2. **Authentication**: Build → Authentication → *Get started* → Sign-in method:
   - enable **Email/Password**
   - enable **Google** (set the support email)
   - under Settings → Authorised domains, `study-helper-11021.web.app` and `.firebaseapp.com` are there by default; add any custom domain
3. **Storage**: Build → Storage → *Get started* → location `australia-southeast1`.
4. **Weekly emails (optional)**: install the **Trigger Email from Firestore** extension (`firebase/firestore-send-email`) with collection `mail` and your SMTP provider (e.g. SendGrid, Mailgun, Resend, or a Gmail app password). Functions already write to `mail`.
5. **App Check (recommended once live)**: register reCAPTCHA Enterprise for the web app, then set `enforceAppCheck` on callables.

## One-time CLI steps

```bash
firebase login                                   # already done on this machine
firebase use study-helper-11021

# Register the web app and copy its config into apps/web/.env.production
firebase apps:create WEB "Study Helper"
firebase apps:sdkconfig WEB <appId>              # → VITE_FIREBASE_API_KEY, _APP_ID, _MESSAGING_SENDER_ID

# Encryption key for stored AI keys (generate once; never commit; losing it means families re-enter keys)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" > key.txt
firebase functions:secrets:set KEY_ENCRYPTION_KEY --data-file key.txt
rm key.txt
```

`apps/web/.env.production`:

```
VITE_USE_EMULATORS=false
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=study-helper-11021.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=study-helper-11021
VITE_FIREBASE_STORAGE_BUCKET=study-helper-11021.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

(Firebase web config is not secret; access is controlled by the security rules.)

## Deploy

```bash
npm run validate:content && npm test && npm run test:rules
firebase deploy --project study-helper-11021          # functions, rules, indexes, storage rules, hosting
```

Seed or update the question bank. Use the admin key file, and keep it **outside** the repo:

```bash
npx tsx scripts/seed.ts --project study-helper-11021 --credentials "C:/Users/OEM/Downloads/study-helper-11021-firebase-adminsdk-....json"
```

Make yourself an admin (sign up in the app first):

```bash
npx tsx scripts/set-admin.ts --email you@example.com --project study-helper-11021 --credentials "<same file>"
```

## Connecting AI apps (MCP)

- **Claude (web/desktop)**: Settings → Connectors → *Add custom connector* → `https://study-helper-11021.web.app/mcp`. Sign in and approve when asked.
- **ChatGPT**: Settings → Connectors (developer mode) → add `https://study-helper-11021.web.app/mcp`.
- **Claude Code**: create a personal token in Study Helper → Settings → Connect AI apps, then run:
  `claude mcp add --transport http study-helper https://study-helper-11021.web.app/mcp --header "Authorization: Bearer shp_..."`

Admins can write questions with Claude and use the `add_questions` tool to publish them to the shared bank, without paying API costs.

## After deploying

- Rotate the service-account key you downloaded once seeding is done (IAM → Service accounts), or keep it somewhere safe outside the repo.
- Turn on budget alerts (Billing → Budgets) for the project.
- Firestore backups: enable point-in-time recovery or scheduled backups in the console.
