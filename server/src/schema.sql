-- ===========================================================================
-- Yarn Procurement Portal — schema (PostgreSQL)
-- System timestamps use TIMESTAMPTZ; user-entered calendar dates are kept as
-- TEXT 'YYYY-MM-DD' so lexicographic comparisons stay simple across the app.
-- ===========================================================================

-- ---- Users & roles -------------------------------------------------------
-- roles: 'requisitioner' | 'procurement' | 'depthead' | 'admin'
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  role          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Vendors -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendors (
  id                    SERIAL PRIMARY KEY,
  name                  TEXT NOT NULL,
  contact_person        TEXT,
  email                 TEXT,
  phone                 TEXT,
  address               TEXT,
  gst_no                TEXT,
  rating                NUMERIC(2,1) DEFAULT 3,        -- 1..5
  default_payment_terms TEXT,
  default_lead_time     INTEGER,
  active                INTEGER NOT NULL DEFAULT 1,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Vendor certificates (Oeko-Tex / GOTS / GRS ...) ---------------------
CREATE TABLE IF NOT EXISTS vendor_certificates (
  id          SERIAL PRIMARY KEY,
  vendor_id   INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  cert_type   TEXT NOT NULL,
  issued_by   TEXT,
  issue_date  TEXT,
  expiry_date TEXT,
  remark      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Materials (yarn master) --------------------------------------------
CREATE TABLE IF NOT EXISTS materials (
  id           SERIAL PRIMARY KEY,
  mat_code     TEXT NOT NULL UNIQUE,
  description  TEXT NOT NULL,
  category     TEXT,
  uom          TEXT NOT NULL DEFAULT 'Kg',
  active       INTEGER NOT NULL DEFAULT 1,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Material price history (PO prices + market trend) -------------------
-- source: 'po' | 'market' | 'quote'
CREATE TABLE IF NOT EXISTS price_history (
  id           SERIAL PRIMARY KEY,
  material_id  INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  price_date   TEXT NOT NULL,
  price_per_kg NUMERIC(14,4) NOT NULL,
  currency     TEXT NOT NULL DEFAULT 'INR',
  source       TEXT NOT NULL DEFAULT 'po',
  vendor_id    INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_price_history_mat ON price_history(material_id, price_date);

-- ---- Requirements (indents) ----------------------------------------------
-- status: draft | pending_approval | approved | rejected
--         | rfq_sent | quoting | comparison_ready | awarded | closed | cancelled
CREATE TABLE IF NOT EXISTS requirements (
  id              SERIAL PRIMARY KEY,
  ref_no          TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft',
  priority        TEXT NOT NULL DEFAULT 'normal',
  needed_by       TEXT,
  raised_by       INTEGER NOT NULL REFERENCES users(id),
  approved_by     INTEGER REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  rejected_reason TEXT,
  remarks         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Requirement line items ----------------------------------------------
CREATE TABLE IF NOT EXISTS requirement_items (
  id                 SERIAL PRIMARY KEY,
  requirement_id     INTEGER NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  material_id        INTEGER REFERENCES materials(id) ON DELETE SET NULL,
  mat_code           TEXT,
  description        TEXT,
  required_qty_kg    NUMERIC(14,3) NOT NULL,
  target_price       NUMERIC(14,4),
  last_po_price      NUMERIC(14,4),
  last_po_date       TEXT,
  last_supplier_id   INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
  last_supplier_name TEXT,
  line_no            INTEGER NOT NULL DEFAULT 1
);

-- ---- RFQs: one row per (requirement, vendor) -----------------------------
-- status: sent | viewed | responded | declined | expired
CREATE TABLE IF NOT EXISTS rfqs (
  id             SERIAL PRIMARY KEY,
  requirement_id INTEGER NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  vendor_id      INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  token          TEXT NOT NULL UNIQUE,
  status         TEXT NOT NULL DEFAULT 'sent',
  due_date       TEXT,
  sent_at        TIMESTAMPTZ,
  viewed_at      TIMESTAMPTZ,
  responded_at   TIMESTAMPTZ,
  reminder_count INTEGER NOT NULL DEFAULT 0,
  last_reminded_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(requirement_id, vendor_id)
);
-- Add reminder columns to pre-existing rfqs tables (idempotent).
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS reminder_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS last_reminded_at TIMESTAMPTZ;

-- ---- Quotes: a vendor's submission for an RFQ ----------------------------
-- entered_via: 'portal' | 'manual'
CREATE TABLE IF NOT EXISTS quotes (
  id           SERIAL PRIMARY KEY,
  rfq_id       INTEGER NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  entered_via  TEXT NOT NULL DEFAULT 'manual',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_by TEXT,
  valid_until  TEXT,
  notes        TEXT,
  UNIQUE(rfq_id)
);

-- ---- Quote line items ----------------------------------------------------
CREATE TABLE IF NOT EXISTS quote_lines (
  id                  SERIAL PRIMARY KEY,
  quote_id            INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  requirement_item_id INTEGER NOT NULL REFERENCES requirement_items(id) ON DELETE CASCADE,
  price_per_kg        NUMERIC(14,4),
  currency            TEXT NOT NULL DEFAULT 'INR',
  gst_pct             NUMERIC(5,2) DEFAULT 0,
  lead_time_days      INTEGER,
  payment_terms       TEXT,
  remarks             TEXT,
  no_quote            INTEGER NOT NULL DEFAULT 0
);

-- ---- Award decision (per requirement item) -------------------------------
CREATE TABLE IF NOT EXISTS awards (
  id                  SERIAL PRIMARY KEY,
  requirement_id      INTEGER NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  requirement_item_id INTEGER NOT NULL UNIQUE REFERENCES requirement_items(id) ON DELETE CASCADE,
  vendor_id           INTEGER NOT NULL REFERENCES vendors(id),
  quote_line_id       INTEGER REFERENCES quote_lines(id) ON DELETE SET NULL,
  awarded_price       NUMERIC(14,4),
  decided_by          INTEGER REFERENCES users(id),
  decided_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  justification       TEXT
);

-- ---- Audit log -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id),
  action     TEXT NOT NULL,
  entity     TEXT,
  entity_id  INTEGER,
  detail     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
