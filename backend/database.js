const { createClient } = require('@libsql/client')

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:cre_hint.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
})

const db = {
  prepare(sql) {
    return {
      async get(...args) {
        const result = await client.execute({ sql, args })
        return result.rows[0] ?? null
      },
      async all(...args) {
        const result = await client.execute({ sql, args })
        return result.rows
      },
      async run(...args) {
        const result = await client.execute({ sql, args })
        return { lastInsertRowid: Number(result.lastInsertRowid ?? 0), changes: result.rowsAffected }
      },
    }
  },
}

async function initDatabase() {
  await client.execute('PRAGMA foreign_keys = ON')

  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('patient', 'doctor', 'receptionist')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await client.execute(`
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
  `)

  await client.execute(`
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
  `)

  const usersSchema = await db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'").get()
  if (usersSchema && !usersSchema.sql.includes('receptionist')) {
    await client.execute('PRAGMA foreign_keys = OFF')
    await client.batch([
      'ALTER TABLE users RENAME TO users_legacy',
      `CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('patient', 'doctor', 'receptionist')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `INSERT INTO users (id, full_name, email, password, role, created_at)
        SELECT id, full_name, email, password, role, created_at FROM users_legacy`,
      'DROP TABLE users_legacy',
    ])
    await client.execute('PRAGMA foreign_keys = ON')
  }

  const nullableEmailSchema = await db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'").get()
  if (nullableEmailSchema && nullableEmailSchema.sql.includes('email TEXT UNIQUE NOT NULL')) {
    await client.execute('PRAGMA foreign_keys = OFF')
    await client.batch([
      `CREATE TABLE users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('patient', 'doctor', 'receptionist')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `INSERT INTO users_new (id, full_name, email, password, role, created_at)
        SELECT id, full_name, email, password, role, created_at FROM users`,
      'DROP TABLE users',
      'ALTER TABLE users_new RENAME TO users',
    ])
    await client.execute('PRAGMA foreign_keys = ON')
  }

  const legacyFK = await db.prepare("SELECT 1 AS found FROM sqlite_master WHERE sql LIKE '%users_legacy%'").get()
  if (legacyFK) {
    await client.batch([
      `CREATE TABLE IF NOT EXISTS users_legacy (
        id INTEGER PRIMARY KEY, full_name TEXT NOT NULL, email TEXT UNIQUE,
        password TEXT NOT NULL, role TEXT NOT NULL, created_at DATETIME
      )`,
      `INSERT OR IGNORE INTO users_legacy (id, full_name, email, password, role, created_at)
        SELECT id, full_name, email, password, role, created_at FROM users`,
      `CREATE TRIGGER IF NOT EXISTS users_mirror_insert AFTER INSERT ON users BEGIN
        INSERT OR REPLACE INTO users_legacy (id, full_name, email, password, role, created_at)
        VALUES (NEW.id, NEW.full_name, NEW.email, NEW.password, NEW.role, NEW.created_at);
      END`,
      `CREATE TRIGGER IF NOT EXISTS users_mirror_update AFTER UPDATE ON users BEGIN
        UPDATE users_legacy SET full_name = NEW.full_name, email = NEW.email, password = NEW.password, role = NEW.role, created_at = NEW.created_at WHERE id = NEW.id;
      END`,
    ])
  }

  await client.execute(`
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
  `)

  await client.execute(`
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
  `)

  await client.execute(`
    INSERT INTO patients (user_id)
    SELECT users.id FROM users
    WHERE users.role = 'patient'
      AND NOT EXISTS (SELECT 1 FROM patients WHERE patients.user_id = users.id)
  `)

  await client.execute(`
    UPDATE patients
    SET patient_code = 'BN' || printf('%04d', id)
    WHERE patient_code IS NULL OR patient_code = ''
  `)

  const visitColumns = (await db.prepare('PRAGMA table_info(visits)').all()).map((c) => c.name)
  if (!visitColumns.includes('result_status')) await client.execute("ALTER TABLE visits ADD COLUMN result_status TEXT NOT NULL DEFAULT 'draft'")
  if (!visitColumns.includes('published_at')) await client.execute('ALTER TABLE visits ADD COLUMN published_at DATETIME')
  if (!visitColumns.includes('result_version')) await client.execute('ALTER TABLE visits ADD COLUMN result_version INTEGER NOT NULL DEFAULT 1')

  await client.execute(`
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
  `)

  await client.execute(`
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
  `)

  await client.execute(`
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
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS result_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      exam_notes TEXT,
      result_text TEXT,
      prescription TEXT,
      usage_count INTEGER NOT NULL DEFAULT 0,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `)

  const templateCount = await db.prepare('SELECT COUNT(*) AS count FROM result_templates').get()
  if (templateCount.count === 0) {
    const defaults = [
      {
        name: 'Khám định kỳ suy tim',
        examNotes: 'Bệnh nhân đến khám định kỳ theo dõi suy tim. Tình trạng chung ổn định, sinh hiệu trong ngưỡng cho phép.',
        resultText: 'Suy tim độ II theo NYHA. Chức năng tim ổn định so với lần khám trước. Tiếp tục phác đồ điều trị hiện tại.',
        prescription: '1. Bisoprolol 2.5 mg - 1 viên/ngày (sáng)\n2. Furosemide 40 mg - 1 viên/ngày (sáng)\n3. Theo dõi cân nặng, huyết áp hàng ngày\n4. Hạn chế muối < 2g/ngày',
      },
      {
        name: 'Suy tim mất bù cấp',
        examNotes: 'Bệnh nhân nhập viện với triệu chứng khó thở tăng, phù chi dưới, tăng cân nhanh. Cần đánh giá mức độ mất bù.',
        resultText: 'Suy tim sung huyết đợt mất bù. Cần điều chỉnh lợi tiểu và theo dõi sát điện giải.',
        prescription: '1. Furosemide 80 mg TM - theo y lệnh\n2. Hạn chế dịch 1.5L/ngày\n3. Theo dõi cân nặng 2 lần/ngày\n4. Xét nghiệm điện giải, BNP mỗi 24h\n5. Kê đơn bổ sung Kali nếu cần',
      },
      {
        name: 'Tái khám sau chỉnh thuốc',
        examNotes: 'Tái khám sau 2 tuần chỉnh liều thuốc. Đánh giá đáp ứng điều trị và tác dụng phụ.',
        resultText: 'Bệnh nhân đáp ứng tốt với phác đồ mới. Không ghi nhận tác dụng phụ đáng kể. Tiếp tục theo dõi.',
        prescription: '1. Giữ nguyên phác đồ hiện tại\n2. Tái khám sau 1 tháng\n3. Xét nghiệm chức năng thận, điện giải trước lần tái khám tới',
      },
      {
        name: 'Khám kèm tăng huyết áp',
        examNotes: 'Bệnh nhân suy tim kèm tăng huyết áp chưa kiểm soát tốt. Huyết áp tâm thu > 160 mmHg.',
        resultText: 'Suy tim kèm tăng huyết áp kháng trị. Cần phối hợp thêm thuốc hạ áp và theo dõi sát.',
        prescription: '1. Bisoprolol 5 mg - 1 viên/ngày (sáng) [tăng liều]\n2. Amlodipine 5 mg - 1 viên/ngày (tối)\n3. Furosemide 40 mg - 1 viên/ngày (sáng)\n4. Đo huyết áp 2 lần/ngày, ghi sổ theo dõi',
      },
    ]
    for (const t of defaults) {
      await db.prepare('INSERT INTO result_templates (name, exam_notes, result_text, prescription) VALUES (?, ?, ?, ?)').run(t.name, t.examNotes, t.resultText, t.prescription)
    }
  }

  console.log('Database CRE-HINT đã sẵn sàng!')
}

module.exports = { db, initDatabase }
