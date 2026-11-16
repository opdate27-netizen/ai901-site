import { describe, expect, it } from "vitest";
import worker from "../src/index.js";
import { asChecked, hashIp, looksLikeEmail } from "../src/lib.js";
import { buildNotification } from "../src/email.js";
import {
  EXPORT_TOKEN,
  IP_HASH_SALT,
  ORIGIN,
  call,
  createEnv,
  formRequest,
  jsonRequest,
  readJson,
  signupPayload,
} from "./helpers.js";

const ALLOWED = [
  "https://ai901.help",
  "https://www.ai901.help",
  "https://opdate27-netizen.github.io",
  "https://crazydealztires.com",
  "https://www.crazydealztires.com",
];

describe("helpers", () => {
  it("treats missing or no checkbox values as false and yes as true", () => {
    expect(asChecked("yes")).toBe(true);
    expect(asChecked("no")).toBe(false);
    expect(asChecked(undefined)).toBe(false);
    expect(asChecked("")).toBe(false);
    expect(asChecked("on")).toBe(true);
  });

  it("validates emails", () => {
    expect(looksLikeEmail("maya@example.com")).toBe(true);
    expect(looksLikeEmail("not-an-email")).toBe(false);
    expect(looksLikeEmail("a@" + "x".repeat(120) + ".com")).toBe(false);
  });
});

describe("CORS", () => {
  it("answers preflight from allowed origins", async () => {
    const env = createEnv();
    for (const origin of ALLOWED) {
      const res = await call(
        new Request("https://signup.example/signup", {
          method: "OPTIONS",
          headers: {
            Origin: origin,
            "Access-Control-Request-Method": "POST",
          },
        }),
        env,
      );
      expect(res.status, origin).toBe(204);
      expect(res.headers.get("Access-Control-Allow-Origin"), origin).toBe(origin);
    }
  });

  it("rejects POST from a disallowed origin", async () => {
    const env = createEnv();
    const res = await call(formRequest(signupPayload(), { origin: "https://evil.example" }), env);
    expect(res.status).toBe(403);
    const body = await readJson(res);
    expect(body.error).toBe("origin_not_allowed");
    expect(env.DB.rows).toHaveLength(0);
    expect(env.sentMail).toHaveLength(0);
  });
});

