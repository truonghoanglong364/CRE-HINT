const Database = require('better-sqlite3')

const db = new Database('cre_hint.db')

db.pragma('foreign_keys = ON')

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('patient', 'doctor', 'receptionist')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run()

db.prepare(`
  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    patient_code TEXT UNIQUE,
    date_of_birth TEXT,
    gender TEXT,
    phone TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`).run()

db.prepare(`
  CREATE TABLE IF NOT EXISTS vitals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    weight REAL NOT NULL,
    systolic INTEGER NOT NULL,
    diastolic INTEGER NOT NULL,
    heart_rate INTEGER NOT NULL,
    spo2 INTEGER NOT NULL,
    dyspnea INTEGER NOT NULL DEFAULT 0,
    edema INTEGER NOT NULL DEFAULT 0,
    chest_pain INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`).run()

// Migrate databases created before the receptionist role was introduced.
const usersSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'").get()
if (usersSchema && !usersSchema.sql.includes('receptionist')) {
  db.pragma('foreign_keys = OFF')
  db.exec(`
    ALTER TABLE users RENAME TO users_legacy;
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('patient', 'doctor', 'receptionist')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO users (id, full_name, email, password, role, created_at)
      SELECT id, full_name, email, password, role, created_at FROM users_legacy;
    DROP TABLE users_legacy;
  `)
  db.pragma('foreign_keys = ON')
}

const nullableEmailSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'").get()
if (nullableEmailSchema && nullableEmailSchema.sql.includes('email TEXT UNIQUE NOT NULL')) {
  db.pragma('foreign_keys = OFF')
  db.exec(`
    CREATE TABLE users_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('patient', 'doctor', 'receptionist')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO users_new (id, full_name, email, password, role, created_at)
      SELECT id, full_name, email, password, role, created_at FROM users;
    DROP TABLE users;
    ALTER TABLE users_new RENAME TO users;
  `)
  db.pragma('foreign_keys = ON')
}

// Older migrations may have rewritten foreign-key targets to users_legacy.
// Keep a compatibility mirror so existing databases remain usable.
const legacyForeignKeyExists = db.prepare("SELECT 1 FROM sqlite_master WHERE sql LIKE '%users_legacy%'").get()
if (legacyForeignKeyExists) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users_legacy (
      id INTEGER PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at DATETIME
    );
    INSERT OR IGNORE INTO users_legacy (id, full_name, email, password, role, created_at)
      SELECT id, full_name, email, password, role, created_at FROM users;
    CREATE TRIGGER IF NOT EXISTS users_mirror_insert AFTER INSERT ON users BEGIN
      INSERT OR REPLACE INTO users_legacy (id, full_name, email, password, role, created_at)
      VALUES (NEW.id, NEW.full_name, NEW.email, NEW.password, NEW.role, NEW.created_at);
    END;
    CREATE TRIGGER IF NOT EXISTS users_mirror_update AFTER UPDATE ON users BEGIN
      UPDATE users_legacy SET full_name = NEW.full_name, email = NEW.email, password = NEW.password, role = NEW.role, created_at = NEW.created_at WHERE id = NEW.id;
    END;
  `)
}

db.prepare(`
  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER,
    visit_date TEXT NOT NULL,
    specialty TEXT NOT NULL,
    reason TEXT NOT NULL,
    room TEXT,
    queue_number INTEGER,
    status TEXT NOT NULL DEFAULT 'registered'
      CHECK(status IN ('registered', 'waiting', 'called', 'in_progress', 'waiting_result', 'completed', 'absent')),
    exam_notes TEXT,
    test_instruction TEXT,
    result_due_at TEXT,
    result_method TEXT,
    result_text TEXT,
    prescription TEXT,
    follow_up_at TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    called_at DATETIME,
    started_at DATETIME,
    completed_at DATETIME,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE SET NULL
  )
`).run()

db.prepare(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    read_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`).run()

db.prepare(`
  INSERT INTO patients (user_id)
  SELECT users.id FROM users
  WHERE users.role = 'patient'
    AND NOT EXISTS (SELECT 1 FROM patients WHERE patients.user_id = users.id)
`).run()

db.prepare(`
  UPDATE patients
  SET patient_code = 'BN' || printf('%04d', id)
  WHERE patient_code IS NULL OR patient_code = ''
`).run()

const visitColumns = db.prepare('PRAGMA table_info(visits)').all().map((column) => column.name)
if (!visitColumns.includes('result_status')) db.exec("ALTER TABLE visits ADD COLUMN result_status TEXT NOT NULL DEFAULT 'draft'")
if (!visitColumns.includes('published_at')) db.exec('ALTER TABLE visits ADD COLUMN published_at DATETIME')
if (!visitColumns.includes('result_version')) db.exec("ALTER TABLE visits ADD COLUMN result_version INTEGER NOT NULL DEFAULT 1")

db.prepare(`
  CREATE TABLE IF NOT EXISTS hospital_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_id INTEGER NOT NULL,
    source_system TEXT NOT NULL,
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    payload_json TEXT NOT NULL,
    validation_status TEXT NOT NULL DEFAULT 'valid',
    missing_fields TEXT,
    validation_errors TEXT,
    duplicate_check TEXT,
    FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE
  )
`).run()

db.prepare(`
  CREATE TABLE IF NOT EXISTS ai_support (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_id INTEGER NOT NULL,
    hospital_data_id INTEGER,
    input_summary TEXT NOT NULL,
    missing_data TEXT,
    diagnosis TEXT,
    lab_test TEXT,
    treatment TEXT,
    med_safety TEXT,
    review_status TEXT NOT NULL DEFAULT 'pending',
    doctor_feedback TEXT,
    confirmed_plan TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE,
    FOREIGN KEY (hospital_data_id) REFERENCES hospital_data(id) ON DELETE SET NULL
  )
`).run()

db.prepare(`
  CREATE TABLE IF NOT EXISTS visit_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_id INTEGER NOT NULL,
    version_no INTEGER NOT NULL,
    exam_notes TEXT,
    result_text TEXT,
    prescription TEXT,
    follow_up_at TEXT,
    result_status TEXT NOT NULL,
    saved_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE,
    FOREIGN KEY (saved_by) REFERENCES users(id) ON DELETE SET NULL
  )
`).run()

console.log('Database CRE-HINT đã sẵn sàng!')

module.exports = db
