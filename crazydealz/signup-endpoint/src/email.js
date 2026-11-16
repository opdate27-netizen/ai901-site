/**
 * Provider-agnostic notification email.
 * This Worker never sends SMS. A2P is not filed.
 *
 * MAIL_PROVIDER:
 *   log           Print to console (local tests / wrangler dev). Default in [env.dev].
 *   resend        POST https://api.resend.com/emails with MAIL_API_KEY.
 *   mailchannels  POST https://api.mailchannels.net/tx/v1/send (no longer free on
 *                 Cloudflare Workers; kept for accounts that already have access).
 *   http          POST MAIL_WEBHOOK_URL with Authorization: Bearer MAIL_API_KEY.
 */

function parseFrom(from) {
  const raw = from || "Crazy Dealz Tires <noreply@crazydealztires.com>";
  const m = raw.match(/^\s*(.*<)?\s*([^>]+)\s*>?\s*$/);
  const email = (m ? m[2] : raw).trim();
  const nameMatch = raw.match(/^\s*([^<]+)</);
  const name = nameMatch ? nameMatch[1].trim() : "Crazy Dealz Tires";
  return { email, name, header: raw };
}

function buildBody(record) {
  return [
    "A new Crazy Dealz Tires pit crew list sign-up was received.",
    "",
    `Email: ${record.email}`,
    `First name: ${record.first_name || "(not given)"}`,
    `Phone: ${record.phone || "(not given)"}`,
    `Email opt-in: ${record.email_optin ? "yes" : "no"}`,
    `Text opt-in: ${record.sms_optin ? "yes" : "no"}`,
    `Consent text version: ${record.consent_text_version}`,
    `Email consent text: ${record.email_consent_text || ""}`,
    `Text consent text: ${record.sms_consent_text || ""}`,
    `Language: ${record.language || ""}`,
    `Source: ${record.source || ""}`,
    `Visitor consent time: ${record.consent_time || ""}`,
    `Stored at: ${record.created_at}`,
    `Record id: ${record.id}`,
    "",
    "This message is a notification only. No welcome email and no text message were sent.",
    "Reminder texts must not be sent until A2P registration is approved.",
  ].join("\n");
}

export function buildNotification(record, env = {}) {
  const to = env.MAIL_TO || "support@crazydealztires.com";
  const from = parseFrom(env.MAIL_FROM);
  return {
    to,
    from,
    subject: "New Crazy Dealz pit crew list sign-up",
    text: buildBody(record),
  };
}

async function readError(res) {
  try {
    const t = await res.text();
    return t.slice(0, 500);
  } catch {
    return `http_${res.status}`;
  }
}

export async function sendNotification(record, env, fetcher = fetch) {
  const provider = String(env.MAIL_PROVIDER || "log").toLowerCase();
  const message = buildNotification(record, env);

  if (provider === "log" || provider === "none") {
    console.log("[signup-email:log]", message.subject, message.to, record.email);
    return { status: "logged", provider };
  }

  if (provider === "resend") {
    if (!env.MAIL_API_KEY) return { status: "skipped_missing_key", provider };
    const res = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.MAIL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: message.from.header,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
    });
    if (!res.ok) return { status: "failed", provider, detail: await readError(res) };
    return { status: "sent", provider };
  }

  if (provider === "mailchannels") {
    const res = await fetcher("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: message.to }] }],
        from: { email: message.from.email, name: message.from.name },
        subject: message.subject,
        content: [{ type: "text/plain", value: message.text }],
      }),
    });
    if (!res.ok) return { status: "failed", provider, detail: await readError(res) };
    return { status: "sent", provider };
  }

  if (provider === "http") {
    if (!env.MAIL_WEBHOOK_URL) return { status: "skipped_missing_webhook", provider };
    const headers = { "Content-Type": "application/json" };
    if (env.MAIL_API_KEY) headers.Authorization = `Bearer ${env.MAIL_API_KEY}`;
    const res = await fetcher(env.MAIL_WEBHOOK_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        to: message.to,
        from: message.from.header,
        subject: message.subject,
        text: message.text,
        signup: {
          id: record.id,
          email: record.email,
          email_optin: record.email_optin,
          sms_optin: record.sms_optin,
          source: record.source,
        },
      }),
    });
    if (!res.ok) return { status: "failed", provider, detail: await readError(res) };
    return { status: "sent", provider };
  }

  return { status: "skipped_unknown_provider", provider };
}
