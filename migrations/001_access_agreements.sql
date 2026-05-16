CREATE TABLE IF NOT EXISTS access_agreements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  company TEXT,
  email TEXT,
  client_name TEXT,
  password_label TEXT,
  terms_version TEXT,
  accepted INTEGER NOT NULL DEFAULT 1,
  ip_address TEXT,
  country TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_access_agreements_email ON access_agreements(email);
CREATE INDEX IF NOT EXISTS idx_access_agreements_client_name ON access_agreements(client_name);
CREATE INDEX IF NOT EXISTS idx_access_agreements_created_at ON access_agreements(created_at);
