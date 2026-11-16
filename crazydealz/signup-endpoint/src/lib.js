/** Shared helpers for the Crazy Dealz Tires signup Worker. */

export const CONSENT_TEXT_VERSION_DEFAULT = "cdz-signup-v1-2026-11-15";

export const DEFAULT_ALLOWED_ORIGINS = Object.freeze([
  "https://ai901.help",
  "https://www.ai901.help",
  "https://opdate27-netizen.github.io",
  "https://crazydealztires.com",
  "https://www.crazydealztires.com",
]);

export const RATE_LIMIT_MAX = 5;
export const RATE_LIMIT_WINDOW_SEC = 600;
export const MAX_BODY_BYTES = 32 * 1024;

const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export function truthyFlag(value) {
  return value === true || value === "true" || value === "1";
}

export function allowedOrigins(env = {}) {
  const extra = String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const origins = [...DEFAULT_ALLOWED_ORIGINS, ...extra];
  return origins;
}

export function isAllowedOrigin(origin, env = {}) {
  if (!origin) return false;
  if (allowedOrigins(env).includes(origin)) return true;
  if (truthyFlag(env.ALLOW_DEV_ORIGINS)) {
    try {
      const u = new URL(origin);
      return (
        (u.protocol === "http:" || u.protocol === "https:") &&
        (u.hostname === "localhost" || u.hostname === "127.0.0.1")
      );
    } catch {
      return false;
    }
  }
  return false;
}

export function corsHeaders(request, env, extra = {}) {
  const origin = request.headers.get("Origin") || "";
  const headers = {
    Vary: "Origin",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
    ...extra,
  };
  if (origin && isAllowedOrigin(origin, env)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type, Accept, Authorization, X-Export-Token";
    headers["Access-Control-Max-Age"] = "86400";
  }
  return headers;
}

export function json(request, env, body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(request, env, {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    }),
  });
}

export function preflight(request, env) {
  const origin = request.headers.get("Origin") || "";
  if (origin && !isAllowedOrigin(origin, env)) {
    return json(request, env, { ok: false, error: "origin_not_allowed" }, 403);
  }
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}

/** Parse checkbox values exactly as submitted. Unchecked / missing is false. */
export function asChecked(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null || value === "") return false;
  const s = String(value).trim().toLowerCase();
  if (["yes", "true", "1", "on", "checked"].includes(s)) return true;
  if (["no", "false", "0", "off"].includes(s)) return false;
  return false;
}

export function looksLikeEmail(value) {
  if (typeof value !== "string") return false;
  const email = value.trim();
  if (email.length < 3 || email.length > 120) return false;
  if (email.includes("..") || email.includes(" ")) return false;
  return EMAIL_RE.test(email);
}

export function clip(value, max) {
  if (value == null) return "";
  return String(value).trim().slice(0, max);
}

export function hasPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 7;
}

export async function readBody(request) {
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > MAX_BODY_BYTES) {
    const err = new Error("payload_too_large");
    err.status = 413;
    throw err;
  }
  const ct = (request.headers.get("Content-Type") || "").toLowerCase();
  if (ct.includes("application/json")) {
    const data = await request.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      const err = new Error("invalid_json");
      err.status = 400;
      throw err;
    }
    return data;
  }
  const fd = await request.formData();
  const data = {};
  for (const [key, value] of fd.entries()) {
    if (typeof value === "string") data[key] = value;
  }
  return data;
}

export function parseSignup(raw, env = {}) {
  const honey = clip(raw._honey || raw.honey || raw.website, 200);
  const email = clip(raw.email, 120).toLowerCase();
  const firstName = clip(raw.first_name || raw.firstName || raw.name, 60);
  const phone = clip(raw.phone, 30);
  const emailOptin = asChecked(raw.email_consent ?? raw.email_optin ?? raw.emailOptin);
  const smsOptin = asChecked(raw.sms_consent ?? raw.sms_optin ?? raw.smsOptin);
  const consentVersion = clip(
    raw.consent_version || raw.consent_text_version || env.CONSENT_TEXT_VERSION || CONSENT_TEXT_VERSION_DEFAULT,
    80,
  );
  return {
    honey,
    email,
    first_name: firstName,
    phone,
    email_optin: emailOptin,
    sms_optin: smsOptin,
    consent_text_version: consentVersion,
    email_consent_text: clip(raw.email_consent_text, 500),
    sms_consent_text: clip(raw.sms_consent_text, 500),
    language: clip(raw.language, 8) || "en",
    source: clip(raw.source, 200),
    consent_time: clip(raw.consent_time, 40),
  };
}

export function validateSignup(parsed) {
  if (!parsed.email || !looksLikeEmail(parsed.email)) {
    return { ok: false, error: "invalid_email", status: 400 };
  }
  if (!parsed.email_optin) {
    return { ok: false, error: "email_consent_required", status: 400 };
  }
  if (parsed.sms_optin && !hasPhone(parsed.phone)) {
    return { ok: false, error: "phone_required_for_sms", status: 400 };
  }
  return { ok: true };
}

export function clientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    (request.headers.get("X-Forwarded-For") || "").split(",")[0].trim() ||
    request.headers.get("X-Real-IP") ||
    ""
  );
}

export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashIp(ip, salt) {
  if (!ip) return "";
  const useSalt = salt || "missing-ip-hash-salt";
  return sha256Hex(`${useSalt}:${ip}`);
}

export function timingSafeEqualString(a, b) {
  const enc = new TextEncoder();
  const left = enc.encode(String(a || ""));
  const right = enc.encode(String(b || ""));
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}

export function extractExportToken(request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("token");
  if (q) return q;
  const header = request.headers.get("X-Export-Token");
  if (header) return header.trim();
  const auth = request.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

export function csvEscape(value) {
  const s = value == null ? "" : String(value);
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  if (/[",\n\r]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
}

export function toCsv(rows) {
  const columns = [
    "id",
    "created_at",
    "email",
    "first_name",
    "phone",
    "email_optin",
    "sms_optin",
    "consent_text_version",
    "email_consent_text",
    "sms_consent_text",
    "language",
    "source",
    "ip_hash",
    "user_agent",
    "consent_time",
    "notify_status",
  ];
  const header = columns.join(",");
  const lines = (rows || []).map((row) =>
    columns
      .map((col) => {
        if (col === "email_optin" || col === "sms_optin") {
          return row[col] ? "true" : "false";
        }
        return csvEscape(row[col]);
      })
      .join(","),
  );
  return [header, ...lines].join("\r\n") + "\r\n";
}

export function boolFromDb(value) {
  return value === 1 || value === true || value === "1" || value === "true";
}
