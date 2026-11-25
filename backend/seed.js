/**
 * Seed dữ liệu demo cho CRE-HINT.
 * Chạy: node seed.js  (từ thư mục backend/)
 *
 * Script sẽ xóa dữ liệu demo cũ và nạp lại:
 * - Bác sĩ, nhân viên lễ tân, nhiều bệnh nhân (BN0001..)
 * - Hàng đợi khám hôm nay với nhiều trạng thái
 * - Một lượt khám có đầy đủ dữ liệu HIS/EMR + AI-CDSS + phiên bản backup
 * - Một lượt đã công bố kết quả cho bệnh nhân BN0001
 * - Chỉ số sinh hiệu, thông báo
 */

const bcrypt = require('bcryptjs')
const { db, initDatabase } = require('./database')

const today = new Date().toISOString().slice(0, 10)
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
const inThreeDays = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
const inAWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

const password = bcrypt.hashSync('123456', 10)

async function upsertUser({ fullName, email, role }) {
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    await db.prepare('UPDATE users SET full_name = ?, password = ?, role = ? WHERE id = ?').run(fullName, password, role, existing.id)
    return existing.id
  }
  const result = await db.prepare('INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)').run(fullName, email, password, role)
  return result.lastInsertRowid
}

async function upsertPatient({ fullName, email, dateOfBirth, gender, phone, address }) {
  const userId = await upsertUser({ fullName, email, role: 'patient' })
  let patient = await db.prepare('SELECT * FROM patients WHERE user_id = ?').get(userId)
  if (!patient) {
    const result = await db.prepare('INSERT INTO patients (user_id) VALUES (?)').run(userId)
    patient = await db.prepare('SELECT * FROM patients WHERE id = ?').get(result.lastInsertRowid)
  }
  const code = `BN${String(patient.id).padStart(4, '0')}`
  await db.prepare('UPDATE patients SET patient_code = ?, date_of_birth = ?, gender = ?, phone = ?, address = ? WHERE id = ?')
    .run(code, dateOfBirth, gender, phone, address, patient.id)
  return { userId, patientId: patient.id, patientCode: code, fullName }
}

async function clearDemoData() {
  // Wipe everything except reference tables
  await db.prepare('DELETE FROM visit_versions').run()
  await db.prepare('DELETE FROM ai_block_reviews').run()
  await db.prepare('DELETE FROM ai_support').run()
  await db.prepare('DELETE FROM hospital_data').run()
  await db.prepare('DELETE FROM lab_orders').run()
  await db.prepare('DELETE FROM visits').run()
  await db.prepare('DELETE FROM notifications').run()
  await db.prepare('DELETE FROM vitals').run()
  await db.prepare('DELETE FROM doctor_schedules').run()
  await db.prepare('DELETE FROM schedule_overrides').run()
  await db.prepare("UPDATE result_templates SET usage_count = 0").run()
}

