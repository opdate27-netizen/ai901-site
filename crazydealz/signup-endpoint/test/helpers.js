import worker from "../src/index.js";

export const ORIGIN = "https://ai901.help";
export const EXPORT_TOKEN = "dev-export-token";
export const IP_HASH_SALT = "test-salt-not-for-production";

export function createMemoryD1() {
  const rows = [];
  function runSql(sql, params = []) {
    const src = String(sql);
    if (/INSERT INTO signups/i.test(src)) {
      const cols = src
        .match(/INSERT INTO signups\s*\(([^)]+)\)/i)[1]
        .split(",")
        .map((s) => s.trim());
      const rec = {};
      cols.forEach((col, i) => {
        rec[col] = params[i];
      });
      rows.push(rec);
      return { success: true };
    }
    if (/UPDATE signups SET notify_status/i.test(src)) {
      const [status, id] = params;
      const row = rows.find((r) => r.id === id);
      if (row) row.notify_status = status;
      return { success: true };
    }
    if (/SELECT /i.test(src)) {
      const results = rows.slice().sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
      return { results };
    }
    throw new Error(`unexpected sql: ${src}`);
  }
  return {
    rows,
    prepare(sql) {
      return {
        bind(...params) {
          return {
            run: async () => runSql(sql, params),
            all: async () => runSql(sql, params),
            first: async () => (runSql(sql, params).results || [])[0] || null,
          };
        },
        run: async () => runSql(sql, []),
        all: async () => runSql(sql, []),
      };
    },
  };
}

export function createMemoryKv() {
  const map = new Map();
  return {
    map,
    async get(key) {
      return map.has(key) ? map.get(key) : null;
    },
    async put(key, value) {
      map.set(key, String(value));
    },
  };
}

export function createEnv(overrides = {}) {
  const sentMail = [];
  const env = {
    DB: createMemoryD1(),
    RATE_LIMIT: createMemoryKv(),
    MAIL_PROVIDER: "http",
    MAIL_WEBHOOK_URL: "https://mail.test/send",
    MAIL_API_KEY: "test-mail-key",
    MAIL_TO: "support@crazydealztires.com",
    MAIL_FROM: "Crazy Dealz Tires <noreply@crazydealztires.com>",
    CONSENT_TEXT_VERSION: "cdz-signup-v1-2026-11-15",
    IP_HASH_SALT,
    EXPORT_TOKEN,
    ALLOW_DEV_ORIGINS: "false",
    ALLOW_NO_ORIGIN: "false",
    FETCH: async (url, init = {}) => {
      sentMail.push({ url: String(url), init });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    },
    ...overrides,
  };
  env.sentMail = sentMail;
  if (!overrides.FETCH && env.FETCH === undefined) {
    /* already set */
  }
  // If caller overrides MAIL_PROVIDER to log, keep sentMail hook out of the way.
  if (overrides.FETCH) env.FETCH = overrides.FETCH;
  else {
    const dest = env.MAIL_WEBHOOK_URL || "https://api.resend.com/emails";
    env.FETCH = async (url, init = {}) => {
      sentMail.push({ url: String(url), init });
      return new Response(JSON.stringify({ id: "msg_test" }), { status: 200 });
    };
    env.sentMail = sentMail;
    void dest;
  }
  return env;
}

export function signupPayload(overrides = {}) {
  return {
    email: "maya@example.com",
    first_name: "Maya",
    phone: "9015550100",
    email_consent: "yes",
    sms_consent: "no",
    email_consent_text: "Email me service reminders and shop news",
    sms_consent_text:
      "Text me reminders (msg & data rates may apply, reply STOP to opt out, consent not required to buy)",
    consent_version: "cdz-signup-v1-2026-11-15",
    consent_time: "2026-11-15T19:00:00.000Z",
    language: "en",
    source: "ai901.help/crazydealz",
    _subject: "New Crazy Dealz pit crew list sign-up",
    ...overrides,
  };
}

export function formRequest(payload, { origin = ORIGIN, url = "https://signup.example/signup", ip = "203.0.113.10", headers = {} } = {}) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    if (value != null) body.set(key, String(value));
  }
  return new Request(url, {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "CrazyDealzTest/1.0",
      "CF-Connecting-IP": ip,
      ...headers,
    },
    body,
  });
}

export function jsonRequest(payload, { origin = ORIGIN, url = "https://signup.example/signup", ip = "203.0.113.10", headers = {} } = {}) {
  return new Request(url, {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "User-Agent": "CrazyDealzTest/1.0",
      "CF-Connecting-IP": ip,
      ...headers,
    },
    body: JSON.stringify(payload),
  });
}

export async function call(request, env) {
  return worker.fetch(request, env, {});
}

export async function readJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
