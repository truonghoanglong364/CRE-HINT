const path = require('path')
const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { db, initDatabase } = require('./database')

const app = express()
const PORT = process.env.PORT || 3000
const JWT_SECRET = process.env.JWT_SECRET || 'cre-hint-development-secret'

app.use(cors())
app.use(express.json())

// Serve frontend build in production
const frontendPath = path.join(__dirname, '../frontend/dist')
app.use(express.static(frontendPath))

function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'Vui lòng đăng nhập lại!' })
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' })
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này.' })
    next()
  }
}

async function addNotification(userId, title, message, type = 'info') {
  await db.prepare('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)').run(userId, title, message, type)
}

async function visitDetails(visit) {
  if (!visit) return null
  const ahead = visit.queue_number
    ? (await db.prepare(`
        SELECT COUNT(*) AS count FROM visits
        WHERE visit_date = ? AND queue_number < ? AND status IN ('waiting', 'called', 'in_progress')
      `).get(visit.visit_date, visit.queue_number)).count
    : null
  return { ...visit, peopleAhead: ahead }
}

async function publicVisit(visit) {
  const result = await visitDetails(visit)
  if (!result || result.result_status === 'published') return result
  return { ...result, exam_notes: null, result_text: null, prescription: null, follow_up_at: null }
}

async function saveVisitVersion(visit, userId) {
  const nextVersion = (await db.prepare('SELECT COALESCE(MAX(version_no), 0) + 1 AS next FROM visit_versions WHERE visit_id = ?').get(visit.id)).next
  await db.prepare(`
    INSERT INTO visit_versions (visit_id, version_no, exam_notes, result_text, prescription, follow_up_at, result_status, saved_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(visit.id, nextVersion, visit.exam_notes, visit.result_text, visit.prescription, visit.follow_up_at, visit.result_status, userId)
}

// =========================
// KIỂM TRA SERVER
// =========================

app.get('/api/health', (req, res) => {
  res.json({ message: 'CRE-HINT Backend đang hoạt động!' })
})

// =========================
// ĐĂNG KÝ
// =========================

app.post('/api/register', async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body
    if (!fullName || !password || !role || (role !== 'patient' && !email)) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin!' })
    }
    if (!['patient', 'doctor', 'receptionist'].includes(role)) {
      return res.status(400).json({ message: 'Vai trò không hợp lệ!' })
    }

    const existingUser = email ? await db.prepare('SELECT * FROM users WHERE email = ?').get(email) : null
    if (existingUser) return res.status(409).json({ message: 'Email này đã được đăng ký!' })

    const hashedPassword = await bcrypt.hash(password, 10)
    const result = await db.prepare('INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)').run(fullName, email || null, hashedPassword, role)

    let patientCode = null
    if (role === 'patient') {
      const patientResult = await db.prepare('INSERT INTO patients (user_id) VALUES (?)').run(result.lastInsertRowid)
      patientCode = `BN${String(patientResult.lastInsertRowid).padStart(4, '0')}`
      await db.prepare('UPDATE patients SET patient_code = ? WHERE id = ?').run(patientCode, patientResult.lastInsertRowid)
    }

    res.status(201).json({
      message: 'Đăng ký tài khoản thành công!',
      user: { id: result.lastInsertRowid, fullName, email: email || null, role, patientCode },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Có lỗi xảy ra ở server!' })
  }
})

// =========================
// ĐĂNG NHẬP
// =========================

app.post('/api/login', async (req, res) => {
  try {
    const { identifier, email, password } = req.body
    const loginIdentifier = identifier || email
    if (!loginIdentifier || !password) return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu!' })

    const user = await db.prepare(`
      SELECT users.*, patients.patient_code
      FROM users
      LEFT JOIN patients ON patients.user_id = users.id
      WHERE (users.email = ? AND users.role != 'patient')
         OR (patients.patient_code = ? AND users.role = 'patient')
    `).get(loginIdentifier, loginIdentifier)

    if (!user) return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng!' })
    const passwordCorrect = await bcrypt.compare(password, user.password)
    if (!passwordCorrect) return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng!' })

    res.json({
      message: 'Đăng nhập thành công!',
      token: jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '12h' }),
      user: { id: user.id, fullName: user.full_name, email: user.email, patientCode: user.patient_code, role: user.role },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Có lỗi xảy ra ở server!' })
  }
})

app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.prepare('SELECT id, name, email, role, patient_code FROM users WHERE id = ?').get(req.user.id)
    if (!user) return res.status(401).json({ message: 'User not found' })
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, patient_code: user.patient_code } })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// =========================
// GHI NHẬN VÀ LẤY CHỈ SỐ
// =========================

app.post('/api/vitals', authenticateToken, allowRoles('patient'), async (req, res) => {
  try {
    const userId = req.user.id
    const measurements = {
      weight: Number(req.body.weight), systolic: Number(req.body.systolic),
      diastolic: Number(req.body.diastolic), heartRate: Number(req.body.heartRate), spo2: Number(req.body.spo2),
    }
    const symptoms = { dyspnea: Boolean(req.body.dyspnea), edema: Boolean(req.body.edema), chestPain: Boolean(req.body.chestPain) }

    if (!Number.isInteger(userId) || userId < 1 ||
        !Object.values(measurements).every(Number.isFinite) ||
        measurements.weight <= 0 || measurements.systolic <= 0 ||
        measurements.diastolic <= 0 || measurements.heartRate <= 0 ||
        measurements.spo2 < 0 || measurements.spo2 > 100) {
      return res.status(400).json({ message: 'Chỉ số gửi lên không hợp lệ!' })
    }

    const patient = await db.prepare("SELECT users.id FROM users JOIN patients ON patients.user_id = users.id WHERE users.id = ? AND users.role = 'patient'").get(userId)
    if (!patient) return res.status(404).json({ message: 'Không tìm thấy bệnh nhân!' })

    const result = await db.prepare(`
      INSERT INTO vitals (user_id, weight, systolic, diastolic, heart_rate, spo2, dyspnea, edema, chest_pain)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, measurements.weight, measurements.systolic, measurements.diastolic, measurements.heartRate, measurements.spo2,
      symptoms.dyspnea ? 1 : 0, symptoms.edema ? 1 : 0, symptoms.chestPain ? 1 : 0)

    res.status(201).json({
      message: 'Đã gửi chỉ số sức khỏe cho bác sĩ.',
      vital: { id: result.lastInsertRowid, ...measurements, ...symptoms, createdAt: new Date().toISOString() },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Không thể lưu chỉ số sức khỏe!' })
  }
})

