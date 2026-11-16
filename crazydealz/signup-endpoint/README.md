# Crazy Dealz Tires signup endpoint

Deploy-ready Cloudflare Worker for the homepage email signup form (inline form and the 20-second popup). It is **not deployed**. Do not put this on the existing **ai901.help** Cloudflare account or Zoho account. Crazy Dealz needs its own, separate Cloudflare account. Owner-vs-Joshua account naming is still undecided, so no account was created here and nothing was purchased.

The live site is unchanged. The forms on branch `crazydealz-signup-form` still have an empty `data-endpoint`, so visitors still see the honest “not open yet” message. After this Worker is deployed on the new account, set `data-endpoint` on both `#signup-form` and `#signup-popup-form` in `crazydealz/index.html` to the Worker URL, then merge.

This Worker never sends SMS. The `sms_optin` flag is stored exactly as the visitor checked it, for consent records only. A2P is not filed.

## What it does

- `POST /` or `POST /signup` — accepts `application/json` or form data (`application/x-www-form-urlencoded` or `multipart/form-data`, which is what the site already posts).
- Validates the email, requires email consent, and requires a phone only when the text box is checked.
- Stores one row per submission in D1: timestamp, source, `email_optin` and `sms_optin` booleans as checked, consent text version, the visible consent wording, language, name, phone, IP hash (not the raw IP), and user-agent.
- Emails a plain-text notification to `support@crazydealztires.com`. If the email send fails, the row is still kept.
- CORS is locked to `https://ai901.help`, `https://www.ai901.help`, `https://opdate27-netizen.github.io`, `https://crazydealztires.com`, and `https://www.crazydealztires.com`.
- Honeypot field `_honey`: if filled, the Worker returns `{ ok: true }` but stores nothing and sends no email.
- Basic rate limit: 5 posts per 10 minutes per IP (KV).
- `GET /export` or `GET /export.csv` — CSV download, protected by `EXPORT_TOKEN`.
- `GET /health` — liveness check, no secrets.

## Local tests

From this directory (Node 18+):

```bash
npm install
npm test
```

For a local Worker process (uses local D1 and KV; emails are logged, not sent):

```bash
cp .dev.vars.example .dev.vars
npx wrangler dev
```

Then, in another terminal:

```bash
curl -sS -X POST http://127.0.0.1:8787/signup   -H 'Origin: https://ai901.help'   -H 'Content-Type: application/json'   -d '{"email":"test+crazydealz@ai901.help","email_consent":"yes","sms_consent":"no","source":"local-dev"}'
```

`wrangler dev` talks only to your machine. It does not deploy.

## Deploy on a NEW separate Cloudflare account

Do these steps only after Joshua decides whose name the account is in, and after he approves the deploy. Do not log into the ai901.help Cloudflare account for this.

### 1. Create the Cloudflare account

1. Sign up at https://dash.cloudflare.com/sign-up with the chosen owner email (shop owner, or Joshua to hand over later).
2. Skip adding a domain if `crazydealztires.com` is not registered yet. A `workers.dev` URL is enough to go live with the form.
3. On a computer that is logged into **this new account only**, install Node if needed, then in this folder:

```bash
npm install
npx wrangler login
npx wrangler whoami
```

Confirm the account email and account id are the new Crazy Dealz account, not ai901.

### 2. Create D1 and KV, then fill `wrangler.toml`

```bash
npx wrangler d1 create crazy-dealz-signups
npx wrangler kv namespace create RATE_LIMIT
```

Each command prints an id. In `wrangler.toml`:

- Uncomment and set `account_id` to the id from `wrangler whoami`.
- Set `database_id` under `[[d1_databases]]` to the D1 id.
- Set `id` under `[[kv_namespaces]]` to the KV namespace id.

Apply the schema to the remote database:

```bash
npx wrangler d1 migrations apply crazy-dealz-signups --remote
```

### 3. Set secrets

Generate long random values (do not commit them, and do not paste them into chat):

```bash
# IP hash salt and CSV export token
openssl rand -hex 32
openssl rand -hex 32

npx wrangler secret put IP_HASH_SALT
npx wrangler secret put EXPORT_TOKEN
```

Then set the mail secret for the provider you chose (Resend is the default in `wrangler.toml`):

```bash
npx wrangler secret put MAIL_API_KEY
```

If you use `MAIL_PROVIDER=http` instead, also set the webhook URL:

```bash
npx wrangler secret put MAIL_WEBHOOK_URL
```

### 4. Choose an email provider

`MAIL_PROVIDER` in `wrangler.toml` can be:

| Value | What you need | How it sends |
| --- | --- | --- |
| `resend` (recommended) | A Resend account and a verified sending domain | `POST https://api.resend.com/emails` with `MAIL_API_KEY` |
| `mailchannels` | An existing MailChannels account. This is no longer a free built-in on Cloudflare Workers. | `POST https://api.mailchannels.net/tx/v1/send` |
| `http` | Any HTTPS inbox or automation webhook | `POST` to `MAIL_WEBHOOK_URL` with optional bearer `MAIL_API_KEY` |
| `log` | Nothing | Writes to Worker logs only. Use for `wrangler dev`, not production. |

`MAIL_TO` is already `support@crazydealztires.com`. That mailbox has to exist and actually receive mail before you rely on the notifications. `MAIL_FROM` must be a domain the provider is allowed to send from (for Resend, verify the domain first). Until `crazydealztires.com` is on the new account, you can temporarily set `MAIL_FROM` to a Resend-verified address, but keep `MAIL_TO` pointed at the shop mailbox once it works.

Resend setup, briefly: create a Resend account (separate from ai901), add and verify the sending domain, copy the API key, put it in `MAIL_API_KEY`. The free tier is enough for these notifications.

### 5. Deploy the Worker

```bash
npx wrangler deploy
```

Wrangler will print a URL such as `https://crazy-dealz-signup.<subdomain>.workers.dev`. Optional, once `crazydealztires.com` is on this same new Cloudflare account: in the dashboard, add a custom domain like `https://signup.crazydealztires.com` to the Worker. Do not add that DNS on the ai901.help zone.

### 6. Smoke-test, then point the forms at it

Health check:

```bash
curl -sS https://YOUR-WORKER-URL/health
```

A harmless test signup (use a test address, not a real customer):

```bash
curl -sS -X POST https://YOUR-WORKER-URL/signup   -H 'Origin: https://ai901.help'   -H 'Content-Type: application/json'   -d '{"email":"test+crazydealz@ai901.help","first_name":"Test","email_consent":"yes","sms_consent":"no","email_consent_text":"Email me service reminders and shop news","consent_version":"cdz-signup-v1-2026-11-15","source":"deploy-smoke","language":"en"}'
```

Confirm the row (replace the token with the secret; do not commit it):

```bash
curl -sS -H "Authorization: Bearer $EXPORT_TOKEN" https://YOUR-WORKER-URL/export
```

Confirm a notification arrived at `support@crazydealztires.com`.

Only after that works, edit `crazydealz/index.html` on this branch and set the same Worker URL on both forms:

```html
<form class="signup-form" id="signup-form" data-endpoint="https://YOUR-WORKER-URL/signup" novalidate>
<form class="signup-form" id="signup-popup-form" data-endpoint="https://YOUR-WORKER-URL/signup" novalidate>
```

Keep `data-endpoint=""` until then. An empty value still shows “Online sign-up is not open yet, so nothing was sent.” Submit the form once from the staged site, including a failure case (disconnect or a bad URL), to confirm the success and error messages. Then merge to `main` and deploy the site — that merge is a separate, approved step. This README does not merge or deploy the site.

## CSV export

```bash
curl -sS -H "Authorization: Bearer $EXPORT_TOKEN" https://YOUR-WORKER-URL/export -o signups.csv
```

The token is also accepted as `X-Export-Token` or `?token=`. Prefer the header so the secret is less likely to land in server logs. The CSV includes the hashed IP and user-agent as consent proof, not the raw IP.

## Request fields

The site already posts: `email`, `first_name`, `phone`, `email_consent`, `sms_consent`, `email_consent_text`, `sms_consent_text`, `consent_time`, `language`, `source`, `_subject`, `_honey`. This Worker also honors `consent_version` (the forms now send `cdz-signup-v1-2026-11-15`).

Consent booleans accept `yes` / `no` (what the site sends) plus `true` / `false` / `on` / `1`. Unchecked or missing is stored as false. The Worker does not send texts.

## Secrets and accounts needed to go live

Nothing below has been created yet.

- A **new Cloudflare account**, not the ai901.help one, in the name Joshua chooses.
- That account’s `account_id`, a D1 database `crazy-dealz-signups`, and a KV namespace `RATE_LIMIT`.
- Secrets: `IP_HASH_SALT`, `EXPORT_TOKEN`, and `MAIL_API_KEY` (plus `MAIL_WEBHOOK_URL` only for `MAIL_PROVIDER=http`).
- An email provider account (Resend recommended) with a verified sending domain.
- The `support@crazydealztires.com` mailbox actually receiving mail (domain registration and mailbox setup are still separate, and still blocked on the account-name decision).
- Shop-owner OK on the opt-in wording, and a later OK to set `data-endpoint` and merge the branch.
- No SMS provider. Do not send reminder texts until A2P is approved.
