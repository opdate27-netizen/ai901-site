import {
  MAX_BODY_BYTES,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_SEC,
  boolFromDb,
  clientIp,
  corsHeaders,
  extractExportToken,
  hashIp,
  isAllowedOrigin,
  json,
  parseSignup,
  preflight,
  readBody,
  timingSafeEqualString,
  toCsv,
  truthyFlag,
  validateSignup,
} from "./lib.js";
import { sendNotification } from "./email.js";

const INSERT_SQL = `INSERT INTO signups (
  id, created_at, email, first_name, phone,
  email_optin, sms_optin, consent_text_version,
  email_consent_text, sms_consent_text, language, source,
  ip_hash, user_agent, consent_time, notify_status
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const SELECT_SQL = `SELECT id, created_at, email, first_name, phone,
  email_optin, sms_optin, consent_text_version,
  email_consent_text, sms_consent_text, language, source,
  ip_hash, user_agent, consent_time, notify_status
FROM signups
ORDER BY created_at ASC`;

function pathOf(request) {
  return new URL(request.url).pathname.replace(/\/+$/, "") || "/";
}

function guardOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) {
    if (truthyFlag(env.ALLOW_NO_ORIGIN)) return null;
    return json(request, env, { ok: false, error: "origin_required" }, 403);
  }
  if (!isAllowedOrigin(origin, env)) {
    return json(request, env, { ok: false, error: "origin_not_allowed" }, 403);
  }
  return null;
}

async function rateLimit(env, ip) {
  if (!env.RATE_LIMIT) return { limited: false };
  const key = `rl:${ip || "unknown"}`;
  const current = Number((await env.RATE_LIMIT.get(key)) || 0);
  if (current >= RATE_LIMIT_MAX) {
    return { limited: true, retryAfter: RATE_LIMIT_WINDOW_SEC };
  }
  await env.RATE_LIMIT.put(key, String(current + 1), {
    expirationTtl: RATE_LIMIT_WINDOW_SEC,
  });
  return { limited: false };
}

async function handleSignup(request, env, fetcher) {
  const blocked = guardOrigin(request, env);
  if (blocked) return blocked;

  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > MAX_BODY_BYTES) {
    return json(request, env, { ok: false, error: "payload_too_large" }, 413);
  }

  let raw;
  try {
    raw = await readBody(request);
  } catch (err) {
    const status = err.status || 400;
    return json(request, env, { ok: false, error: err.message || "invalid_body" }, status);
  }

  const parsed = parseSignup(raw, env);

  // Honeypot: look like success, store nothing, email nobody.
  if (parsed.honey) {
    return json(request, env, { ok: true, ignored: true }, 200);
  }

  const check = validateSignup(parsed);
  if (!check.ok) {
    return json(request, env, { ok: false, error: check.error }, check.status);
  }

  const ip = clientIp(request);
  const limit = await rateLimit(env, ip);
  if (limit.limited) {
    return json(
      request,
      env,
      { ok: false, error: "rate_limited" },
      429,
      { "Retry-After": String(limit.retryAfter) },
    );
  }

  const now = new Date().toISOString();
  const record = {
    id: crypto.randomUUID(),
    created_at: now,
    email: parsed.email,
    first_name: parsed.first_name,
    phone: parsed.phone,
    email_optin: parsed.email_optin,
    sms_optin: parsed.sms_optin,
    consent_text_version: parsed.consent_text_version,
    email_consent_text: parsed.email_consent_text,
    sms_consent_text: parsed.sms_consent_text,
    language: parsed.language,
    source: parsed.source,
    ip_hash: await hashIp(ip, env.IP_HASH_SALT),
    user_agent: (request.headers.get("User-Agent") || "").slice(0, 300),
    consent_time: parsed.consent_time || now,
    notify_status: "pending",
  };

  if (!env.DB) {
    return json(request, env, { ok: false, error: "storage_unavailable" }, 500);
  }

  await env.DB.prepare(INSERT_SQL)
    .bind(
      record.id,
      record.created_at,
      record.email,
      record.first_name,
      record.phone,
      record.email_optin ? 1 : 0,
      record.sms_optin ? 1 : 0,
      record.consent_text_version,
      record.email_consent_text,
      record.sms_consent_text,
      record.language,
      record.source,
      record.ip_hash,
      record.user_agent,
      record.consent_time,
      record.notify_status,
    )
    .run();

  let notify;
  try {
    notify = await sendNotification(record, env, fetcher);
  } catch (err) {
    notify = { status: "failed", detail: String(err && err.message ? err.message : err) };
  }
  record.notify_status = notify.status || "failed";

  try {
    await env.DB.prepare("UPDATE signups SET notify_status = ? WHERE id = ?")
      .bind(record.notify_status, record.id)
      .run();
  } catch {
    // The signup row is already stored; a notify_status update miss is not fatal.
  }

  return json(request, env, {
    ok: true,
    id: record.id,
    notify: record.notify_status,
  });
}

async function handleExport(request, env) {
  const expected = env.EXPORT_TOKEN || "";
  const provided = extractExportToken(request);
  if (!expected || !provided || !timingSafeEqualString(provided, expected)) {
    return json(request, env, { ok: false, error: "unauthorized" }, 401);
  }
  if (!env.DB) {
    return json(request, env, { ok: false, error: "storage_unavailable" }, 500);
  }
  const result = await env.DB.prepare(SELECT_SQL).all();
  const list = Array.isArray(result) ? result : result.results || [];
  const rows = list.map((row) => ({
    ...row,
    email_optin: boolFromDb(row.email_optin),
    sms_optin: boolFromDb(row.sms_optin),
  }));
  const csv = toCsv(rows);
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    status: 200,
    headers: corsHeaders(request, env, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="crazy-dealz-signups-${stamp}.csv"`,
    }),
  });
}

function handleHealth(request, env) {
  return json(request, env, { ok: true, service: "crazy-dealz-signup" });
}

export default {
  async fetch(request, env, _ctx) {
    const fetcher = env.FETCH || fetch;
    const method = request.method.toUpperCase();
    const path = pathOf(request);

    if (method === "OPTIONS") return preflight(request, env);

    if (method === "GET" && (path === "/" || path === "/health")) {
      return handleHealth(request, env);
    }
    if (method === "GET" && (path === "/export" || path === "/export.csv")) {
      return handleExport(request, env);
    }
    if (method === "POST" && (path === "/" || path === "/signup")) {
      try {
        return await handleSignup(request, env, fetcher);
      } catch (err) {
        console.error("signup_failed", err && err.message ? err.message : err);
        return json(request, env, { ok: false, error: "server_error" }, 500);
      }
    }
    return json(request, env, { ok: false, error: "not_found" }, 404);
  },
};