app.get('/api/vitals', authenticateToken, async (req, res) => {
  try {
    const userId = Number(req.query.userId)
    if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: 'Mã bệnh nhân không hợp lệ!' })
    if (req.user.role === 'patient' && req.user.id !== userId) return res.status(403).json({ message: 'Bạn chỉ có thể xem chỉ số của mình.' })
    if (!['patient', 'doctor'].includes(req.user.role)) return res.status(403).json({ message: 'Bạn không có quyền xem chỉ số.' })

    const vitals = await db.prepare(`
      SELECT id, user_id AS userId, weight, systolic, diastolic, heart_rate AS heartRate, spo2,
        dyspnea, edema, chest_pain AS chestPain, created_at AS createdAt
      FROM vitals WHERE user_id = ? ORDER BY id DESC
    `).all(userId)
    res.json({ vitals })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Không thể tải lịch sử chỉ số!' })
  }
})

// =========================
// DANH SÁCH BỆNH NHÂN
// =========================

app.get('/api/patients', authenticateToken, allowRoles('doctor'), async (req, res) => {
  try {
    const patients = await db.prepare(`
      SELECT patients.id, patients.user_id AS userId, patients.patient_code AS patientCode,
        users.full_name AS fullName, users.email,
        patients.date_of_birth AS dateOfBirth, patients.gender, patients.phone, patients.address,
        latest.weight, latest.systolic, latest.diastolic, latest.heart_rate AS heartRate, latest.spo2,
        latest.dyspnea, latest.edema, latest.chest_pain AS chestPain, latest.created_at AS lastSubmittedAt
      FROM patients
      JOIN users ON patients.user_id = users.id
      LEFT JOIN vitals AS latest ON latest.id = (SELECT id FROM vitals WHERE user_id = patients.user_id ORDER BY id DESC LIMIT 1)
      ORDER BY patients.id DESC
    `).all()
    res.json({ patients })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Không thể lấy danh sách bệnh nhân!' })
  }
})