describe("POST /signup", () => {
  it("stores a form signup and emails support@crazydealztires.com", async () => {
    const env = createEnv();
    const res = await call(formRequest(signupPayload()), env);
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
    const body = await readJson(res);
    expect(body.ok).toBe(true);
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(env.DB.rows).toHaveLength(1);
    const row = env.DB.rows[0];
    expect(row.email).toBe("maya@example.com");
    expect(row.first_name).toBe("Maya");
    expect(row.email_optin).toBe(1);
    expect(row.sms_optin).toBe(0);
    expect(row.consent_text_version).toBe("cdz-signup-v1-2026-11-15");
    expect(row.email_consent_text).toContain("Email me service reminders");
    expect(row.source).toBe("ai901.help/crazydealz");
    expect(row.ip_hash).toBe(await hashIp("203.0.113.10", IP_HASH_SALT));
    expect(row.ip_hash).not.toContain("203.0.113.10");
    expect(row.user_agent).toBe("CrazyDealzTest/1.0");
    expect(env.sentMail).toHaveLength(1);
    expect(env.sentMail[0].url).toBe("https://mail.test/send");
    const mail = JSON.parse(env.sentMail[0].init.body);
    expect(mail.to).toBe("support@crazydealztires.com");
    expect(mail.text).toContain("Email opt-in: yes");
    expect(mail.text).toContain("Text opt-in: no");
    expect(mail.text).toContain("No welcome email and no text message were sent");
  });

  it("stores a JSON signup with sms opt-in left exactly as checked", async () => {
    const env = createEnv();
    const res = await call(
      jsonRequest(
        signupPayload({
          sms_consent: "yes",
          source: "ai901.help/crazydealz#popup",
        }),
      ),
      env,
    );
    expect(res.status).toBe(200);
    expect(env.DB.rows[0].sms_optin).toBe(1);
    expect(env.DB.rows[0].email_optin).toBe(1);
    expect(env.DB.rows[0].phone).toBe("9015550100");
    expect(env.DB.rows[0].source).toBe("ai901.help/crazydealz#popup");
  });

  it("rejects an invalid email", async () => {
    const env = createEnv();
    const res = await call(formRequest(signupPayload({ email: "nope" })), env);
    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toBe("invalid_email");
    expect(env.DB.rows).toHaveLength(0);
    expect(env.sentMail).toHaveLength(0);
  });

  it("rejects a signup when email consent is not checked", async () => {
    const env = createEnv();
    const res = await call(formRequest(signupPayload({ email_consent: "no" })), env);
    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toBe("email_consent_required");
    expect(env.DB.rows).toHaveLength(0);
  });

  it("requires a phone only when sms opt-in is checked", async () => {
    const env = createEnv();
    const res = await call(formRequest(signupPayload({ sms_consent: "yes", phone: "" })), env);
    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toBe("phone_required_for_sms");
  });

  it("returns success for a honeypot fill without storing or emailing", async () => {
    const env = createEnv();
    const res = await call(formRequest(signupPayload({ _honey: "http://spam.test" })), env);
    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body.ok).toBe(true);
    expect(body.ignored).toBe(true);
    expect(env.DB.rows).toHaveLength(0);
    expect(env.sentMail).toHaveLength(0);
  });

  it("rate limits a sixth signup from the same IP", async () => {
    const env = createEnv();
    for (let i = 0; i < 5; i += 1) {
      const res = await call(
        formRequest(signupPayload({ email: `person${i}@example.com` }), { ip: "198.51.100.20" }),
        env,
      );
      expect(res.status).toBe(200);
    }
    const limited = await call(
      formRequest(signupPayload({ email: "person5@example.com" }), { ip: "198.51.100.20" }),
      env,
    );
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("600");
    expect(env.DB.rows).toHaveLength(5);
    expect(env.sentMail).toHaveLength(5);
  });

  it("does not call any SMS API", async () => {
    const env = createEnv();
    await call(jsonRequest(signupPayload({ sms_consent: "yes" })), env);
    expect(env.sentMail.every((item) => /mail\.test|resend|mailchannels/i.test(item.url))).toBe(true);
    expect(env.sentMail.some((item) => /twilio|sms|textmessage|bandwidth/i.test(item.url))).toBe(false);
  });
});

describe("GET /export", () => {
  it("requires the export token", async () => {
    const env = createEnv();
    const res = await call(new Request("https://signup.example/export"), env);
    expect(res.status).toBe(401);
  });

  it("rejects a wrong token", async () => {
    const env = createEnv();
    const res = await call(new Request("https://signup.example/export?token=wrong"), env);
    expect(res.status).toBe(401);
  });

  it("returns a CSV of stored signups when the token matches", async () => {
    const env = createEnv();
    await call(formRequest(signupPayload({ email_consent: "yes", sms_consent: "no" })), env);
    const res = await call(
      new Request("https://signup.example/export", {
        headers: { Authorization: `Bearer ${EXPORT_TOKEN}` },
      }),
      env,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    const csv = await res.text();
    expect(csv).toContain("email,first_name,phone,email_optin,sms_optin,consent_text_version");
    expect(csv).toContain("maya@example.com");
    expect(csv).toMatch(/true,false,cdz-signup-v1-2026-11-15/);
    expect(csv).not.toContain("203.0.113.10");
    expect(csv).toContain(await hashIp("203.0.113.10", IP_HASH_SALT));
  });
});

describe("health and notification copy", () => {
  it("serves a health check", async () => {
    const res = await worker.fetch(new Request("https://signup.example/health"), createEnv(), {});
    expect(res.status).toBe(200);
    expect(await readJson(res)).toEqual({ ok: true, service: "crazy-dealz-signup" });
  });

  it("addresses the shop mailbox and never claims a text was sent", () => {
    const message = buildNotification(
      {
        id: "abc",
        email: "maya@example.com",
        first_name: "Maya",
        phone: "9015550100",
        email_optin: true,
        sms_optin: true,
        consent_text_version: "cdz-signup-v1-2026-11-15",
        created_at: "2026-11-15T19:00:00.000Z",
      },
      { MAIL_TO: "support@crazydealztires.com" },
    );
    expect(message.to).toBe("support@crazydealztires.com");
    expect(message.text).toContain("Text opt-in: yes");
    expect(message.text).toContain("no text message were sent");
  });
});