async function seed() {
  console.log('Khởi tạo lược đồ cơ sở dữ liệu...')
  await initDatabase()

  console.log('Xóa dữ liệu demo cũ...')
  await clearDemoData()

  console.log('Tạo tài khoản bác sĩ và lễ tân...')
  const doctorId = await upsertUser({ fullName: 'Nguyễn Minh Tuấn', email: 'doctor@demo.vn', role: 'doctor' })
  const receptionistId = await upsertUser({ fullName: 'Nhân viên y tế', email: 'reception@demo.vn', role: 'receptionist' })

  console.log('Tạo hồ sơ bệnh nhân...')
  const p1 = await upsertPatient({ fullName: 'Nguyễn Văn An', email: 'an.nguyen@demo.vn', dateOfBirth: '1958-03-12', gender: 'Nam', phone: '0912 345 678', address: 'Số 12, Cầu Giấy, Hà Nội' })
  const p2 = await upsertPatient({ fullName: 'Trần Thị Lan', email: 'lan.tran@demo.vn', dateOfBirth: '1962-08-04', gender: 'Nữ', phone: '0934 112 334', address: 'Số 48, Đống Đa, Hà Nội' })
  const p3 = await upsertPatient({ fullName: 'Lê Văn Hùng', email: 'hung.le@demo.vn', dateOfBirth: '1955-11-23', gender: 'Nam', phone: '0987 654 321', address: 'Số 7, Hai Bà Trưng, Hà Nội' })
  const p4 = await upsertPatient({ fullName: 'Phạm Thị Mai', email: 'mai.pham@demo.vn', dateOfBirth: '1970-05-17', gender: 'Nữ', phone: '0909 221 445', address: 'Số 23, Thanh Xuân, Hà Nội' })
  const p5 = await upsertPatient({ fullName: 'Hoàng Quốc Bảo', email: 'bao.hoang@demo.vn', dateOfBirth: '1948-01-30', gender: 'Nam', phone: '0978 554 332', address: 'Số 9, Ba Đình, Hà Nội' })
  const p6 = await upsertPatient({ fullName: 'Vũ Thị Hoa', email: 'hoa.vu@demo.vn', dateOfBirth: '1965-09-02', gender: 'Nữ', phone: '0966 778 990', address: 'Số 34, Long Biên, Hà Nội' })
  const p7 = await upsertPatient({ fullName: 'Đỗ Minh Khôi', email: 'khoi.do@demo.vn', dateOfBirth: '1975-12-15', gender: 'Nam', phone: '0922 333 444', address: 'Số 5, Tây Hồ, Hà Nội' })
  const p8 = await upsertPatient({ fullName: 'Bùi Thanh Hà', email: 'ha.bui@demo.vn', dateOfBirth: '1960-04-07', gender: 'Nữ', phone: '0919 282 737', address: 'Số 18, Hoàn Kiếm, Hà Nội' })

  // No visits or vitals: used to walk through the full flow from booking.
  const p9 = await upsertPatient({ fullName: 'Ngô Thị Thu', email: 'thu.ngo@demo.vn', dateOfBirth: '1968-06-21', gender: 'Nữ', phone: '0915 667 889', address: 'Số 61, Hoàng Mai, Hà Nội' })

  const patients = [p1, p2, p3, p4, p5, p6, p7, p8, p9]
  console.log(`Đã tạo ${patients.length} bệnh nhân. BN0001 = ${p1.fullName}.`)

  console.log('Nạp chỉ số sinh hiệu cho bệnh nhân BN0001 (và một số bệnh nhân khác)...')
  const vitalsHistory = [
    { user: p1.userId, days: 10, weight: 67.2, systolic: 138, diastolic: 82, heart_rate: 84, spo2: 96, dyspnea: 0, edema: 0, chest_pain: 0 },
    { user: p1.userId, days: 7,  weight: 67.5, systolic: 142, diastolic: 85, heart_rate: 88, spo2: 95, dyspnea: 0, edema: 0, chest_pain: 0 },
    { user: p1.userId, days: 4,  weight: 68.1, systolic: 148, diastolic: 88, heart_rate: 94, spo2: 94, dyspnea: 1, edema: 0, chest_pain: 0 },
    { user: p1.userId, days: 2,  weight: 68.6, systolic: 152, diastolic: 90, heart_rate: 96, spo2: 94, dyspnea: 1, edema: 1, chest_pain: 0 },
    { user: p2.userId, days: 14, weight: 55.2, systolic: 136, diastolic: 82, heart_rate: 84, spo2: 96, dyspnea: 0, edema: 0, chest_pain: 0 },
    { user: p4.userId, days: 30, weight: 60.5, systolic: 142, diastolic: 88, heart_rate: 80, spo2: 98, dyspnea: 0, edema: 0, chest_pain: 0 },
  ]
  for (const v of vitalsHistory) {
    const createdAt = new Date(Date.now() - v.days * 86400000).toISOString()
    await db.prepare(`
      INSERT INTO vitals (user_id, weight, systolic, diastolic, heart_rate, spo2, dyspnea, edema, chest_pain, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(v.user, v.weight, v.systolic, v.diastolic, v.heart_rate, v.spo2, v.dyspnea, v.edema, v.chest_pain, createdAt)
  }

  console.log('Tạo lịch làm việc hàng tuần cho bác sĩ...')
  for (const dow of [1, 2, 3, 4, 5]) {
    await db.prepare('INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, max_patients) VALUES (?, ?, ?, ?, ?)')
      .run(doctorId, dow, '08:00', '11:30', 20)
  }
  await db.prepare('INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, max_patients) VALUES (?, ?, ?, ?, ?)')
    .run(doctorId, 6, '08:00', '10:30', 15)

  console.log('Tạo hàng đợi khám hôm nay...')
  const todayVisits = [
    { patient: p1, status: 'in_progress', queue: 1, room: 'Phòng khám Tim mạch 01', reason: 'Khó thở khi gắng sức, phù chi dưới tăng', priority: 'urgent',
      vital: { weight: 68.9, systolic: 158, diastolic: 92, heart_rate: 98, spo2: 93, dyspnea: 1, edema: 1, chest_pain: 0 } },
    { patient: p2, status: 'called',      queue: 2, room: 'Phòng khám Tim mạch 01', reason: 'Tái khám định kỳ sau điều trị suy tim', priority: 'normal',
      vital: { weight: 54.8, systolic: 132, diastolic: 80, heart_rate: 82, spo2: 97, dyspnea: 0, edema: 0, chest_pain: 0 } },
    { patient: p3, status: 'waiting',     queue: 3, room: 'Phòng khám Tim mạch 01', reason: 'Đau ngực trái, hồi hộp đánh trống ngực', priority: 'emergency',
      vital: { weight: 72.4, systolic: 170, diastolic: 96, heart_rate: 102, spo2: 92, dyspnea: 1, edema: 1, chest_pain: 1 } },
    { patient: p4, status: 'waiting',     queue: 4, room: 'Phòng khám Tim mạch 01', reason: 'Khám định kỳ tăng huyết áp', priority: 'normal',
      vital: { weight: 60.1, systolic: 148, diastolic: 90, heart_rate: 86, spo2: 97, dyspnea: 0, edema: 0, chest_pain: 0 } },
    { patient: p5, status: 'waiting',     queue: 5, room: 'Phòng khám Tim mạch 01', reason: 'Tái khám suy tim NYHA III, điều chỉnh thuốc', priority: 'urgent',
      vital: { weight: 65.3, systolic: 155, diastolic: 92, heart_rate: 95, spo2: 94, dyspnea: 1, edema: 0, chest_pain: 0 } },
    { patient: p6, status: 'registered',  queue: null, room: null, reason: 'Khám tổng quát tim mạch, mệt mỏi kéo dài', priority: 'normal' },
    { patient: p7, status: 'registered',  queue: null, room: null, reason: 'Khó thở về đêm, nghi suy tim trái', priority: 'normal' },
    { patient: p8, status: 'completed',   queue: 6, room: 'Phòng khám Tim mạch 01', reason: 'Khám sau xuất viện 2 tuần', priority: 'normal',
      exam_notes: 'BN tỉnh, tiếp xúc tốt. Tiếng tim T1, T2 rõ. Rale ẩm 2 đáy phổi giảm so với lần trước.',
      result_text: 'Suy tim NYHA II ổn định. Chức năng tâm thu cải thiện so với đợt xuất viện.',
      prescription: '1. Bisoprolol 2.5 mg - 1 viên/ngày (sáng)\n2. Furosemide 40 mg - 1 viên/ngày (sáng)\n3. Spironolactone 25 mg - 1 viên/ngày\n4. Hạn chế muối <2g/ngày, theo dõi cân nặng hàng sáng',
      follow_up_at: inAWeek + 'T08:30',
      result_status: 'published',
      vital: { weight: 58.4, systolic: 128, diastolic: 78, heart_rate: 76, spo2: 97, dyspnea: 0, edema: 0, chest_pain: 0 }
    },
  ]

  const visitIds = {}
  for (const v of todayVisits) {
    const result = await db.prepare(`
      INSERT INTO visits (
        patient_id, doctor_id, visit_date, specialty, reason, room, queue_number, status, priority,
        exam_notes, result_text, prescription, follow_up_at, result_status, published_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      v.patient.userId, doctorId, today, 'Tim mạch', v.reason, v.room, v.queue,
      v.status, v.priority,
      v.exam_notes || null, v.result_text || null, v.prescription || null, v.follow_up_at || null,
      v.result_status || 'draft',
      v.result_status === 'published' ? new Date().toISOString() : null,
      v.status === 'completed' ? new Date().toISOString() : null,
    )
    const visitId = result.lastInsertRowid
    visitIds[v.patient.patientCode] = visitId

    // Attach vitals measured by receptionist at check-in
    if (v.vital) {
      await db.prepare(`
        INSERT INTO vitals (user_id, visit_id, recorded_by, weight, systolic, diastolic, heart_rate, spo2, dyspnea, edema, chest_pain, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(v.patient.userId, visitId, receptionistId,
        v.vital.weight, v.vital.systolic, v.vital.diastolic, v.vital.heart_rate, v.vital.spo2,
        v.vital.dyspnea, v.vital.edema, v.vital.chest_pain)
    }
  }

  console.log('Tạo lịch tái khám sắp tới...')
  const upcoming = [
    { patient: p2, date: tomorrow,     reason: 'Tái khám định kỳ sau đợt cấp suy tim' },
    { patient: p1, date: inThreeDays,  reason: 'Khám Tim mạch định kỳ & Siêu âm tim EF' },
    { patient: p3, date: inAWeek,      reason: 'Tái khám suy tim NYHA III, siêu âm tim lại' },
    { patient: p4, date: inAWeek,      reason: 'Khám định kỳ, điều chỉnh thuốc huyết áp' },
  ]
  for (const u of upcoming) {
    await db.prepare(`
      INSERT INTO visits (patient_id, doctor_id, visit_date, specialty, reason, status, priority, result_status)
      VALUES (?, ?, ?, ?, ?, 'registered', 'normal', 'draft')
    `).run(u.patient.userId, doctorId, u.date, 'Tim mạch', u.reason)
  }

  console.log('Nạp dữ liệu HIS/EMR và kết quả AI-CDSS cho lượt khám trọng tâm (BN0001)...')
  const focusVisitId = visitIds[p1.patientCode]
  const hospitalPayload = {
    patientId: p1.userId, visitId: focusVisitId,
    vitals: { bloodPressure: '158/92', heartRate: 98, spo2: 93, weight: 68.9, temp: 36.7 },
    labs: { creatinine: 1.2, potassium: 4.4, sodium: 138, egfr: 62, hemoglobin: 13.1 },
    imaging: { echo: 'EF 42%, LVH nhẹ, hở van hai lá 2/4' },
    medications: ['Bisoprolol 2.5 mg', 'Furosemide 40 mg', 'Enalapril 5 mg'],
    note: 'Dữ liệu đồng bộ từ hệ thống HIS/EMR Viện Tim Mạch - demo mô phỏng'
  }
  const hdResult = await db.prepare(`
    INSERT INTO hospital_data (visit_id, source_system, payload_json, validation_status, missing_fields, validation_errors, duplicate_check)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(focusVisitId, 'HIS/EMR Viện Tim Mạch', JSON.stringify(hospitalPayload),
    'valid', 'BNP/NT-proBNP (chưa có)', null, 'Không phát hiện bản ghi trùng')

  const aiDiagnosis = 'Suy tim mạn mất bù cấp (NYHA III) do bệnh tim thiếu máu cục bộ, EF giảm (HFrEF 42%). Chẩn đoán phân biệt: suy tim do tăng huyết áp.'
  const aiResult = await db.prepare(`
    INSERT INTO ai_support (visit_id, hospital_data_id, input_summary, missing_data, diagnosis, lab_test, treatment, med_safety, review_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `).run(
    focusVisitId, hdResult.lastInsertRowid,
    'HA 158/92, HR 98, SpO2 93%, EF 42%, khó thở tăng, phù chi dưới. Đang dùng Bisoprolol + Furosemide + Enalapril.',
    'Chưa có BNP/NT-proBNP và điện giải đồ cập nhật trong 7 ngày.',
    aiDiagnosis,
    'Đề nghị bổ sung: BNP hoặc NT-proBNP, điện giải đồ (K/Na), chức năng thận (creatinine, eGFR), siêu âm tim có đo EF, X-quang phổi để đánh giá sung huyết.',
    'Tăng Furosemide 40 → 80 mg/ngày trong 3-5 ngày, giữ Bisoprolol 2.5 mg, cân nhắc chuyển Enalapril sang Sacubitril/Valsartan khi ổn định. Hạn chế dịch 1.5L/ngày, muối <2g/ngày. Theo dõi cân nặng, HA, mạch 2 lần/ngày.',
    'Lưu ý: Enalapril + Spironolactone tiềm ẩn tăng Kali máu - cần theo dõi điện giải mỗi 3-5 ngày. Furosemide liều cao có thể gây hạ Kali - bổ sung Kali nếu cần.'
  )

  // Demo mix: diagnosis accepted, treatment edited by the doctor, lab & med-safety still pending.
  const aiId = aiResult.lastInsertRowid
  await db.prepare(`
    INSERT INTO ai_block_reviews (ai_support_id, block, decision, final_text, reviewed_by) VALUES (?, 'diagnosis', 'accepted', ?, ?)
  `).run(aiId, aiDiagnosis, doctorId)
  await db.prepare(`
    INSERT INTO ai_block_reviews (ai_support_id, block, decision, final_text, reviewed_by) VALUES (?, 'treatment', 'edited', ?, ?)
  `).run(aiId,
    'Tăng Furosemide 40 → 80 mg/ngày trong 5 ngày, giữ Bisoprolol 2.5 mg, tiếp tục Enalapril 5 mg (tạm hoãn chuyển Sacubitril/Valsartan vì HA chưa ổn định, đánh giá lại sau 1 tuần). Hạn chế dịch 1.5L/ngày, muối <2g/ngày. Theo dõi cân nặng, HA, mạch 2 lần/ngày.',
    doctorId)

  console.log('Tạo các phiên bản backup của lượt khám BN0001...')
  const versions = [
    { v: 1, exam: 'BN tỉnh, tiếp xúc tốt. Tiếng tim T1, T2 đều. Phù mắt cá chân 2 bên.', result: 'Đang theo dõi.', prescription: '', status: 'draft', hours: -4 },
    { v: 2, exam: 'BN tỉnh, tiếp xúc tốt. Tiếng tim T1 mờ, T2 đều. Rale ẩm 2 đáy phổi. Phù chi dưới 2+.', result: 'Suy tim NYHA III, nghi mất bù cấp.', prescription: '1. Furosemide 80 mg\n2. Bisoprolol 2.5 mg', status: 'draft', hours: -2 },
    { v: 3, exam: 'BN tỉnh, tiếp xúc tốt. HA 158/92. Rale ẩm 2 đáy giảm sau lợi tiểu. Phù chi dưới 2+.', result: 'Suy tim mạn mất bù cấp (NYHA III) do BTTMCB, EF 42%.', prescription: '1. Furosemide 80 mg/ngày × 5 ngày\n2. Bisoprolol 2.5 mg/ngày\n3. Enalapril 5 mg/ngày\n4. Hạn chế muối <2g/ngày, dịch 1.5L/ngày', status: 'draft', hours: -1 },
  ]
  for (const ver of versions) {
    const createdAt = new Date(Date.now() + ver.hours * 3600000).toISOString()
    await db.prepare(`
      INSERT INTO visit_versions (visit_id, version_no, exam_notes, result_text, prescription, follow_up_at, result_status, saved_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(focusVisitId, ver.v, ver.exam, ver.result, ver.prescription, inAWeek + 'T08:30', ver.status, doctorId, createdAt)
  }
  // Update current visit with latest draft content
  await db.prepare(`
    UPDATE visits SET exam_notes = ?, result_text = ?, prescription = ?, follow_up_at = ?, icd_code = ?, icd_description = ?, result_version = 3 WHERE id = ?
  `).run(
    versions[2].exam, versions[2].result, versions[2].prescription, inAWeek + 'T08:30',
    'I50.23', 'Suy tim tâm thu cấp trên nền mạn', focusVisitId
  )

  console.log('Tạo chỉ định xét nghiệm cho lượt khám BN0001...')
  const labs = [
    { name: 'BNP / NT-proBNP huyết thanh', code: 'BNP', urgency: 'urgent', status: 'in_progress', notes: 'Đánh giá mức độ suy tim' },
    { name: 'Điện giải đồ (Na, K, Cl)', code: 'ELE', urgency: 'routine', status: 'completed', result_text: 'Na 138 mmol/L (bình thường), K 4.4 mmol/L (bình thường), Cl 102 mmol/L', notes: 'Theo dõi trước điều chỉnh lợi tiểu' },
    { name: 'Siêu âm tim qua thành ngực', code: 'ECHO', urgency: 'routine', status: 'ordered', notes: 'Đo lại EF, đánh giá hở van hai lá' },
    { name: 'X-quang phổi thẳng', code: 'CXR', urgency: 'routine', status: 'completed', result_text: 'Bóng tim to, chỉ số tim-ngực 0.56. Sung huyết phổi mức độ nhẹ.', notes: '' },
  ]
  for (const l of labs) {
    await db.prepare(`
      INSERT INTO lab_orders (visit_id, test_name, test_code, urgency, status, result_text, notes, ordered_by, ordered_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
    `).run(focusVisitId, l.name, l.code, l.urgency, l.status, l.result_text || null, l.notes || null, doctorId,
      l.status === 'completed' ? new Date().toISOString() : null)
  }

  console.log('Tạo thông báo cho bệnh nhân BN0001...')
  const notifications = [
    { title: 'Đến lượt khám', message: 'Mời bạn đến Phòng khám Tim mạch 01 để gặp BS. Nguyễn Minh Tuấn.', type: 'urgent', hours: -1 },
    { title: 'Kết quả xét nghiệm đã có', message: 'Kết quả điện giải đồ và X-quang phổi đã được cập nhật vào hồ sơ khám.', type: 'info', hours: -2 },
    { title: 'Nhắc lịch tái khám', message: `Lịch tái khám dự kiến vào ${inAWeek}. Vui lòng theo dõi cân nặng và huyết áp hàng ngày.`, type: 'info', hours: -24 },
    { title: 'Chỉ số sinh hiệu bất thường', message: 'Chỉ số huyết áp và cân nặng của bạn đang có xu hướng tăng. Hãy liên hệ bác sĩ nếu có khó thở nhiều hơn.', type: 'warning', hours: -48 },
  ]
  for (const n of notifications) {
    const createdAt = new Date(Date.now() + n.hours * 3600000).toISOString()
    await db.prepare('INSERT INTO notifications (user_id, title, message, type, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(p1.userId, n.title, n.message, n.type, createdAt)
  }

  console.log('Thêm các lượt khám hoàn tất trong quá khứ (dùng cho lịch sử & kết quả bệnh nhân BN0001)...')
  const pastVisits = [
    { patient: p1, date: yesterday, reason: 'Khám cấp cứu vì khó thở',
      exam_notes: 'Khó thở khi gắng sức nhẹ. Rale ẩm 2 đáy phổi. Phù chi dưới 2+.',
      result_text: 'Suy tim mạn đợt cấp. Đã xử trí lợi tiểu tại khoa cấp cứu, triệu chứng cải thiện.',
      prescription: '1. Furosemide 40 mg - 2 viên/ngày × 3 ngày\n2. Bisoprolol 2.5 mg - 1 viên/ngày\n3. Theo dõi sát tại nhà, nhập viện nếu khó thở tăng',
      follow_up_at: today + 'T08:00' },
    { patient: p1, date: new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10),
      reason: 'Khám định kỳ suy tim',
      exam_notes: 'BN tiếp xúc tốt, không khó thở lúc nghỉ. HA 135/82.',
      result_text: 'Suy tim NYHA II ổn định với phác đồ hiện tại.',
      prescription: '1. Bisoprolol 2.5 mg/ngày\n2. Furosemide 40 mg/ngày',
      follow_up_at: yesterday + 'T08:00' },
  ]
  for (const pv of pastVisits) {
    await db.prepare(`
      INSERT INTO visits (patient_id, doctor_id, visit_date, specialty, reason, room, queue_number, status, priority,
        exam_notes, result_text, prescription, follow_up_at, result_status, published_at, completed_at)
      VALUES (?, ?, ?, 'Tim mạch', ?, 'Phòng khám Tim mạch 01', ?, 'completed', 'normal', ?, ?, ?, ?, 'published', ?, ?)
    `).run(pv.patient.userId, doctorId, pv.date, pv.reason,
      Math.floor(Math.random() * 10) + 1,
      pv.exam_notes, pv.result_text, pv.prescription, pv.follow_up_at,
      new Date(pv.date).toISOString(), new Date(pv.date).toISOString())
  }

  // Increase template usage counts so they look "used"
  const templates = await db.prepare('SELECT id FROM result_templates').all()
  for (let i = 0; i < templates.length; i++) {
    await db.prepare('UPDATE result_templates SET usage_count = ? WHERE id = ?').run(12 - i * 3, templates[i].id)
  }

  console.log('')
  console.log('==== HOÀN TẤT NẠP DỮ LIỆU DEMO ====')
  console.log('Tài khoản đăng nhập (mật khẩu: 123456):')
  console.log('  - Bệnh nhân:  BN0001 (Nguyễn Văn An)')
  console.log(`  - Demo từ đầu: ${p9.patientCode} (${p9.fullName}) - chưa có lượt khám`)
  console.log('  - Bác sĩ:     doctor@demo.vn (BS. Nguyễn Minh Tuấn)')
  console.log('  - Lễ tân:     reception@demo.vn (Nhân viên y tế)')
  console.log('')
  console.log(`Hàng đợi ngày ${today}: ${todayVisits.length} lượt (bao gồm cấp cứu, ưu tiên, bình thường).`)
  console.log('Lượt khám trọng tâm có đầy đủ HIS/EMR + AI-CDSS + 3 phiên bản backup: BN0001')
}

seed().then(() => {
  console.log('Seed thành công.')
  process.exit(0)
}).catch((err) => {
  console.error('Lỗi khi nạp dữ liệu:', err)
  process.exit(1)
})