// =========================
// CẬP NHẬT HỒ SƠ BỆNH NHÂN
// =========================

app.put('/api/patients/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params
    const { dateOfBirth, gender, phone, address } = req.body
    const patient = await db.prepare('SELECT * FROM patients WHERE user_id = ?').get(userId)
    if (!patient) return res.status(404).json({ message: 'Không tìm thấy hồ sơ bệnh nhân!' })

    await db.prepare('UPDATE patients SET date_of_birth = ?, gender = ?, phone = ?, address = ? WHERE user_id = ?').run(dateOfBirth, gender, phone, address, userId)
    res.json({ message: 'Cập nhật hồ sơ thành công!' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Không thể cập nhật hồ sơ!' })
  }
})

// =========================
// LƯỢT KHÁM VÀ THÔNG BÁO
// =========================

app.post('/api/visits', authenticateToken, allowRoles('patient'), async (req, res) => {
  try {
    const { visitDate, specialty, reason, doctorId } = req.body
    if (!visitDate || !specialty || !reason) return res.status(400).json({ message: 'Vui lòng nhập ngày khám, chuyên khoa và lý do khám!' })

    const result = await db.prepare('INSERT INTO visits (patient_id, doctor_id, visit_date, specialty, reason) VALUES (?, ?, ?, ?, ?)').run(req.user.id, doctorId || null, visitDate, specialty, reason)
    await addNotification(req.user.id, 'Đăng ký khám thành công', `Yêu cầu khám ngày ${visitDate} đã được ghi nhận. Vui lòng chờ bệnh viện tiếp nhận.`, 'success')

    const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json({ visit: await visitDetails(visit) })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Không thể tạo lượt khám!' })
  }
})

app.get('/api/visits/mine', authenticateToken, allowRoles('patient'), async (req, res) => {
  const rows = await db.prepare(`
    SELECT visits.*, users.full_name AS doctor_name
    FROM visits LEFT JOIN users ON users.id = visits.doctor_id
    WHERE visits.patient_id = ? ORDER BY visits.visit_date DESC, visits.id DESC
  `).all(req.user.id)
  const visits = await Promise.all(rows.map((v) => publicVisit(v)))
  res.json({ visits })
})

app.get('/api/visits/queue', authenticateToken, allowRoles('doctor', 'receptionist'), async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10)
  const rows = await db.prepare(`
    SELECT visits.*, patients.patient_code, users.full_name AS patient_name, doctors.full_name AS doctor_name
    FROM visits
    JOIN users ON users.id = visits.patient_id
    LEFT JOIN patients ON patients.user_id = visits.patient_id
    LEFT JOIN users doctors ON doctors.id = visits.doctor_id
    WHERE visits.visit_date = ?
    ORDER BY CASE visits.status
      WHEN 'in_progress' THEN 1 WHEN 'called' THEN 2 WHEN 'waiting' THEN 3
      WHEN 'registered' THEN 4 ELSE 5 END, visits.queue_number, visits.id
  `).all(date)
  const visits = await Promise.all(rows.map((v) => visitDetails(v)))
  res.json({ visits, date })
})

app.get('/api/visits/:id/clinical-support', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const visit = await db.prepare(`
    SELECT visits.*, users.full_name AS patient_name, users.email AS patient_email, patients.patient_code
    FROM visits JOIN users ON users.id = visits.patient_id
    LEFT JOIN patients ON patients.user_id = visits.patient_id
    WHERE visits.id = ?
  `).get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
  const hospitalData = await db.prepare('SELECT * FROM hospital_data WHERE visit_id = ? ORDER BY id DESC LIMIT 1').get(visit.id)
  const aiSupport = await db.prepare('SELECT * FROM ai_support WHERE visit_id = ? ORDER BY id DESC LIMIT 1').get(visit.id)
  const versions = await db.prepare('SELECT * FROM visit_versions WHERE visit_id = ? ORDER BY version_no DESC').all(visit.id)
  res.json({ visit, hospitalData, aiSupport, versions })
})

