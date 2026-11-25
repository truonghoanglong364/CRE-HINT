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

  // --- Doctor schedule ---
  await client.execute(`
    CREATE TABLE IF NOT EXISTS doctor_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      max_patients INTEGER NOT NULL DEFAULT 20,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS schedule_overrides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      override_date TEXT NOT NULL,
      is_available INTEGER NOT NULL DEFAULT 0,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  // --- Lab orders ---
  await client.execute(`
    CREATE TABLE IF NOT EXISTS lab_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visit_id INTEGER NOT NULL,
      test_name TEXT NOT NULL,
      test_code TEXT,
      urgency TEXT NOT NULL DEFAULT 'routine' CHECK(urgency IN ('routine', 'urgent', 'stat')),
      status TEXT NOT NULL DEFAULT 'ordered' CHECK(status IN ('ordered', 'in_progress', 'completed', 'cancelled')),
      result_text TEXT,
      notes TEXT,
      ordered_by INTEGER,
      ordered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE,
      FOREIGN KEY (ordered_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `)

  // --- ICD-10 reference ---
  await client.execute(`
    CREATE TABLE IF NOT EXISTS icd10_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      description_vi TEXT NOT NULL,
      description_en TEXT,
      category TEXT
    )
  `)

  const icdCount = await db.prepare('SELECT COUNT(*) AS count FROM icd10_codes').get()
  if (icdCount.count === 0) {
    const icdCodes = [
      ['I10', 'Tăng huyết áp nguyên phát', 'Essential hypertension', 'tim-mach'],
      ['I11.0', 'Bệnh tim do tăng huyết áp có suy tim', 'Hypertensive heart disease with heart failure', 'tim-mach'],
      ['I13.0', 'Bệnh tim và thận do tăng huyết áp có suy tim', 'Hypertensive heart and CKD with heart failure', 'tim-mach'],
      ['I20.0', 'Đau thắt ngực không ổn định', 'Unstable angina', 'tim-mach'],
      ['I21.9', 'Nhồi máu cơ tim cấp, không xác định', 'Acute myocardial infarction, unspecified', 'tim-mach'],
      ['I25.10', 'Bệnh tim thiếu máu cục bộ do xơ vữa', 'Atherosclerotic heart disease', 'tim-mach'],
      ['I42.0', 'Bệnh cơ tim giãn', 'Dilated cardiomyopathy', 'tim-mach'],
      ['I42.1', 'Bệnh cơ tim phì đại tắc nghẽn', 'Obstructive hypertrophic cardiomyopathy', 'tim-mach'],
      ['I48.0', 'Rung nhĩ kịch phát', 'Paroxysmal atrial fibrillation', 'tim-mach'],
      ['I48.1', 'Rung nhĩ dai dẳng', 'Persistent atrial fibrillation', 'tim-mach'],
      ['I48.91', 'Rung nhĩ không xác định', 'Unspecified atrial fibrillation', 'tim-mach'],
      ['I50.1', 'Suy thất trái', 'Left ventricular failure', 'suy-tim'],
      ['I50.20', 'Suy tim tâm thu không xác định', 'Unspecified systolic heart failure', 'suy-tim'],
      ['I50.21', 'Suy tim tâm thu cấp', 'Acute systolic heart failure', 'suy-tim'],
      ['I50.22', 'Suy tim tâm thu mạn', 'Chronic systolic heart failure', 'suy-tim'],
      ['I50.23', 'Suy tim tâm thu cấp trên nền mạn', 'Acute on chronic systolic heart failure', 'suy-tim'],
      ['I50.30', 'Suy tim tâm trương không xác định', 'Unspecified diastolic heart failure', 'suy-tim'],
      ['I50.31', 'Suy tim tâm trương cấp', 'Acute diastolic heart failure', 'suy-tim'],
      ['I50.32', 'Suy tim tâm trương mạn', 'Chronic diastolic heart failure', 'suy-tim'],
      ['I50.33', 'Suy tim tâm trương cấp trên nền mạn', 'Acute on chronic diastolic heart failure', 'suy-tim'],
      ['I50.40', 'Suy tim hỗn hợp không xác định', 'Unspecified combined heart failure', 'suy-tim'],
      ['I50.41', 'Suy tim hỗn hợp cấp', 'Acute combined heart failure', 'suy-tim'],
      ['I50.42', 'Suy tim hỗn hợp mạn', 'Chronic combined heart failure', 'suy-tim'],
      ['I50.43', 'Suy tim hỗn hợp cấp trên nền mạn', 'Acute on chronic combined heart failure', 'suy-tim'],
      ['I50.9', 'Suy tim không xác định', 'Heart failure, unspecified', 'suy-tim'],
      ['I51.7', 'Tim to', 'Cardiomegaly', 'tim-mach'],
      ['J81.0', 'Phù phổi cấp', 'Acute pulmonary edema', 'ho-hap'],
      ['R06.0', 'Khó thở', 'Dyspnea', 'trieu-chung'],
      ['R06.00', 'Khó thở không xác định', 'Dyspnea, unspecified', 'trieu-chung'],
      ['R07.9', 'Đau ngực không xác định', 'Chest pain, unspecified', 'trieu-chung'],
      ['R60.0', 'Phù khu trú', 'Localized edema', 'trieu-chung'],
      ['R60.1', 'Phù toàn thân', 'Generalized edema', 'trieu-chung'],
      ['E87.6', 'Hạ kali máu', 'Hypokalemia', 'chuyen-hoa'],
      ['E87.5', 'Tăng kali máu', 'Hyperkalemia', 'chuyen-hoa'],
      ['E11.9', 'Đái tháo đường type 2', 'Type 2 diabetes mellitus', 'chuyen-hoa'],
      ['N18.3', 'Bệnh thận mạn giai đoạn 3', 'Chronic kidney disease, stage 3', 'than'],
      ['N18.4', 'Bệnh thận mạn giai đoạn 4', 'Chronic kidney disease, stage 4', 'than'],
    ]
    for (const [code, descVi, descEn, category] of icdCodes) {
      await db.prepare('INSERT INTO icd10_codes (code, description_vi, description_en, category) VALUES (?, ?, ?, ?)').run(code, descVi, descEn, category)
    }
  }

  // --- Drug interactions ---
  await client.execute(`
    CREATE TABLE IF NOT EXISTS drug_interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      drug_a TEXT NOT NULL,
      drug_b TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('high', 'moderate', 'low')),
      description_vi TEXT NOT NULL,
      recommendation_vi TEXT
    )
  `)

  const diCount = await db.prepare('SELECT COUNT(*) AS count FROM drug_interactions').get()
  if (diCount.count === 0) {
    const interactions = [
      ['Enalapril', 'Spironolactone', 'high', 'Nguy cơ tăng kali máu nghiêm trọng khi phối hợp ACE inhibitor với lợi tiểu giữ kali.', 'Theo dõi kali máu mỗi 1-2 tuần khi khởi trị. Cân nhắc giảm liều spironolactone.'],
      ['Lisinopril', 'Spironolactone', 'high', 'Nguy cơ tăng kali máu nghiêm trọng khi phối hợp ACE inhibitor với lợi tiểu giữ kali.', 'Theo dõi kali máu mỗi 1-2 tuần. Không dùng nếu kali > 5.0 mEq/L.'],
      ['Ramipril', 'Spironolactone', 'high', 'Nguy cơ tăng kali máu nghiêm trọng khi phối hợp ACE inhibitor với lợi tiểu giữ kali.', 'Theo dõi kali máu định kỳ. Giới hạn spironolactone ≤ 25mg/ngày.'],
      ['Enalapril', 'Ibuprofen', 'high', 'NSAIDs làm giảm tác dụng hạ áp của ACE inhibitor và tăng nguy cơ tổn thương thận.', 'Tránh phối hợp. Nếu cần giảm đau, ưu tiên paracetamol.'],
      ['Lisinopril', 'Diclofenac', 'high', 'NSAIDs làm giảm tác dụng hạ áp và tăng nguy cơ suy thận cấp.', 'Tránh dùng NSAIDs. Dùng paracetamol thay thế.'],
      ['Bisoprolol', 'Verapamil', 'high', 'Phối hợp chẹn beta với chẹn kênh calci non-DHP gây nguy cơ nhịp chậm nặng và block nhĩ-thất.', 'Chống chỉ định phối hợp. Thay Verapamil bằng Amlodipine nếu cần.'],
      ['Carvedilol', 'Diltiazem', 'high', 'Nguy cơ nhịp chậm nghiêm trọng và suy giảm co bóp cơ tim.', 'Chống chỉ định. Không phối hợp chẹn beta với Diltiazem.'],
      ['Digoxin', 'Amiodarone', 'high', 'Amiodarone làm tăng nồng độ digoxin 70-100%, nguy cơ ngộ độc digoxin.', 'Giảm liều digoxin 50% khi bắt đầu amiodarone. Theo dõi nồng độ digoxin.'],
      ['Digoxin', 'Furosemide', 'moderate', 'Furosemide gây hạ kali máu, làm tăng độc tính digoxin.', 'Theo dõi kali máu. Bổ sung kali nếu cần. Giữ kali > 4.0 mEq/L.'],
      ['Warfarin', 'Aspirin', 'high', 'Tăng nguy cơ chảy máu đáng kể khi phối hợp.', 'Nếu bắt buộc phối hợp, dùng aspirin liều thấp (81mg) và theo dõi INR chặt.'],
      ['Warfarin', 'Amiodarone', 'high', 'Amiodarone ức chế chuyển hóa warfarin, tăng INR và nguy cơ chảy máu.', 'Giảm liều warfarin 30-50%. Theo dõi INR hàng tuần trong 4-6 tuần đầu.'],
      ['Furosemide', 'Enalapril', 'moderate', 'Nguy cơ hạ huyết áp khi khởi trị ACE inhibitor ở BN đang dùng lợi tiểu liều cao.', 'Cân nhắc giảm/ngưng lợi tiểu 2-3 ngày trước khi khởi trị ACE inhibitor.'],
      ['Furosemide', 'Gentamicin', 'high', 'Cả hai đều gây độc thận và độc tai. Nguy cơ cộng gộp.', 'Tránh phối hợp. Nếu cần, theo dõi chức năng thận và thính lực.'],
      ['Metformin', 'Furosemide', 'moderate', 'Furosemide có thể làm tăng đường máu, giảm hiệu quả metformin.', 'Theo dõi đường huyết khi thêm/bỏ furosemide.'],
      ['Simvastatin', 'Amiodarone', 'high', 'Amiodarone tăng nồng độ simvastatin, nguy cơ tiêu cơ vân.', 'Giới hạn simvastatin ≤ 20mg/ngày khi dùng cùng amiodarone.'],
      ['Atorvastatin', 'Gemfibrozil', 'high', 'Phối hợp statin với fibrate tăng nguy cơ tiêu cơ vân.', 'Ưu tiên fenofibrate thay gemfibrozil nếu cần phối hợp.'],
      ['Bisoprolol', 'Insulin', 'moderate', 'Chẹn beta che giấu triệu chứng hạ đường huyết (nhịp nhanh, run).', 'Hướng dẫn BN nhận biết triệu chứng hạ đường huyết khác. Theo dõi đường huyết.'],
      ['Amlodipine', 'Simvastatin', 'moderate', 'Amlodipine tăng nồng độ simvastatin, nguy cơ bệnh cơ.', 'Giới hạn simvastatin ≤ 20mg/ngày khi dùng cùng amlodipine.'],
      ['Sacubitril/Valsartan', 'Enalapril', 'high', 'Chống chỉ định phối hợp ARNI với ACE inhibitor – nguy cơ phù mạch.', 'Ngưng ACE inhibitor ít nhất 36 giờ trước khi bắt đầu Sacubitril/Valsartan.'],
      ['Sacubitril/Valsartan', 'Spironolactone', 'high', 'Nguy cơ tăng kali máu nghiêm trọng.', 'Theo dõi kali máu chặt chẽ. Không dùng nếu kali > 5.4 mEq/L.'],
    ]
    for (const [a, b, sev, desc, rec] of interactions) {
      await db.prepare('INSERT INTO drug_interactions (drug_a, drug_b, severity, description_vi, recommendation_vi) VALUES (?, ?, ?, ?, ?)').run(a, b, sev, desc, rec)
    }
  }

  // --- Add new columns to visits ---
  if (!visitColumns.includes('priority')) await client.execute("ALTER TABLE visits ADD COLUMN priority TEXT DEFAULT 'normal' CHECK(priority IN ('emergency', 'urgent', 'normal'))")
  if (!visitColumns.includes('icd_code')) await client.execute('ALTER TABLE visits ADD COLUMN icd_code TEXT')
  if (!visitColumns.includes('icd_description')) await client.execute('ALTER TABLE visits ADD COLUMN icd_description TEXT')
  if (!visitColumns.includes('soap_subjective')) await client.execute('ALTER TABLE visits ADD COLUMN soap_subjective TEXT')
  if (!visitColumns.includes('soap_objective')) await client.execute('ALTER TABLE visits ADD COLUMN soap_objective TEXT')
  if (!visitColumns.includes('soap_assessment')) await client.execute('ALTER TABLE visits ADD COLUMN soap_assessment TEXT')
  if (!visitColumns.includes('soap_plan')) await client.execute('ALTER TABLE visits ADD COLUMN soap_plan TEXT')
  if (!visitColumns.includes('signed_at')) await client.execute('ALTER TABLE visits ADD COLUMN signed_at DATETIME')
  if (!visitColumns.includes('signature_hash')) await client.execute('ALTER TABLE visits ADD COLUMN signature_hash TEXT')

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
