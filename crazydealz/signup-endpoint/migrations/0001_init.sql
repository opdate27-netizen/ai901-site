CREATE TABLE IF NOT EXISTS signups (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  phone TEXT,
  email_optin INTEGER NOT NULL,
  sms_optin INTEGER NOT NULL,
  consent_text_version TEXT NOT NULL,
  email_consent_text TEXT,
  sms_consent_text TEXT,
  language TEXT,
  source TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  consent_time TEXT,
  notify_status TEXT
);

CREATE INDEX IF NOT EXISTS idx_signups_created_at ON signups (created_at);
CREATE INDEX IF NOT EXISTS idx_signups_email ON signups (email);