app.post('/api/visits/:id/mock-hospital-data', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
  const payload = {
    patientId: visit.patient_id, visitId: visit.id,
    vitals: { bloodPressure: '145/90', heartRate: 96, spo2: 94, weight: 68.5 },
    medications: ['Bisoprolol 2.5 mg', 'Furosemide 40 mg'],
    note: 'Dữ liệu mẫu phục vụ trình diễn AI-CDSS',
  }
  const result = await db.prepare(`
    INSERT INTO hospital_data (visit_id, source_system, payload_json, validation_status, missing_fields, validation_errors, duplicate_check)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(visit.id, req.body.sourceSystem || 'HIS/EMR mô phỏng', JSON.stringify(payload), 'valid', 'Chưa có dữ liệu BNP/NT-proBNP', null, 'Không phát hiện bản ghi trùng')
  const hospitalData = await db.prepare('SELECT * FROM hospital_data WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json({ hospitalData })
})

app.post('/api/visits/:id/ai-support', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  const hospitalData = await db.prepare('SELECT * FROM hospital_data WHERE visit_id = ? ORDER BY id DESC LIMIT 1').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
  if (!hospitalData) return res.status(400).json({ message: 'Cần tiếp nhận dữ liệu bệnh viện trước khi chạy hỗ trợ chuyên môn.' })
  const result = await db.prepare(`
    INSERT INTO ai_support (visit_id, hospital_data_id, input_summary, missing_data, diagnosis, lab_test, treatment, med_safety)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(visit.id, hospitalData.id,
    'Sinh hiệu, thuốc đang dùng và lý do khám từ bộ dữ liệu mô phỏng',
    'Chưa có BNP/NT-proBNP; cần bổ sung nếu bác sĩ thấy phù hợp',
    'Gợi ý theo dõi suy tim sung huyết, cần bác sĩ xác nhận',
    'Cân nhắc BNP/NT-proBNP, điện giải đồ và siêu âm tim',
    'Tiếp tục theo dõi cân nặng, huyết áp; rà soát đáp ứng lợi tiểu',
    'Kiểm tra nguy cơ hạ huyết áp và rối loạn điện giải khi phối hợp thuốc')
  const aiSupport = await db.prepare('SELECT * FROM ai_support WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json({ aiSupport, simulated: true })
})

app.put('/api/visits/:id/ai-review', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const status = ['accepted', 'adjusted', 'rejected'].includes(req.body.status) ? req.body.status : null
  if (!status) return res.status(400).json({ message: 'Trạng thái phản hồi không hợp lệ!' })
  const ai = await db.prepare('SELECT * FROM ai_support WHERE visit_id = ? ORDER BY id DESC LIMIT 1').get(req.params.id)
  if (!ai) return res.status(404).json({ message: 'Chưa có kết quả hỗ trợ chuyên môn!' })
  await db.prepare('UPDATE ai_support SET review_status = ?, doctor_feedback = ?, confirmed_plan = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.body.feedback || null, req.body.confirmedPlan || null, ai.id)
  const aiSupport = await db.prepare('SELECT * FROM ai_support WHERE id = ?').get(ai.id)
  res.json({ aiSupport })
})

app.put('/api/visits/:id/draft', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
  await db.prepare("UPDATE visits SET exam_notes = ?, result_text = ?, prescription = ?, follow_up_at = ?, result_status = 'draft', result_version = result_version + 1 WHERE id = ?").run(req.body.examNotes || null, req.body.resultText || null, req.body.prescription || null, req.body.followUpAt || null, visit.id)
  const updated = await db.prepare('SELECT * FROM visits WHERE id = ?').get(visit.id)
  await saveVisitVersion(updated, req.user.id)
  res.json({ visit: updated })
})

app.post('/api/visits/:id/restore-version', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const version = await db.prepare('SELECT * FROM visit_versions WHERE id = ? AND visit_id = ?').get(req.body.versionId, req.params.id)
  if (!version) return res.status(404).json({ message: 'Không tìm thấy phiên bản backup!' })
  await db.prepare("UPDATE visits SET exam_notes = ?, result_text = ?, prescription = ?, follow_up_at = ?, result_status = 'draft', result_version = result_version + 1 WHERE id = ?").run(version.exam_notes, version.result_text, version.prescription, version.follow_up_at, req.params.id)
  const updated = await db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  await saveVisitVersion(updated, req.user.id)
  res.json({ visit: updated })
})

app.post('/api/visits/:id/publish', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
  await db.prepare("UPDATE visits SET result_status = 'published', status = 'completed', published_at = CURRENT_TIMESTAMP, completed_at = CURRENT_TIMESTAMP WHERE id = ?").run(visit.id)
  const updated = await db.prepare('SELECT * FROM visits WHERE id = ?').get(visit.id)
  await saveVisitVersion(updated, req.user.id)
  await addNotification(visit.patient_id, 'Kết quả khám đã sẵn sàng', 'Bác sĩ đã xác nhận và công bố kết quả, đơn thuốc hoặc hướng dẫn sau khám.', 'success')
  res.json({ visit: updated })
})

app.post('/api/visits/reception', authenticateToken, allowRoles('receptionist'), async (req, res) => {
  try {
    const { patientEmail, visitDate, specialty, reason } = req.body
    const patient = await db.prepare("SELECT id FROM users WHERE email = ? AND role = 'patient'").get(patientEmail)
    if (!patient) return res.status(404).json({ message: 'Không tìm thấy bệnh nhân với email này!' })
    if (!visitDate || !specialty || !reason) return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin lượt khám!' })

    const result = await db.prepare('INSERT INTO visits (patient_id, visit_date, specialty, reason, room) VALUES (?, ?, ?, ?, ?)').run(patient.id, visitDate, specialty, reason, req.body.room || null)
    await addNotification(patient.id, 'Đã tạo lượt khám trực tiếp', `Nhân viên y tế đã tạo lượt khám ngày ${visitDate}. Vui lòng đến quầy để được cấp số.`, 'info')
    const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json({ visit: await visitDetails(visit) })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Không thể tạo lượt khám trực tiếp!' })
  }
})

app.post('/api/visits/:id/check-in', authenticateToken, allowRoles('doctor', 'receptionist'), async (req, res) => {
  const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
  const nextQueue = (await db.prepare('SELECT COALESCE(MAX(queue_number), 0) + 1 AS next FROM visits WHERE visit_date = ?').get(visit.visit_date)).next
  await db.prepare("UPDATE visits SET doctor_id = ?, room = ?, queue_number = ?, status = 'waiting' WHERE id = ?").run(req.user.id, req.body.room || 'Phòng khám Tim mạch 01', nextQueue, visit.id)
  await addNotification(visit.patient_id, 'Đã tiếp nhận lượt khám', `Bạn đã được cấp số thứ tự ${nextQueue}. Vui lòng theo dõi hàng đợi.`, 'success')
  const updated = await db.prepare('SELECT * FROM visits WHERE id = ?').get(visit.id)
  res.json({ visit: await visitDetails(updated) })
})

app.post('/api/visits/:id/call', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
  await db.prepare("UPDATE visits SET status = 'called', called_at = CURRENT_TIMESTAMP WHERE id = ?").run(visit.id)
  await addNotification(visit.patient_id, 'Đến lượt khám', `Mời bệnh nhân đến ${visit.room || 'phòng khám'} để gặp bác sĩ.`, 'urgent')
  const updated = await db.prepare('SELECT * FROM visits WHERE id = ?').get(visit.id)
  res.json({ visit: await visitDetails(updated) })
})

app.post('/api/visits/:id/start', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
  await db.prepare("UPDATE visits SET status = 'in_progress', started_at = CURRENT_TIMESTAMP WHERE id = ?").run(visit.id)
  const updated = await db.prepare('SELECT * FROM visits WHERE id = ?').get(visit.id)
  res.json({ visit: await visitDetails(updated) })
})

app.post('/api/visits/:id/absent', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })
  await db.prepare("UPDATE visits SET status = 'absent' WHERE id = ?").run(visit.id)
  await addNotification(visit.patient_id, 'Lượt khám đã được cập nhật', 'Bạn chưa có mặt khi được gọi. Vui lòng liên hệ quầy tiếp nhận nếu cần khám lại.', 'warning')
  const updated = await db.prepare('SELECT * FROM visits WHERE id = ?').get(visit.id)
  res.json({ visit: await visitDetails(updated) })
})

app.put('/api/visits/:id/result', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id)
  if (!visit) return res.status(404).json({ message: 'Không tìm thấy lượt khám!' })

  const { examNotes, testInstruction, resultDueAt, resultMethod, resultText, prescription, followUpAt, status } = req.body
  const nextStatus = status === 'waiting_result' ? 'waiting_result' : 'completed'
  await db.prepare(`
    UPDATE visits SET exam_notes = ?, test_instruction = ?, result_due_at = ?, result_method = ?,
      result_text = ?, prescription = ?, follow_up_at = ?, status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(examNotes || null, testInstruction || null, resultDueAt || null, resultMethod || null,
    resultText || null, prescription || null, followUpAt || null, nextStatus, visit.id)

  await addNotification(visit.patient_id,
    nextStatus === 'waiting_result' ? 'Đã có lịch trả kết quả' : 'Kết quả khám đã sẵn sàng',
    nextStatus === 'waiting_result'
      ? `Vui lòng thực hiện theo hướng dẫn. Dự kiến trả kết quả: ${resultDueAt || 'sẽ cập nhật sau'}.`
      : 'Bạn có thể mở lượt khám để xem kết luận, đơn thuốc và hướng dẫn sau khám.',
    nextStatus === 'waiting_result' ? 'info' : 'success')

  if (followUpAt) await addNotification(visit.patient_id, 'Đã tạo lịch tái khám', `Lịch tái khám dự kiến vào ${followUpAt}.`, 'info')
  const updated = await db.prepare('SELECT * FROM visits WHERE id = ?').get(visit.id)
  res.json({ visit: await visitDetails(updated) })
})

app.get('/api/notifications', authenticateToken, async (req, res) => {
  const notifications = await db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 30').all(req.user.id)
  res.json({ notifications })
})

app.post('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  await db.prepare('UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id)
  res.json({ ok: true })
})

// =========================
// THỐNG KÊ BÁC SĨ
// =========================

app.get('/api/stats/doctor', authenticateToken, allowRoles('doctor'), async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

    const todayVisits = await db.prepare(`
      SELECT COUNT(*) AS total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status IN ('waiting', 'called', 'in_progress') THEN 1 ELSE 0 END) AS inProgress,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent
      FROM visits WHERE visit_date = ?
    `).get(today)

    const weekVisits = await db.prepare(`
      SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
      FROM visits WHERE visit_date >= ?
    `).get(weekAgo)

    const monthVisits = await db.prepare(`
      SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
      FROM visits WHERE visit_date >= ?
    `).get(monthAgo)

    const followUpCompliance = await db.prepare(`
      SELECT COUNT(*) AS totalWithFollowUp,
        SUM(CASE WHEN EXISTS (
          SELECT 1 FROM visits v2 WHERE v2.patient_id = v.patient_id AND v2.visit_date >= v.follow_up_at AND v2.id != v.id
        ) THEN 1 ELSE 0 END) AS returned
      FROM visits v
      WHERE v.follow_up_at IS NOT NULL AND v.follow_up_at <= ? AND v.status = 'completed'
    `).get(today)

    const allPatients = (await db.prepare('SELECT COUNT(*) AS count FROM patients').get()).count
    const patientsWithVitals = (await db.prepare('SELECT COUNT(DISTINCT user_id) AS count FROM vitals').get()).count
    const abnormalPatients = (await db.prepare(`
      SELECT COUNT(*) AS count FROM (
        SELECT user_id FROM vitals v
        WHERE v.id = (SELECT MAX(id) FROM vitals WHERE user_id = v.user_id)
          AND (v.weight >= 68.8 OR v.systolic >= 160 OR v.heart_rate >= 100 OR v.spo2 <= 93
               OR v.dyspnea = 1 OR v.edema = 1 OR v.chest_pain = 1)
      )
    `).get()).count

    const dailyBreakdown = await db.prepare(`
      SELECT visit_date AS date, COUNT(*) AS total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
      FROM visits WHERE visit_date >= ? GROUP BY visit_date ORDER BY visit_date
    `).all(weekAgo)

    res.json({
      today: todayVisits, week: weekVisits, month: monthVisits,
      followUp: followUpCompliance,
      patients: { total: allPatients, withVitals: patientsWithVitals, abnormal: abnormalPatients },
      dailyBreakdown,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Không thể tải thống kê!' })
  }
})

// =========================
// TEMPLATE KẾT QUẢ KHÁM
// =========================

app.get('/api/templates', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const templates = await db.prepare('SELECT * FROM result_templates ORDER BY usage_count DESC, id').all()
  res.json({ templates })
})

app.post('/api/templates', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const { name, examNotes, resultText, prescription } = req.body
  if (!name) return res.status(400).json({ message: 'Tên mẫu không được để trống!' })
  const result = await db.prepare('INSERT INTO result_templates (name, exam_notes, result_text, prescription, created_by) VALUES (?, ?, ?, ?, ?)').run(name, examNotes || null, resultText || null, prescription || null, req.user.id)
  const template = await db.prepare('SELECT * FROM result_templates WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json({ template })
})

app.put('/api/templates/:id', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const { name, examNotes, resultText, prescription } = req.body
  await db.prepare('UPDATE result_templates SET name = ?, exam_notes = ?, result_text = ?, prescription = ? WHERE id = ?').run(name, examNotes || null, resultText || null, prescription || null, req.params.id)
  const template = await db.prepare('SELECT * FROM result_templates WHERE id = ?').get(req.params.id)
  res.json({ template })
})

app.delete('/api/templates/:id', authenticateToken, allowRoles('doctor'), async (req, res) => {
  await db.prepare('DELETE FROM result_templates WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

app.post('/api/templates/:id/use', authenticateToken, allowRoles('doctor'), async (req, res) => {
  await db.prepare('UPDATE result_templates SET usage_count = usage_count + 1 WHERE id = ?').run(req.params.id)
  const template = await db.prepare('SELECT * FROM result_templates WHERE id = ?').get(req.params.id)
  res.json({ template })
})

// =========================
// XUẤT BỆNH ÁN
// =========================

app.get('/api/patients/:userId/export', authenticateToken, allowRoles('doctor'), async (req, res) => {
  const patient = await db.prepare(`
    SELECT patients.*, users.full_name, users.email
    FROM patients JOIN users ON patients.user_id = users.id WHERE patients.user_id = ?
  `).get(req.params.userId)
  if (!patient) return res.status(404).json({ message: 'Không tìm thấy bệnh nhân!' })

  const vitals = await db.prepare('SELECT * FROM vitals WHERE user_id = ? ORDER BY id DESC LIMIT 20').all(req.params.userId)
  const visits = await db.prepare(`
    SELECT visits.*, doctors.full_name AS doctor_name
    FROM visits LEFT JOIN users doctors ON doctors.id = visits.doctor_id
    WHERE visits.patient_id = ? ORDER BY visits.visit_date DESC
  `).all(req.params.userId)

  res.json({
    patient: {
      fullName: patient.full_name, email: patient.email, patientCode: patient.patient_code,
      dateOfBirth: patient.date_of_birth, gender: patient.gender, phone: patient.phone, address: patient.address,
    },
    vitals: vitals.map((v) => ({
      weight: v.weight, systolic: v.systolic, diastolic: v.diastolic,
      heartRate: v.heart_rate, spo2: v.spo2,
      dyspnea: Boolean(v.dyspnea), edema: Boolean(v.edema), chestPain: Boolean(v.chest_pain),
      createdAt: v.created_at,
    })),
    visits: visits.map((v) => ({
      visitDate: v.visit_date, specialty: v.specialty, reason: v.reason,
      status: v.status, examNotes: v.exam_notes, resultText: v.result_text,
      prescription: v.prescription, followUpAt: v.follow_up_at,
      doctorName: v.doctor_name, completedAt: v.completed_at,
    })),
  })
})

// SPA fallback — must be after all API routes
app.use((req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'))
})

// =========================
// KHỞI ĐỘNG
// =========================

async function start() {
  await initDatabase()

  // Demo receptionist account
  const receptionDemo = await db.prepare('SELECT id FROM users WHERE email = ?').get('reception@demo.vn')
  if (!receptionDemo) {
    const password = bcrypt.hashSync('123456', 10)
    await db.prepare('INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)').run('Nhân viên y tế', 'reception@demo.vn', password, 'receptionist')
  } else {
    await db.prepare('UPDATE users SET full_name = ? WHERE email = ?').run('Nhân viên y tế', 'reception@demo.vn')
  }

  app.listen(PORT, () => {
    console.log(`CRE-HINT Backend đang chạy tại http://localhost:${PORT}`)
  })
}

start().catch((error) => {
  console.error('Không thể khởi động server:', error)
  process.exit(1)
})
